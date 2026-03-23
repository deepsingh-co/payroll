import requests
import sys

BASE_URL = 'http://127.0.0.1:5000/api'

def test():
    print("Testing backend connectivity...")
    try:
        # 1. Health check
        h = requests.get(f'{BASE_URL}/health')
        print(f"Health: {h.status_code} {h.json()}")

        # 2. Login Admin (from seed)
        print("Testing Admin Login (admin@company.com)...")
        l = requests.post(f'{BASE_URL}/auth/login', json={
            'email': 'admin@company.com',
            'password': 'admin123'
        })
        print(f"Login: {l.status_code} {l.json()}")
        if l.status_code != 200:
            print("FAILED TO LOGIN AS ADMIN")
            return

        token = l.json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # 3. Get Employees
        print("Fetching Employees...")
        e = requests.get(f'{BASE_URL}/employees/', headers=headers)
        print(f"Employees: {e.status_code} count={len(e.json())}")

        # 4. Get Teams
        print("Fetching Teams...")
        t = requests.get(f'{BASE_URL}/teams/', headers=headers)
        print(f"Teams: {t.status_code} count={len(t.json())}")

        # 5. Get Tasks
        print("Fetching Tasks...")
        tk = requests.get(f'{BASE_URL}/tasks/', headers=headers)
        print(f"Tasks: {tk.status_code} count={len(tk.json())}")

        print("\n[SUCCESS] Backend is fully functional.")
    except Exception as err:
        print(f"\n[ERROR] test failed: {err}")

if __name__ == '__main__':
    test()
