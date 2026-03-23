from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS(resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
bcrypt = Bcrypt()
