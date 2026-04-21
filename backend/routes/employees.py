from flask import Blueprint, request, jsonify
from extensions import db, bcrypt
from models import Employee, User
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

employee_bp = Blueprint('employees', __name__)

@employee_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_employee():
    user_id = get_jwt_identity()
    employee = Employee.objects(user_id=user_id).first()
    if not employee:
        return jsonify({'error': 'Employee record not found'}), 404
    return jsonify({
        'id': str(employee.id),
        'name': employee.name,
        'role': employee.role,
        'department': employee.department,
        'salary': employee.salary,
        'status': employee.status,
        'bank_account_number': employee.bank_account_number,
        'bank_ifsc': employee.bank_ifsc,
        'bank_name': employee.bank_name
    }), 200

@employee_bp.route('/', methods=['GET'])
@jwt_required()
def get_employees():
    employees = Employee.objects.all()
    result = []
    for emp in employees:
        result.append({
            'id': str(emp.id),
            'user_id': str(emp.user_id.id),
            'name': emp.name,
            'role': emp.role,
            'department': emp.department,
            'salary': emp.salary,
            'status': emp.status,
            'bank_account_number': emp.bank_account_number,
            'bank_ifsc': emp.bank_ifsc,
            'bank_name': emp.bank_name
        })
    return jsonify(result), 200

@employee_bp.route('/', methods=['POST'])
@jwt_required()
def add_employee():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    name = data.get('name')
    role = data.get('role', 'Developer')
    department = data.get('department', 'Engineering')
    salary = data.get('salary', 0)
    email = data.get('email')
    password = data.get('password', 'employee123')
    user_role = data.get('user_role', 'employee')
    
    bank_account_number = data.get('bank_account_number', '')
    bank_ifsc = data.get('bank_ifsc', '')
    bank_name = data.get('bank_name', '')

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    # Create a User account for the employee
    if User.objects(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(name=name, email=email, password=hashed_password, role=user_role, is_verified=True)
    new_user.save()

    employee = Employee(
        user_id=new_user,
        name=name,
        role=role,
        department=department,
        salary=salary,
        bank_account_number=bank_account_number,
        bank_ifsc=bank_ifsc,
        bank_name=bank_name
    )
    employee.save()

    return jsonify({
        'id': str(employee.id),
        'user_id': str(employee.user_id.id),
        'name': employee.name,
        'role': employee.role,
        'department': employee.department,
        'salary': employee.salary,
        'bank_account_number': employee.bank_account_number,
        'bank_ifsc': employee.bank_ifsc,
        'bank_name': employee.bank_name
    }), 201

@employee_bp.route('/<string:id>', methods=['PUT'])
@jwt_required()
def update_employee(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    employee = Employee.objects(id=id).first()
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
        
    data = request.get_json()

    employee.name = data.get('name', employee.name)
    employee.role = data.get('role', employee.role)
    employee.department = data.get('department', employee.department)
    employee.salary = data.get('salary', employee.salary)
    employee.status = data.get('status', employee.status)
    
    employee.bank_account_number = data.get('bank_account_number', employee.bank_account_number)
    employee.bank_ifsc = data.get('bank_ifsc', employee.bank_ifsc)
    employee.bank_name = data.get('bank_name', employee.bank_name)

    employee.save()

    return jsonify({
        'id': str(employee.id),
        'name': employee.name,
        'role': employee.role,
        'department': employee.department,
        'salary': employee.salary,
        'status': employee.status
    }), 200

@employee_bp.route('/<string:id>', methods=['DELETE'])
@jwt_required()
def delete_employee(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    employee = Employee.objects(id=id).first()
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
        
    # Also delete the associated user?
    user = employee.user_id
    employee.delete()
    if user:
        user.delete()

    return jsonify({'message': 'Employee deleted successfully'}), 200
