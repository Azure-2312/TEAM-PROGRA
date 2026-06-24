import os
import io
import random
import string
import smtplib
import threading
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import cloudinary
import cloudinary.uploader
import numpy as np
from PIL import Image
from sqlalchemy import func, Date, cast

from models import db, Usuario, Clasificacion, Analisis, CodigoRecuperacion

load_dotenv()

app = Flask(__name__)
CORS(app)

# Base de datos
database_url = os.getenv("DATABASE_URL")

if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

# Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# =========================
# MODELOS BAJO DEMANDA
# =========================

yolo_model = None
keras_model = None
bd_inicializada = False

KERAS_CLASES = ["Fito", "Monilia", "Sana"]

KERAS_MAPPING = {
    "Fito": "cacao_mazorca_negra",
    "Monilia": "cacao_moniliasis",
    "Sana": "cacao_sano"
}

RECOMENDACIONES = {
    "cacao_barrenador": "Se recomienda revisar la mazorca afectada y separar los frutos con signos de perforación o daño interno.",
    "cacao_mazorca_negra": "Se recomienda retirar las mazorcas afectadas y evitar el contacto con frutos sanos para reducir la propagación.",
    "cacao_mirido": "Se recomienda inspeccionar la planta y controlar la presencia de insectos que puedan dañar la superficie del cacao.",
    "cacao_moniliasis": "Se recomienda eliminar frutos infectados y mejorar la ventilación del cultivo para disminuir la humedad.",
    "cacao_sano": "Producto apto visualmente. El cacao se encuentra en buen estado."
}


def reparar_modelo_h5(ruta_modelo):
    import h5py
    import json

    with h5py.File(ruta_modelo, "r+") as f:
        config = f.attrs.get("model_config")

        if config is None:
            return

        if isinstance(config, bytes):
            config = config.decode("utf-8")

        config_json = json.loads(config)

        def limpiar_quantization(obj):
            if isinstance(obj, dict):
                obj.pop("quantization_config", None)
                for valor in obj.values():
                    limpiar_quantization(valor)
            elif isinstance(obj, list):
                for item in obj:
                    limpiar_quantization(item)

        limpiar_quantization(config_json)
        f.attrs.modify("model_config", json.dumps(config_json))


def get_yolo_model():
    global yolo_model

    if yolo_model is None:
        from ultralytics import YOLO
        yolo_model = YOLO("best.pt")

    return yolo_model


def get_keras_model():
    global keras_model

    if keras_model is None:
        import tensorflow as tf

        modelo_keras_path = "efficientnet_cacao_v2.h5"
        reparar_modelo_h5(modelo_keras_path)

        keras_model = tf.keras.models.load_model(
            modelo_keras_path,
            compile=False
        )

    return keras_model


def preprocesar_imagen_keras(imagen_pil):
    import tensorflow as tf

    imagen = imagen_pil.resize((224, 224))
    arr = np.array(imagen, dtype=np.float32)
    arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    arr = np.expand_dims(arr, axis=0)
    return arr


def inicializar_bd():
    db.create_all()

    if Clasificacion.query.first() is None:
        clases = [
            Clasificacion(codigo="cacao_barrenador", nombre="Cacao con barrenador", recomendacion=RECOMENDACIONES["cacao_barrenador"]),
            Clasificacion(codigo="cacao_mazorca_negra", nombre="Cacao con mazorca negra", recomendacion=RECOMENDACIONES["cacao_mazorca_negra"]),
            Clasificacion(codigo="cacao_mirido", nombre="Cacao con mírido", recomendacion=RECOMENDACIONES["cacao_mirido"]),
            Clasificacion(codigo="cacao_moniliasis", nombre="Cacao con moniliasis", recomendacion=RECOMENDACIONES["cacao_moniliasis"]),
            Clasificacion(codigo="cacao_sano", nombre="Cacao sano", recomendacion=RECOMENDACIONES["cacao_sano"]),
        ]
        db.session.bulk_save_objects(clases)

        if Usuario.query.first() is None:
            demo_user = Usuario(
                nombre_completo="Piero Montalvo",
                correo="pieromontalvof@gmail.com",
                username="Piermont",
                password=generate_password_hash("123456"),
                foto_perfil_url=""
            )
            db.session.add(demo_user)

        db.session.commit()
        print("Base de datos inicializada y sembrada con éxito.")


