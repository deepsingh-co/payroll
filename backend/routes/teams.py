from flask import Blueprint, request, jsonify
from extensions import db
from models import Team, Employee
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

team_bp = Blueprint('teams', __name__)

@team_bp.route('/', methods=['GET'])
@jwt_required()
def get_teams():
    teams = Team.objects.all()
    result = []
    for team in teams:
        leader = Employee.objects(id=team.leader.id).first() if team.leader else None
        member_list = []
        for emp in team.members:
            if emp:
                member_list.append({'id': str(emp.id), 'name': emp.name, 'role': emp.role})
        result.append({
            'id': str(team.id),
            'name': team.name,
            'department': team.department,
            'leader_id': str(team.leader.id) if team.leader else None,
            'leader_name': leader.name if leader else 'N/A',
            'member_count': len(member_list),
            'members': member_list
        })
    return jsonify(result), 200

@team_bp.route('/', methods=['POST'])
@jwt_required()
def create_team():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    name = data.get('name')
    department = data.get('department')
    leader_id = data.get('leader_id')

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    leader = Employee.objects(id=leader_id).first() if leader_id else None
    team = Team(name=name, department=department, leader=leader, members=[leader] if leader else [])
    team.save()

    return jsonify({
        'id': str(team.id),
        'name': team.name,
        'department': team.department,
        'leader_id': str(team.leader.id) if team.leader else None,
        'leader_name': leader.name if leader else 'N/A',
        'member_count': len(team.members),
        'members': [] # Simplified
    }), 201

@team_bp.route('/<string:id>', methods=['DELETE'])
@jwt_required()
def delete_team(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    team = Team.objects(id=id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
        
    team.delete()
    return jsonify({'message': 'Team deleted successfully'}), 200

@team_bp.route('/<string:id>/members', methods=['POST'])
@jwt_required()
def add_team_member(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    team = Team.objects(id=id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
        
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'error': 'Employee ID is required'}), 400

    employee = Employee.objects(id=employee_id).first()
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    if employee in team.members:
        return jsonify({'message': 'Employee is already in the team'}), 200

    team.members.append(employee)
    team.save()

    return jsonify({'message': 'Member added successfully'}), 201

@team_bp.route('/<string:id>/members/<string:employee_id>', methods=['DELETE'])
@jwt_required()
def remove_team_member(id, employee_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    team = Team.objects(id=id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
        
    employee = Employee.objects(id=employee_id).first()
    if not employee:
         return jsonify({'error': 'Employee not found'}), 404
         
    if employee in team.members:
        team.members.remove(employee)
        team.save()

    return jsonify({'message': 'Member removed successfully'}), 200
