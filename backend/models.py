from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id              = db.Column(db.Integer, primary_key=True)
    nombre_completo = db.Column(db.String(100), nullable=False)
    correo          = db.Column(db.String(150), unique=True, nullable=False)
    username        = db.Column(db.String(100), unique=True, nullable=False)
    password        = db.Column(db.String(255), nullable=False)  # Guarda el hash de la contraseña
    foto_perfil_url = db.Column(db.String(255), nullable=True)
    fecha_registro  = db.Column(db.DateTime, default=datetime.utcnow)

    analisis = db.relationship('Analisis', backref='usuario', lazy=True)


class Clasificacion(db.Model):
    __tablename__ = 'clasificaciones'

    id            = db.Column(db.Integer, primary_key=True)
    codigo        = db.Column(db.String(50), unique=True, nullable=False)
    nombre        = db.Column(db.String(100), nullable=False)
    recomendacion = db.Column(db.Text, nullable=False)

    analisis = db.relationship('Analisis', backref='clasificacion', lazy=True)


class Analisis(db.Model):
    __tablename__ = 'analisis'

    id                   = db.Column(db.Integer, primary_key=True)
    usuario_id           = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    clasificacion_id     = db.Column(db.Integer, db.ForeignKey('clasificaciones.id'), nullable=False)
    nombre_analisis      = db.Column(db.String(100), nullable=False)
    imagen_url           = db.Column(db.String(255), nullable=False)
    public_id_cloudinary = db.Column(db.String(100), nullable=True)
    confianza            = db.Column(db.Float, nullable=False)
    modelo_usado         = db.Column(db.String(50), nullable=True)  # 'yolo' o 'keras'
    fecha                = db.Column(db.DateTime, default=datetime.utcnow)


class CodigoRecuperacion(db.Model):
    __tablename__ = 'codigos_recuperacion'

    id              = db.Column(db.Integer, primary_key=True)
    correo          = db.Column(db.String(150), nullable=False)
    codigo          = db.Column(db.String(50), nullable=False)
    fecha_creacion  = db.Column(db.DateTime, default=datetime.utcnow)
    usado           = db.Column(db.Boolean, default=False)