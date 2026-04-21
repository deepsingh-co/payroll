from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import uuid
import datetime
import random
from email_service import send_email

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
        
    if User.objects(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    verification_token = str(random.randint(100000, 999999))
    
    # In a real app we might only allow admin to create 'admin' roles, but allowing it for simplicity
    new_user = User(name=name, email=email, password=hashed_password, role=role, is_verified=False, verification_token=verification_token)
    new_user.save()
    
    # Send verification email
    email_body = f"""
    <h2>Welcome to Smart Payroll!</h2>
    <p>Hi {name},</p>
    <p>Please verify your email address by entering the following 6-digit code on the verification page:</p>
    <h1 style="background:#f4f4f5;padding:10px;display:inline-block;border-radius:5px;letter-spacing:5px;">{verification_token}</h1>
    <p>For demo testing, your code is: <b>{verification_token}</b></p>
    """
    send_email(email, "Verify your Smart Payroll account", email_body)
    
    return jsonify({
        'message': 'User registered successfully. Please check your email to verify your account.',
        'dev_verification_token': verification_token # To assist with local testing
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.objects(email=email).first()
    print(f"Login attempt: {email}")
    if user:
        if not user.is_verified:
            return jsonify({'error': 'Please verify your email address before logging in.'}), 403
            
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
    user = User.objects(id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({
        'id': str(user.id),
        'name': user.name,
        'email': user.email,
        'role': user.role
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
         
    user = User.objects(email=email).first()
    if not user:
        return jsonify({'message': 'If this email is registered, a password reset token has been provided.'}), 200
         
    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    user.reset_token_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    user.save()
    
    print(f"Generated reset token for {email}: {reset_token}")
    
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
    email_body = f"""
    <h2>Password Reset Request</h2>
    <p>Hi {user.name},</p>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <a href="{reset_link}" style="display:inline-block;padding:10px 20px;background-color:#6366F1;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
    <p>Or copy and paste this link: {reset_link}</p>
    <p>If you did not request this, please ignore this email.</p>
    """
    send_email(email, "Reset your Smart Payroll password", email_body)
    
    return jsonify({
        'message': 'Password reset token has been generated. Check your email.',
        'reset_token': reset_token
    }), 200

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    email = data.get('email')
    token = data.get('token')
    
    if not token or not email:
        return jsonify({'error': 'Email and verification code are required'}), 400
        
    user = User.objects(email=email, verification_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid or expired verification token'}), 400
        
    user.is_verified = True
    user.verification_token = None
    user.save()
    
    return jsonify({'message': 'Email verified successfully! You can now log in.'}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400
        
    user = User.objects(reset_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid token'}), 400
        
    if user.reset_token_expires and user.reset_token_expires < datetime.datetime.utcnow():
        return jsonify({'error': 'Token has expired'}), 400
        
    hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.password = hashed_password
    user.reset_token = None
    user.reset_token_expires = None
    user.save()
    
    return jsonify({'message': 'Password has been updated successfully'}), 200