@app.before_request
def inicializar_una_vez():
    global bd_inicializada

    if not bd_inicializada:
        inicializar_bd()
        bd_inicializada = True


def generar_nombre_analisis(usuario_id):
    hoy = datetime.now()
    fecha_hoy = hoy.date()

    total = Analisis.query.filter(
        Analisis.usuario_id == int(usuario_id),
        cast(Analisis.fecha, Date) == fecha_hoy
    ).count()

    return f"cacao_{hoy.strftime('%Y_%m_%d')}_{total + 1}"


@app.route("/")
def home():
    return jsonify({"mensaje": "Backend CacaoDetect funcionando correctamente"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json

    nombre = data.get("nombre_completo")
    correo = data.get("correo")
    username = data.get("username")
    password = data.get("password")

    if not nombre or not correo or not username or not password:
        return jsonify({"error": "Faltan datos requeridos"}), 400

    try:
        nuevo_usuario = Usuario(
            nombre_completo=nombre,
            correo=correo,
            username=username,
            password=generate_password_hash(password)
        )
        db.session.add(nuevo_usuario)
        db.session.commit()

        return jsonify({
            "mensaje": "Usuario registrado correctamente",
            "usuario": {
                "id": nuevo_usuario.id,
                "nombre_completo": nuevo_usuario.nombre_completo,
                "correo": nuevo_usuario.correo,
                "username": nuevo_usuario.username
            }
        })

    except Exception:
        db.session.rollback()
        return jsonify({"error": "El correo o nombre de usuario ya está registrado"}), 400


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json

    usuario_correo = data.get("usuario_correo")
    password = data.get("password")

    if not usuario_correo or not password:
        return jsonify({"error": "Falta usuario_correo o contraseña"}), 400

    usuario = Usuario.query.filter(
        (Usuario.correo == usuario_correo) | (Usuario.username == usuario_correo)
    ).first()

    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if not check_password_hash(usuario.password, password):
        return jsonify({"error": "Contraseña incorrecta"}), 401

    return jsonify({
        "mensaje": "Login correcto",
        "usuario": {
            "id": usuario.id,
            "nombre_completo": usuario.nombre_completo,
            "correo": usuario.correo,
            "username": usuario.username,
            "foto_perfil_url": usuario.foto_perfil_url
        }
    })


def enviar_correo_recuperacion_hilo(correo, codigo):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "apazamiguel88@gmail.com")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_pass:
        print("WARNING: SMTP_PASSWORD no configurado.")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = correo
        msg["Subject"] = "CacaoDetect - Código de recuperación de contraseña"

        body = f"""
Hola,

Has solicitado restablecer tu contraseña en CacaoDetect.

Código: {codigo}

Este código es de un solo uso.

Atentamente,
El equipo de CacaoDetect
"""
        msg.attach(MIMEText(body, "plain", "utf-8"))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, correo, msg.as_string())
        server.quit()

    except Exception as e:
        print(f"Error al enviar correo: {e}")


def enviar_correo_async(correo, codigo):
    threading.Thread(
        target=enviar_correo_recuperacion_hilo,
        args=(correo, codigo)
    ).start()


@app.route("/api/recuperar-password/validar", methods=["POST"])
def recuperar_password_validar():
    data = request.json
    correo = data.get("correo")

    if not correo:
        return jsonify({"error": "El correo electrónico es obligatorio"}), 400

    usuario = Usuario.query.filter_by(correo=correo).first()

    if not usuario:
        return jsonify({"error": "No existe un usuario registrado con este correo electrónico."}), 404

    codigo = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    CodigoRecuperacion.query.filter_by(correo=correo, usado=False).update({"usado": True})

    nuevo_registro = CodigoRecuperacion(correo=correo, codigo=codigo)
    db.session.add(nuevo_registro)
    db.session.commit()

    enviar_correo_async(correo, codigo)

    return jsonify({"mensaje": "Código enviado con éxito al correo."}), 200


