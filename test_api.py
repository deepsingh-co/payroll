import requests

BASE_URL = 'http://127.0.0.1:5000/api'

def test_health():
    res = requests.get(f'{BASE_URL}/health')
    print('Health:', res.json())

def test_register_login():
    # Register Admin
    res = requests.post(f'{BASE_URL}/auth/register', json={
        'name': 'Admin User',
        'email': 'admin@test.com',
        'password': 'password123',
        'role': 'admin'
    })
    print('Register:', res.json())
    
    # Login Admin
    res = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'admin@test.com',
        'password': 'password123'
    })
    print('Login:', res.json())
    token = res.json().get('token')
    return token

def test_add_employee(token):
    headers = {'Authorization': f'Bearer {token}'}
    res = requests.post(f'{BASE_URL}/employees/', json={
        'user_id': 1,
        'name': 'Admin Employee',
        'role': 'Manager',
        'department': 'HR',
        'salary': 100000
    }, headers=headers)
    print('Add Employee:', res.json())
    return res.json().get('id')

if __name__ == '__main__':
    try:
        test_health()
        token = test_register_login()
        if token:
            test_add_employee(token)
    except Exception as e:
        print(f"Test failed: {e}")
