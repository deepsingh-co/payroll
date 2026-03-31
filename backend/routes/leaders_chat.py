from flask import Blueprint, request, jsonify
from extensions import db
from models import Team, Employee, LeaderMessage
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

leaders_chat_bp = Blueprint('leaders_chat', __name__)

def is_leader(employee):
    if not employee: return False
    return Team.objects(leader=employee.id).first() is not None

@leaders_chat_bp.route('/messages', methods=['GET'])
@jwt_required()
def get_leader_messages():
    user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'admin'
    
    current_employee = Employee.objects(user_id=user_id).first()
    
    if not is_admin and not is_leader(current_employee):
        return jsonify({'error': 'Unauthorized. Only team leaders and admin can access this chat.'}), 403

    messages = LeaderMessage.objects.order_by('created_at').all()
    return jsonify([{
        'id': str(m.id),
        'sender_id': str(m.sender.id),
        'sender_name': m.sender.name,
        'content': m.content,
        'created_at': m.created_at.isoformat()
    } for m in messages]), 200

@leaders_chat_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_leader_message():
    user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'admin'
    
    current_employee = Employee.objects(user_id=user_id).first()
    
    if not is_admin and not is_leader(current_employee):
        return jsonify({'error': 'Unauthorized. Only team leaders and admin can send messages here.'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Message content is required'}), 400

    msg = LeaderMessage(
        sender=current_employee,
        content=content
    )
    msg.save()
    
    return jsonify({
        'id': str(msg.id),
        'sender_id': str(current_employee.id),
        'sender_name': current_employee.name,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    }), 201