@app.route("/api/recuperar-password/verificar", methods=["POST"])
def recuperar_password_verificar():
    data = request.json
    correo = data.get("correo")
    codigo = data.get("codigo")

    if not correo or not codigo:
        return jsonify({"error": "Correo y código son obligatorios"}), 400

    record = CodigoRecuperacion.query.filter_by(
        correo=correo,
        codigo=codigo.upper().strip(),
        usado=False
    ).first()

    if not record:
        return jsonify({"error": "El código ingresado es incorrecto o ha expirado."}), 400

    return jsonify({"mensaje": "Código verificado con éxito."}), 200


@app.route("/api/recuperar-password/restablecer", methods=["POST"])
def recuperar_password_restablecer():
    data = request.json
    correo = data.get("correo")
    codigo = data.get("codigo")
    password = data.get("password")

    if not correo or not codigo or not password:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    record = CodigoRecuperacion.query.filter_by(
        correo=correo,
        codigo=codigo.upper().strip(),
        usado=False
    ).first()

    if not record:
        return jsonify({"error": "Acción no autorizada o código inválido."}), 400

    usuario = Usuario.query.filter_by(correo=correo).first()

    if not usuario:
        return jsonify({"error": "Usuario no encontrado."}), 404

    usuario.password = generate_password_hash(password)
    record.usado = True
    db.session.commit()

    return jsonify({"mensaje": "Contraseña restablecida correctamente."}), 200


@app.route("/api/analizar", methods=["POST"])
def analizar():
    usuario_id = request.form.get("usuario_id")
    imagen = request.files.get("imagen")
    modelo_seleccionado = request.form.get("modelo", "yolo")

    if not usuario_id or not imagen:
        return jsonify({"error": "Falta usuario_id o imagen"}), 400

    nombre_analisis = generar_nombre_analisis(usuario_id)
    temp_path = f"temp_{nombre_analisis}.jpg"
    imagen.save(temp_path)

    try:
        confianza = 0.0
        codigo_clase = ""

        if modelo_seleccionado == "keras":
            modelo_keras = get_keras_model()

            img_pil = Image.open(temp_path).convert("RGB")
            entrada = preprocesar_imagen_keras(img_pil)

            prediccion = modelo_keras.predict(entrada)
            indice = int(np.argmax(prediccion[0]))
            clase_keras = KERAS_CLASES[indice]

            confianza = round(float(prediccion[0][indice]) * 100, 2)
            codigo_clase = KERAS_MAPPING.get(clase_keras, "cacao_sano")

        else:
            modelo_yolo = get_yolo_model()

            resultados = modelo_yolo(temp_path)

            if len(resultados[0].boxes) == 0:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return jsonify({"error": "No se detectó cacao en la imagen"}), 400

            box = resultados[0].boxes[0]
            clase_id = int(box.cls[0])
            confianza = round(float(box.conf[0]) * 100, 2)
            codigo_clase = modelo_yolo.names[clase_id]

        recomendacion = RECOMENDACIONES.get(codigo_clase, "Revisar el estado del cacao.")

        upload = cloudinary.uploader.upload(
            temp_path,
            folder=f"cacao-app/usuario_{usuario_id}",
            public_id=nombre_analisis,
            overwrite=True,
            resource_type="image"
        )

        imagen_url = upload["secure_url"]
        public_id = upload["public_id"]

        if os.path.exists(temp_path):
            os.remove(temp_path)

        clasificacion = Clasificacion.query.filter_by(codigo=codigo_clase).first()

        if not clasificacion:
            clasificacion = Clasificacion(
                codigo=codigo_clase,
                nombre=codigo_clase.replace("cacao_", "").replace("_", " ").capitalize(),
                recomendacion=recomendacion
            )
            db.session.add(clasificacion)
            db.session.commit()

        nuevo_analisis = Analisis(
            usuario_id=int(usuario_id),
            clasificacion_id=clasificacion.id,
            nombre_analisis=nombre_analisis,
            imagen_url=imagen_url,
            public_id_cloudinary=public_id,
            confianza=confianza,
            modelo_usado=modelo_seleccionado
        )

        db.session.add(nuevo_analisis)
        db.session.commit()

        return jsonify({
            "mensaje": "Análisis realizado correctamente",
            "nombre_analisis": nombre_analisis,
            "resultado": clasificacion.nombre,
            "codigo_resultado": codigo_clase,
            "confianza": confianza,
            "recomendacion": clasificacion.recomendacion,
            "imagen_url": imagen_url,
            "modelo_usado": modelo_seleccionado
        })

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)

        db.session.rollback()
        print(f"Error al analizar: {e}")

        return jsonify({"error": str(e)}), 500


