from flask import Blueprint, request, jsonify
from extensions import db
from models import Team, Employee, Message, Issue, Task
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

chat_bp = Blueprint('chat', __name__)


def get_current_employee():
    user_id = get_jwt_identity()
    return Employee.objects(user_id=user_id).first()


def is_team_member_or_leader(employee, team):
    if not employee or not team:
        return False
    if team.leader and str(team.leader.id) == str(employee.id):
        return True
    for m in team.members:
        if str(m.id) == str(employee.id):
            return True
    return False


def is_team_leader(employee, team):
    if not employee or not team:
        return False
    return team.leader and str(team.leader.id) == str(employee.id)


# ── Chat Messages ──────────────────────────────────────────────

@chat_bp.route('/teams/<string:team_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    # Chat is ONLY for team members/leaders – admin can read but not required
    if not is_team_member_or_leader(employee, team):
        return jsonify({'error': 'You are not a member of this team'}), 403

    messages = Message.objects(team=team).order_by('created_at').all()
    return jsonify([{
        'id': str(m.id),
        'sender_name': m.sender.name if m.sender else 'Unknown',
        'sender_id': str(m.sender.id) if m.sender else None,
        'content': m.content,
        'created_at': m.created_at.isoformat() if m.created_at else None
    } for m in messages]), 200


@chat_bp.route('/teams/<string:team_id>/messages', methods=['POST'])
@jwt_required()
def send_message(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    # Only actual team members/leaders can send messages
    if not is_team_member_or_leader(employee, team):
        return jsonify({'error': 'You are not a member of this team'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Message content required'}), 400

    msg = Message(team=team, sender=employee, content=content)
    msg.save()
    return jsonify({
        'id': str(msg.id),
        'sender_name': employee.name,
        'sender_id': str(employee.id),
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    }), 201


# ── Issues ─────────────────────────────────────────────────────

@chat_bp.route('/teams/<string:team_id>/issues', methods=['GET'])
@jwt_required()
def get_issues(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    if claims.get('role') != 'admin' and not is_team_member_or_leader(employee, team):
        return jsonify({'error': 'Unauthorized'}), 403

    issues = Issue.objects(team=team).order_by('-created_at').all()
    return jsonify([{
        'id': str(i.id),
        'title': i.title,
        'description': i.description,
        'status': i.status,
        'raised_by': i.raised_by.name if i.raised_by else 'Unknown',
        'raised_by_id': str(i.raised_by.id) if i.raised_by else None,
        'created_at': i.created_at.isoformat() if i.created_at else None
    } for i in issues]), 200


@chat_bp.route('/teams/<string:team_id>/issues', methods=['POST'])
@jwt_required()
def raise_issue(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    if claims.get('role') != 'admin' and not is_team_member_or_leader(employee, team):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    if not title:
        return jsonify({'error': 'Issue title required'}), 400

    issue = Issue(team=team, raised_by=employee, title=title, description=description)
    issue.save()
    return jsonify({
        'id': str(issue.id),
        'title': issue.title,
        'description': issue.description,
        'status': issue.status,
        'raised_by': employee.name,
        'created_at': issue.created_at.isoformat()
    }), 201


@chat_bp.route('/teams/<string:team_id>/issues/<string:issue_id>', methods=['PUT'])
@jwt_required()
def resolve_issue(team_id, issue_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    # Only admin or team leader can resolve
    if claims.get('role') != 'admin' and not is_team_leader(employee, team):
        return jsonify({'error': 'Only the team leader or admin can resolve issues'}), 403

    issue = Issue.objects(id=issue_id, team=team).first()
    if not issue:
        return jsonify({'error': 'Issue not found'}), 404

    data = request.get_json()
    issue.status = data.get('status', issue.status)
    issue.save()
    return jsonify({'message': 'Issue updated', 'status': issue.status}), 200


# ── Team Task Assignment (by team leader) ──────────────────────

@chat_bp.route('/teams/<string:team_id>/tasks', methods=['GET'])
@jwt_required()
def get_team_tasks(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    if claims.get('role') != 'admin' and not is_team_member_or_leader(employee, team):
        return jsonify({'error': 'Unauthorized'}), 403

    tasks = Task.objects(team=team_id).all()
    result = []
    for t in tasks:
        assignee = Employee.objects(id=t.assigned_to.id).first() if t.assigned_to else None
        result.append({
            'id': str(t.id),
            'title': t.title,
            'assigned_to': str(t.assigned_to.id) if t.assigned_to else None,
            'assignee_name': assignee.name if assignee else 'Unassigned',
            'complexity_score': t.complexity_score,
            'estimated_hours': t.estimated_hours,
            'deadline': t.deadline.isoformat() if t.deadline else None,
            'status': t.status,
            'created_at': t.created_at.isoformat() if t.created_at else None
        })
    return jsonify(result), 200


@chat_bp.route('/teams/<string:team_id>/tasks', methods=['POST'])
@jwt_required()
def assign_team_task(team_id):
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    # Only admin or team leader can assign tasks
    if claims.get('role') != 'admin' and not is_team_leader(employee, team):
        return jsonify({'error': 'Only the team leader or admin can assign tasks'}), 403

    data = request.get_json()
    title = data.get('title', '').strip()
    assigned_to_id = data.get('assigned_to')
    complexity_score = data.get('complexity_score', 1)
    estimated_hours = data.get('estimated_hours', 1)
    deadline_str = data.get('deadline')

    if not title:
        return jsonify({'error': 'Task title required'}), 400

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400

    assigned_to = None
    if assigned_to_id:
        assigned_to = Employee.objects(id=assigned_to_id).first()

    task = Task(
        title=title,
        assigned_to=assigned_to,
        complexity_score=complexity_score,
        estimated_hours=estimated_hours,
        deadline=deadline,
        assigned_by=employee,
        team=team
    )
    task.save()
    return jsonify({
        'id': str(task.id),
        'title': task.title,
        'assignee_name': assigned_to.name if assigned_to else 'Unassigned',
        'status': task.status
    }), 201


@chat_bp.route('/teams/<string:team_id>/tasks/<string:task_id>/status', methods=['PUT'])
@jwt_required()
def update_team_task_status(team_id, task_id):
    """
    - Member can mark as 'member_completed' (signals they believe it's done).
    - Team leader/admin can set final status: pending / in_progress / completed.
    """
    claims = get_jwt()
    employee = get_current_employee()
    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    task = Task.objects(id=task_id, team=team).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    data = request.get_json()
    new_status = data.get('status')

    is_leader = is_team_leader(employee, team)
    is_admin = claims.get('role') == 'admin'
    is_assignee = task.assigned_to and employee and str(task.assigned_to.id) == str(employee.id)

    if is_admin or is_leader:
        # Leader and admin can set any official status
        if new_status in ['pending', 'in_progress', 'completed']:
            task.status = new_status
        else:
            return jsonify({'error': 'Invalid status'}), 400
    elif is_assignee:
        # Member can only mark as "completed" (signals done to the leader)
        if new_status == 'completed':
            task.status = 'completed'
        else:
            return jsonify({'error': 'Members can only mark tasks as completed'}), 403
    else:
        return jsonify({'error': 'Unauthorized'}), 403

    task.save()
    return jsonify({'message': 'Task status updated', 'status': task.status}), 200


# ── Admin: Change Team Leader ──────────────────────────────────

@chat_bp.route('/teams/<string:team_id>/leader', methods=['PUT'])
@jwt_required()
def change_team_leader(team_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Only admin can change the team leader'}), 403

    team = Team.objects(id=team_id).first()
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    data = request.get_json()
    new_leader_id = data.get('leader_id')
    if not new_leader_id:
        return jsonify({'error': 'leader_id is required'}), 400

    new_leader = Employee.objects(id=new_leader_id).first()
    if not new_leader:
        return jsonify({'error': 'Employee not found'}), 404

    # Ensure new leader is in team members, add if missing
    member_ids = [str(m.id) for m in team.members]
    if new_leader_id not in member_ids:
        team.members.append(new_leader)

    team.leader = new_leader
    team.save()
    return jsonify({'message': f'Team leader changed to {new_leader.name}', 'leader_id': str(new_leader.id), 'leader_name': new_leader.name}), 200
