from flask import Blueprint, request, jsonify
from extensions import db
from models import Team, Employee, TeamMember
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

team_bp = Blueprint('teams', __name__)

@team_bp.route('/', methods=['GET'])
@jwt_required()
def get_teams():
    teams = Team.query.all()
    result = []
    for team in teams:
        leader = Employee.query.get(team.leader_id) if team.leader_id else None
        members = TeamMember.query.filter_by(team_id=team.id).all()
        member_list = []
        for m in members:
            emp = Employee.query.get(m.employee_id)
            if emp:
                member_list.append({'id': emp.id, 'name': emp.name, 'role': emp.role})
        result.append({
            'id': team.id,
            'name': team.name,
            'department': team.department,
            'leader_id': team.leader_id,
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

    team = Team(name=name, department=department, leader_id=leader_id)
    db.session.add(team)
    db.session.commit()

    leader = Employee.query.get(leader_id) if leader_id else None
    return jsonify({
        'id': team.id,
        'name': team.name,
        'department': team.department,
        'leader_id': team.leader_id,
        'leader_name': leader.name if leader else 'N/A',
        'member_count': 0,
        'members': []
    }), 201

@team_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_team(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    team = Team.query.get_or_404(id)
    TeamMember.query.filter_by(team_id=id).delete()
    db.session.delete(team)
    db.session.commit()

    return jsonify({'message': 'Team deleted successfully'}), 200

@team_bp.route('/<int:id>/members', methods=['POST'])
@jwt_required()
def add_team_member(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    team = Team.query.get_or_404(id)
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'error': 'Employee ID is required'}), 400

    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    existing_member = TeamMember.query.filter_by(team_id=id, employee_id=employee_id).first()
    if existing_member:
        return jsonify({'message': 'Employee is already in the team'}), 200

    member = TeamMember(team_id=id, employee_id=employee_id)
    db.session.add(member)
    db.session.commit()

    return jsonify({'message': 'Member added successfully'}), 201

@team_bp.route('/<int:id>/members/<int:employee_id>', methods=['DELETE'])
@jwt_required()
def remove_team_member(id, employee_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    member = TeamMember.query.filter_by(team_id=id, employee_id=employee_id).first_or_404()
    db.session.delete(member)
    db.session.commit()

    return jsonify({'message': 'Member removed successfully'}), 200
