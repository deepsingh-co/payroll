import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Imports
    if 'get_jwt_identity' in content and 'get_jwt' not in content:
        content = content.replace('get_jwt_identity', 'get_jwt_identity, get_jwt')
    
    # auth.py specific
    if 'auth.py' in filepath:
        content = content.replace(
            "access_token = create_access_token(identity={'id': user.id, 'role': user.role})",
            "access_token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})"
        )
        content = content.replace(
            "current_user = get_jwt_identity()",
            "current_user_id = get_jwt_identity()"
        )
        content = content.replace(
            "current_user['id']",
            "current_user_id"
        )
        
    # general replacements
    content = content.replace(
        "current_user = get_jwt_identity()",
        "current_user_id = get_jwt_identity()\n    claims = get_jwt()"
    )
    content = content.replace(
        "if current_user.get('role') != 'admin':",
        "if claims.get('role') != 'admin':"
    )
    content = content.replace(
        "current_user.get('role') != 'admin'",
        "claims.get('role') != 'admin'"
    )
    content = content.replace(
        "current_user.get('role') == 'admin'",
        "claims.get('role') == 'admin'"
    )
    content = content.replace(
        "role = current_user.get('role')",
        "role = claims.get('role')"
    )
    content = content.replace(
        "user_id = current_user.get('id')",
        "user_id = current_user_id"
    )
    

    with open(filepath, 'w') as f:
        f.write(content)

base_dir = r"c:\Users\ANURUDH\OneDrive\Desktop\payroll\backend\routes"
for fname in os.listdir(base_dir):
    if fname.endswith('.py'):
        fix_file(os.path.join(base_dir, fname))

print("Fixed")
