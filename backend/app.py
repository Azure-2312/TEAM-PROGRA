from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import cloudinary
import cloudinary.uploader
from ultralytics import YOLO

load_dotenv()

app = Flask(__name__)
CORS(app)

DATABASE = "database.db"
MODEL_PATH = "best.pt"

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

model = YOLO(MODEL_PATH)


def conectar_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


RECOMENDACIONES = {
    "cacao_barrenador": "Se recomienda separar la mazorca afectada y revisar signos de perforación o daño interno.",
    "cacao_mazorca_negra": "Se recomienda retirar las mazorcas afectadas y evitar el contacto con frutos sanos.",
    "cacao_mirido": "Se recomienda inspeccionar la planta y controlar insectos que dañen la superficie del cacao.",
    "cacao_moniliasis": "Se recomienda eliminar frutos infectados y mejorar la ventilación del cultivo.",
    "cacao_sano": "Producto apto visualmente. El cacao se encuentra en buen estado."
}


def inicializar_bd():
    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_completo TEXT NOT NULL,
            correo TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            foto_perfil_url TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clasificaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            recomendacion TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analisis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            clasificacion_id INTEGER NOT NULL,
            nombre_analisis TEXT NOT NULL,
            imagen_url TEXT NOT NULL,
            public_id_cloudinary TEXT,
            confianza REAL NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (clasificacion_id) REFERENCES clasificaciones(id)
        )
    """)

    clases = [
        ("cacao_barrenador", "Cacao con barrenador", RECOMENDACIONES["cacao_barrenador"]),
        ("cacao_mazorca_negra", "Cacao con mazorca negra", RECOMENDACIONES["cacao_mazorca_negra"]),
        ("cacao_mirido", "Cacao con mírido", RECOMENDACIONES["cacao_mirido"]),
        ("cacao_moniliasis", "Cacao con moniliasis", RECOMENDACIONES["cacao_moniliasis"]),
        ("cacao_sano", "Cacao sano", RECOMENDACIONES["cacao_sano"]),
    ]

    cursor.executemany("""
        INSERT OR IGNORE INTO clasificaciones (codigo, nombre, recomendacion)
        VALUES (?, ?, ?)
    """, clases)

    conn.commit()
    conn.close()


@app.route("/")
def home():
    return jsonify({"mensaje": "Backend Cacao funcionando correctamente"})


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json

    nombre = data.get("nombre_completo")
    correo = data.get("correo")
    username = data.get("username")
    password = data.get("password")

    if not nombre or not correo or not username or not password:
        return jsonify({"error": "Faltan datos"}), 400

    password_hash = generate_password_hash(password)

    try:
        conn = conectar_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO usuarios (nombre_completo, correo, username, password)
            VALUES (?, ?, ?, ?)
        """, (nombre, correo, username, password_hash))

        conn.commit()
        usuario_id = cursor.lastrowid
        conn.close()

        return jsonify({
            "mensaje": "Usuario registrado correctamente",
            "usuario": {
                "id": usuario_id,
                "nombre_completo": nombre,
                "correo": correo,
                "username": username
            }
        })

    except sqlite3.IntegrityError:
        return jsonify({"error": "Correo o usuario ya registrado"}), 400


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json

    usuario_correo = data.get("usuario_correo")
    password = data.get("password")

    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM usuarios
        WHERE correo = ? OR username = ?
    """, (usuario_correo, usuario_correo))

    usuario = cursor.fetchone()
    conn.close()

    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if not check_password_hash(usuario["password"], password):
        return jsonify({"error": "Contraseña incorrecta"}), 401

    return jsonify({
        "mensaje": "Login correcto",
        "usuario": {
            "id": usuario["id"],
            "nombre_completo": usuario["nombre_completo"],
            "correo": usuario["correo"],
            "username": usuario["username"],
            "foto_perfil_url": usuario["foto_perfil_url"]
        }
    })


def generar_nombre_analisis(usuario_id):
    hoy = datetime.now()
    fecha_codigo = hoy.strftime("%Y_%m_%d")

    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as total
        FROM analisis
        WHERE usuario_id = ?
        AND DATE(fecha) = DATE('now', 'localtime')
    """, (usuario_id,))

    total = cursor.fetchone()["total"] + 1
    conn.close()

    return f"cacao_{fecha_codigo}_{total}"


@app.route("/api/analizar", methods=["POST"])
def analizar():
    usuario_id = request.form.get("usuario_id")
    imagen = request.files.get("imagen")

    if not usuario_id or not imagen:
        return jsonify({"error": "Falta usuario_id o imagen"}), 400

    nombre_analisis = generar_nombre_analisis(usuario_id)

    temp_path = f"temp_{nombre_analisis}.jpg"
    imagen.save(temp_path)

    resultados = model(temp_path)

    if len(resultados[0].boxes) == 0:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": "No se detectó cacao en la imagen"}), 400

    box = resultados[0].boxes[0]
    clase_id = int(box.cls[0])
    confianza = round(float(box.conf[0]) * 100, 2)

    codigo_clase = model.names[clase_id]
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

    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id FROM clasificaciones
        WHERE codigo = ?
    """, (codigo_clase,))

    clasificacion = cursor.fetchone()

    cursor.execute("""
        INSERT INTO analisis (
            usuario_id,
            clasificacion_id,
            nombre_analisis,
            imagen_url,
            public_id_cloudinary,
            confianza
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        usuario_id,
        clasificacion["id"],
        nombre_analisis,
        imagen_url,
        public_id,
        confianza
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "mensaje": "Análisis realizado correctamente",
        "nombre_analisis": nombre_analisis,
        "resultado": codigo_clase,
        "confianza": confianza,
        "recomendacion": recomendacion,
        "imagen_url": imagen_url
    })


