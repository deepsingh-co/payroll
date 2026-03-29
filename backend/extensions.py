import mongoengine as db
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# No need to init_app for mongoengine if using it directly, 
# but we'll call connect() in app.py
jwt = JWTManager()
cors = CORS(resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
bcrypt = Bcrypt()