@app.route("/api/historial/<int:usuario_id>", methods=["GET"])
def historial(usuario_id):
    datos = db.session.query(
        Analisis.id,
        Analisis.nombre_analisis,
        Analisis.imagen_url,
        Analisis.confianza,
        Analisis.fecha,
        Analisis.modelo_usado,
        Clasificacion.codigo,
        Clasificacion.nombre,
        Clasificacion.recomendacion
    ).join(Clasificacion, Analisis.clasificacion_id == Clasificacion.id)\
     .filter(Analisis.usuario_id == usuario_id)\
     .order_by(Analisis.fecha.desc()).all()

    return jsonify([
        {
            "id": d.id,
            "nombre_analisis": d.nombre_analisis,
            "imagen_url": d.imagen_url,
            "confianza": d.confianza,
            "fecha": d.fecha.strftime("%d/%m/%Y %H:%M"),
            "modelo_usado": d.modelo_usado or "yolo",
            "codigo": d.codigo,
            "nombre": d.nombre,
            "recomendacion": d.recomendacion
        } for d in datos
    ])


@app.route("/api/dashboard/<int:usuario_id>", methods=["GET"])
def dashboard(usuario_id):
    total = Analisis.query.filter_by(usuario_id=usuario_id).count()

    conteo_clases = db.session.query(
        Clasificacion.codigo,
        Clasificacion.nombre,
        func.count(Analisis.id).label("cantidad")
    ).outerjoin(
        Analisis,
        (Clasificacion.id == Analisis.clasificacion_id) &
        (Analisis.usuario_id == usuario_id)
    ).group_by(
        Clasificacion.id,
        Clasificacion.codigo,
        Clasificacion.nombre
    ).all()

    clasificaciones = []

    for row in conteo_clases:
        cantidad = row.cantidad
        porcentaje = round((cantidad / total) * 100, 2) if total > 0 else 0

        clasificaciones.append({
            "codigo": row.codigo,
            "nombre": row.nombre,
            "cantidad": cantidad,
            "porcentaje": porcentaje
        })

    ultimos_rows = db.session.query(
        Analisis.nombre_analisis,
        Analisis.imagen_url,
        Analisis.fecha,
        Clasificacion.codigo,
        Clasificacion.nombre
    ).join(Clasificacion, Analisis.clasificacion_id == Clasificacion.id)\
     .filter(Analisis.usuario_id == usuario_id)\
     .order_by(Analisis.fecha.desc())\
     .limit(3).all()

    ultimos = [
        {
            "nombre_analisis": r.nombre_analisis,
            "imagen_url": r.imagen_url,
            "fecha": r.fecha.strftime("%d/%m/%Y %H:%M"),
            "codigo": r.codigo,
            "nombre": r.nombre
        } for r in ultimos_rows
    ]

    return jsonify({
        "total_analisis": total,
        "clasificaciones": clasificaciones,
        "ultimos_analisis": ultimos
    })


