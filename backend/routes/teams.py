from flask import Blueprint, request, jsonify
from extensions import db
from models import Team, Employee
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

team_bp = Blueprint('teams', __name__)

@team_bp.route('/', methods=['GET'])
@jwt_required()
def get_teams():
    user_id = get_jwt_identity()
    claims = get_jwt()
    is_admin = claims.get('role') == 'admin'
    
    current_employee = Employee.objects(user_id=user_id).first()
    
    if is_admin:
        teams = Team.objects.all()
    elif current_employee:
        # Check if employee is a leader of any team
        leading_teams = Team.objects(leader=current_employee.id).all()
        # If leader, they can see all teams (but maybe restricted view for non-owned teams?)
        # User said: "team leader can view the other team leader"
        if leading_teams:
            teams = Team.objects.all()
        else:
            # Regular member: only teams they are part of
            teams = Team.objects(members__in=[current_employee.id]).all()
    else:
        return jsonify([]), 200

    result = []
    for team in teams:
        is_leader_of_this_team = current_employee and team.leader and str(team.leader.id) == str(current_employee.id)
        is_member_of_this_team = current_employee and current_employee in team.members
        
        # If it's not their team and they aren't admin/leader, skip (though query already handled members)
        # Actually, let's refine the result based on privacy
        
        leader = Employee.objects(id=team.leader.id).first() if team.leader else None
        
        # Privacy logic for members: if they are just a member, they see the team details.
        # If they are a leader, they see other teams' headers (leader info) but maybe skip full member lists of other teams?
        
        can_see_members = is_admin or is_leader_of_this_team or is_member_of_this_team
        
        member_list = []
        if can_see_members:
            for emp in team.members:
                if emp:
                    member_list.append({'id': str(emp.id), 'name': emp.name, 'role': emp.role})
        
        result.append({
            'id': str(team.id),
            'name': team.name,
            'department': team.department,
            'leader_id': str(team.leader.id) if team.leader else None,
            'leader_name': leader.name if leader else 'N/A',
            'member_count': len(team.members),
            'members': member_list,
            'is_leader': is_leader_of_this_team
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
