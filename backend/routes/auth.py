from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'employee')
    
    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password are required'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    # In a real app we might only allow admin to create 'admin' roles, but allowing it for simplicity
    new_user = User(name=name, email=email, password=hashed_password, role=role, is_verified=True)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    print(f"Login attempt: {email}")
    if user:
        match = bcrypt.check_password_hash(user.password, password)
        print(f"User found: {user.email}, Password match: {match}")
        if match:
            access_token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
            return jsonify({'token': access_token, 'role': user.role, 'name': user.name}), 200
    else:
        print(f"User NOT found: {email}")
        
    return jsonify({'error': 'Invalid email or password'}), 401
    
@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role
    }), 200