@app.route("/api/historial/<int:usuario_id>", methods=["GET"])
def historial(usuario_id):
    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            a.id,
            a.nombre_analisis,
            a.imagen_url,
            a.confianza,
            a.fecha,
            c.codigo,
            c.nombre,
            c.recomendacion
        FROM analisis a
        INNER JOIN clasificaciones c ON a.clasificacion_id = c.id
        WHERE a.usuario_id = ?
        ORDER BY a.fecha DESC
    """, (usuario_id,))

    datos = cursor.fetchall()
    conn.close()

    return jsonify([dict(d) for d in datos])


@app.route("/api/dashboard/<int:usuario_id>", methods=["GET"])
def dashboard(usuario_id):
    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as total
        FROM analisis
        WHERE usuario_id = ?
    """, (usuario_id,))
    total = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT c.codigo, c.nombre, COUNT(a.id) as cantidad
        FROM clasificaciones c
        LEFT JOIN analisis a 
            ON c.id = a.clasificacion_id 
            AND a.usuario_id = ?
        GROUP BY c.id
    """, (usuario_id,))

    clasificaciones = []
    for row in cursor.fetchall():
        cantidad = row["cantidad"]
        porcentaje = round((cantidad / total) * 100, 2) if total > 0 else 0
        clasificaciones.append({
            "codigo": row["codigo"],
            "nombre": row["nombre"],
            "cantidad": cantidad,
            "porcentaje": porcentaje
        })

    cursor.execute("""
        SELECT a.nombre_analisis, a.imagen_url, a.fecha, c.codigo, c.nombre
        FROM analisis a
        INNER JOIN clasificaciones c ON a.clasificacion_id = c.id
        WHERE a.usuario_id = ?
        ORDER BY a.fecha DESC
        LIMIT 3
    """, (usuario_id,))

    ultimos = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "total_analisis": total,
        "clasificaciones": clasificaciones,
        "ultimos_analisis": ultimos
    })


@app.route("/api/reportes/<int:usuario_id>", methods=["GET"])
def reportes(usuario_id):
    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin = request.args.get("fecha_fin")

    conn = conectar_db()
    cursor = conn.cursor()

    filtro = "WHERE a.usuario_id = ?"
    params = [usuario_id]

    if fecha_inicio and fecha_fin:
        filtro += " AND DATE(a.fecha) BETWEEN DATE(?) AND DATE(?)"
        params.extend([fecha_inicio, fecha_fin])

    cursor.execute(f"""
        SELECT COUNT(*) as total
        FROM analisis a
        {filtro}
    """, params)

    total = cursor.fetchone()["total"]

    cursor.execute(f"""
        SELECT c.codigo, c.nombre, COUNT(a.id) as cantidad
        FROM clasificaciones c
        LEFT JOIN analisis a 
            ON c.id = a.clasificacion_id 
            AND a.usuario_id = ?
            {"AND DATE(a.fecha) BETWEEN DATE(?) AND DATE(?)" if fecha_inicio and fecha_fin else ""}
        GROUP BY c.id
    """, params)

    distribucion = []
    for row in cursor.fetchall():
        cantidad = row["cantidad"]
        porcentaje = round((cantidad / total) * 100, 2) if total > 0 else 0
        distribucion.append({
            "codigo": row["codigo"],
            "nombre": row["nombre"],
            "cantidad": cantidad,
            "porcentaje": porcentaje
        })

    cursor.execute(f"""
        SELECT DATE(a.fecha) as fecha, COUNT(*) as cantidad
        FROM analisis a
        {filtro}
        GROUP BY DATE(a.fecha)
        ORDER BY DATE(a.fecha)
    """, params)

    por_fecha = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        "total_analisis": total,
        "distribucion": distribucion,
        "analisis_por_fecha": por_fecha
    })


@app.route("/api/perfil/<int:usuario_id>", methods=["GET"])
def obtener_perfil(usuario_id):
    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nombre_completo, correo, username, foto_perfil_url, fecha_registro
        FROM usuarios
        WHERE id = ?
    """, (usuario_id,))

    usuario = cursor.fetchone()

    cursor.execute("""
        SELECT COUNT(*) as total
        FROM analisis
        WHERE usuario_id = ?
    """, (usuario_id,))

    total = cursor.fetchone()["total"]
    conn.close()

    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = dict(usuario)
    data["cantidad_analisis"] = total

    return jsonify(data)


@app.route("/api/perfil/<int:usuario_id>", methods=["PUT"])
def actualizar_perfil(usuario_id):
    data = request.json

    nombre = data.get("nombre_completo")
    correo = data.get("correo")
    username = data.get("username")
    nueva_password = data.get("password")

    conn = conectar_db()
    cursor = conn.cursor()

    if nueva_password:
        password_hash = generate_password_hash(nueva_password)
        cursor.execute("""
            UPDATE usuarios
            SET nombre_completo = ?, correo = ?, username = ?, password = ?
            WHERE id = ?
        """, (nombre, correo, username, password_hash, usuario_id))
    else:
        cursor.execute("""
            UPDATE usuarios
            SET nombre_completo = ?, correo = ?, username = ?
            WHERE id = ?
        """, (nombre, correo, username, usuario_id))

    conn.commit()
    conn.close()

    return jsonify({"mensaje": "Perfil actualizado correctamente"})

@app.route("/api/usuarios", methods=["GET"])
def listar_usuarios():
    conn = conectar_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nombre_completo, correo, username, fecha_registro
        FROM usuarios
        ORDER BY id DESC
    """)

    usuarios = cursor.fetchall()
    conn.close()

    return jsonify([dict(u) for u in usuarios])


if __name__ == "__main__":
    inicializar_bd()
    app.run(debug=True)