@app.route("/api/reportes/<int:usuario_id>", methods=["GET"])
def reportes(usuario_id):
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin = request.args.get("fecha_fin")

    query_total = Analisis.query.filter_by(usuario_id=usuario_id)

    if fecha_inicio and fecha_fin:
        query_total = query_total.filter(
            func.date(Analisis.fecha).between(fecha_inicio, fecha_fin)
        )

    total = query_total.count()

    query_dist = db.session.query(
        Clasificacion.codigo,
        Clasificacion.nombre,
        func.count(Analisis.id).label("cantidad")
    ).outerjoin(
        Analisis,
        (Clasificacion.id == Analisis.clasificacion_id) &
        (Analisis.usuario_id == usuario_id)
    )

    if fecha_inicio and fecha_fin:
        query_dist = query_dist.filter(
            (Analisis.id == None) |
            (func.date(Analisis.fecha).between(fecha_inicio, fecha_fin))
        )

    conteo_clases = query_dist.group_by(
        Clasificacion.id,
        Clasificacion.codigo,
        Clasificacion.nombre
    ).all()

    distribucion = []

    for row in conteo_clases:
        cantidad = row.cantidad
        porcentaje = round((cantidad / total) * 100, 2) if total > 0 else 0

        distribucion.append({
            "codigo": row.codigo,
            "nombre": row.nombre,
            "cantidad": cantidad,
            "porcentaje": porcentaje
        })

    query_fecha = db.session.query(
        func.date(Analisis.fecha).label("fecha"),
        func.count(Analisis.id).label("cantidad")
    ).filter(Analisis.usuario_id == usuario_id)

    if fecha_inicio and fecha_fin:
        query_fecha = query_fecha.filter(
            func.date(Analisis.fecha).between(fecha_inicio, fecha_fin)
        )

    por_fecha_rows = query_fecha.group_by(
        func.date(Analisis.fecha)
    ).order_by(
        func.date(Analisis.fecha)
    ).all()

    por_fecha = [
        {"fecha": str(r.fecha), "cantidad": r.cantidad}
        for r in por_fecha_rows
    ]

    query_detalles = db.session.query(
        Analisis.id,
        Analisis.nombre_analisis,
        Analisis.imagen_url,
        Analisis.confianza,
        Analisis.fecha,
        Analisis.modelo_usado,
        Clasificacion.codigo,
        Clasificacion.nombre,
        Clasificacion.recomendacion
    ).join(Clasificacion, Analisis.clasificacion_id == Clasificacion.id)\
     .filter(Analisis.usuario_id == usuario_id)

    if fecha_inicio and fecha_fin:
        query_detalles = query_detalles.filter(
            func.date(Analisis.fecha).between(fecha_inicio, fecha_fin)
        )

    detalles_rows = query_detalles.order_by(Analisis.fecha.desc()).all()

    detalles = [
        {
            "id": d.id,
            "nombre_analisis": d.nombre_analisis,
            "imagen_url": d.imagen_url,
            "confianza": d.confianza,
            "fecha": d.fecha.strftime("%d/%m/%Y %H:%M"),
            "modelo_usado": d.modelo_usado or "yolo",
            "codigo": d.codigo,
            "nombre": d.nombre,
            "recomendacion": d.recomendacion
        } for d in detalles_rows
    ]

    return jsonify({
        "total_analisis": total,
        "distribucion": distribucion,
        "analisis_por_fecha": por_fecha,
        "analisis_detallados": detalles
    })


@app.route("/api/perfil/<int:usuario_id>", methods=["GET"])
def obtener_perfil(usuario_id):
    usuario = Usuario.query.get(usuario_id)

    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    total = Analisis.query.filter_by(usuario_id=usuario_id).count()

    return jsonify({
        "id": usuario.id,
        "nombre_completo": usuario.nombre_completo,
        "correo": usuario.correo,
        "username": usuario.username,
        "foto_perfil_url": usuario.foto_perfil_url,
        "fecha_registro": usuario.fecha_registro.strftime("%d/%m/%Y"),
        "cantidad_analisis": total
    })


@app.route("/api/perfil/<int:usuario_id>", methods=["PUT"])
def actualizar_perfil(usuario_id):
    usuario = Usuario.query.get(usuario_id)

    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = request.json

    usuario.nombre_completo = data.get("nombre_completo", usuario.nombre_completo)
    usuario.correo = data.get("correo", usuario.correo)
    usuario.username = data.get("username", usuario.username)

    password = data.get("password")

    if password:
        usuario.password = generate_password_hash(password)

    db.session.commit()

    return jsonify({"mensaje": "Perfil actualizado correctamente"})


@app.route("/api/usuarios", methods=["GET"])
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.id.desc()).all()

    return jsonify([
        {
            "id": u.id,
            "nombre_completo": u.nombre_completo,
            "correo": u.correo,
            "username": u.username,
            "fecha_registro": u.fecha_registro.strftime("%d/%m/%Y")
        } for u in usuarios
    ])


if __name__ == "__main__":
    with app.app_context():
        inicializar_bd()

    app.run(
        debug=True,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )