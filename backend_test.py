#!/usr/bin/env python3
"""
TDAH Companion Backend API Tests
Tests all backend endpoints for the TDAH Companion application
"""
import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TDAHBackendTester:
    def __init__(self, base_url="https://demobackend.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(test_name)
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {}, 0
                
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
                
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        success, data, status = self.make_request('GET', 'health')
        
        if success and status == 200:
            if 'status' in data and data['status'] == 'healthy':
                self.log_result("Health Check", True)
                return True
            else:
                self.log_result("Health Check", False, f"Invalid response format: {data}")
        else:
            self.log_result("Health Check", False, f"Status {status}: {data}")
        return False
    
    def test_tasks_crud(self):
        """Test complete CRUD operations for tasks"""
        test_user_id = "test_user_123"
        
        # 1. Create a task
        task_data = {
            "text": "Test task for TDAH app",
            "priority": "high",
            "quadrant": 1,
            "user_id": test_user_id
        }
        
        success, data, status = self.make_request('POST', 'tasks', task_data)
        if not success or status != 200:
            self.log_result("Create Task", False, f"Status {status}: {data}")
            return False
        
        if 'id' not in data:
            self.log_result("Create Task", False, "No task ID returned")
            return False
            
        task_id = data['id']
        self.log_result("Create Task", True)
        
        # 2. Get all tasks
        success, data, status = self.make_request('GET', 'tasks')
        if success and status == 200 and isinstance(data, list):
            self.log_result("Get All Tasks", True)
        else:
            self.log_result("Get All Tasks", False, f"Status {status}: {data}")
        
        # 3. Get tasks by user_id
        success, data, status = self.make_request('GET', 'tasks', params={'user_id': test_user_id})
        if success and status == 200 and isinstance(data, list):
            user_tasks = [t for t in data if t.get('user_id') == test_user_id]
            if len(user_tasks) > 0:
                self.log_result("Get Tasks by User", True)
            else:
                self.log_result("Get Tasks by User", False, "No tasks found for user")
        else:
            self.log_result("Get Tasks by User", False, f"Status {status}: {data}")
        
        # 4. Update task
        update_data = {
            "text": "Updated test task",
            "completed": True,
            "priority": "medium"
        }
        
        success, data, status = self.make_request('PUT', f'tasks/{task_id}', update_data)
        if success and status == 200:
            if data.get('text') == update_data['text'] and data.get('completed') == True:
                self.log_result("Update Task", True)
            else:
                self.log_result("Update Task", False, f"Task not updated correctly: {data}")
        else:
            self.log_result("Update Task", False, f"Status {status}: {data}")
        
        # 5. Delete task
        success, data, status = self.make_request('DELETE', f'tasks/{task_id}')
        if success and status == 200:
            self.log_result("Delete Task", True)
        else:
            self.log_result("Delete Task", False, f"Status {status}: {data}")
        
        return True
    
    def test_mood_tracking(self):
        """Test mood tracking endpoints"""
        test_user_id = "test_user_mood_123"
        
        # Create mood entry
        mood_data = {
            "user_id": test_user_id,
            "mood_level": 4,
            "energy_level": 3,
            "notes": "Feeling good today!"
        }
        
        success, data, status = self.make_request('POST', 'moods', mood_data)
        if success and status == 200:
            if 'id' in data and data.get('mood_level') == 4:
                self.log_result("Create Mood Entry", True)
            else:
                self.log_result("Create Mood Entry", False, f"Invalid mood data: {data}")
        else:
            self.log_result("Create Mood Entry", False, f"Status {status}: {data}")
        
        # Get mood entries
        success, data, status = self.make_request('GET', 'moods', params={'user_id': test_user_id})
        if success and status == 200 and isinstance(data, list):
            self.log_result("Get Mood Entries", True)
        else:
            self.log_result("Get Mood Entries", False, f"Status {status}: {data}")
    
    def test_pomodoro_endpoints(self):
        """Test Pomodoro session endpoints"""
        test_user_id = "test_user_pomodoro_123"
        
        # Create pomodoro session
        session_data = {
            "user_id": test_user_id,
            "duration_minutes": 25,
            "break_minutes": 5,
            "completed": True
        }
        
        success, data, status = self.make_request('POST', 'pomodoro/session', session_data)
        if success and status == 200:
            if 'id' in data and data.get('completed') == True:
                self.log_result("Create Pomodoro Session", True)
            else:
                self.log_result("Create Pomodoro Session", False, f"Invalid session data: {data}")
        else:
            self.log_result("Create Pomodoro Session", False, f"Status {status}: {data}")
        
        # Get pomodoro stats
        success, data, status = self.make_request('GET', 'pomodoro/stats', params={'user_id': test_user_id})
        if success and status == 200:
            required_fields = ['today_sessions', 'today_minutes', 'total_sessions', 'streak']
            if all(field in data for field in required_fields):
                self.log_result("Get Pomodoro Stats", True)
            else:
                self.log_result("Get Pomodoro Stats", False, f"Missing fields in stats: {data}")
        else:
            self.log_result("Get Pomodoro Stats", False, f"Status {status}: {data}")
    
    def test_community_endpoints(self):
        """Test community posts endpoints"""
        test_user_id = "test_user_community_123"
        
        # Create community post
        post_data = {
            "user_id": test_user_id,
            "username": "TestUser",
            "content": "This is a test post for the TDAH community!",
            "category": "tips"
        }
        
        success, data, status = self.make_request('POST', 'community/posts', post_data)
        if success and status == 200:
            if 'id' in data and data.get('content') == post_data['content']:
                post_id = data['id']
                self.log_result("Create Community Post", True)
                
                # Test like post
                success, like_data, like_status = self.make_request('POST', f'community/posts/{post_id}/like')
                if success and like_status == 200:
                    self.log_result("Like Community Post", True)
                else:
                    self.log_result("Like Community Post", False, f"Status {like_status}: {like_data}")
            else:
                self.log_result("Create Community Post", False, f"Invalid post data: {data}")
        else:
            self.log_result("Create Community Post", False, f"Status {status}: {data}")
        
        # Get community posts
        success, data, status = self.make_request('GET', 'community/posts')
        if success and status == 200 and isinstance(data, list):
            self.log_result("Get Community Posts", True)
        else:
            self.log_result("Get Community Posts", False, f"Status {status}: {data}")
        
        # Get posts by category
        success, data, status = self.make_request('GET', 'community/posts', params={'category': 'tips'})
        if success and status == 200 and isinstance(data, list):
            self.log_result("Get Posts by Category", True)
        else:
            self.log_result("Get Posts by Category", False, f"Status {status}: {data}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting TDAH Companion Backend Tests")
        print(f"📡 Testing API at: {self.base_url}")
        print("=" * 50)
        
        # Test health endpoint first
        if not self.test_health_endpoint():
            print("❌ Health check failed - API may be down")
            return False
        
        # Test all endpoints
        self.test_tasks_crud()
        self.test_mood_tracking()
        self.test_pomodoro_endpoints()
        self.test_community_endpoints()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary:")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}/{self.tests_run}")
        
        if self.failed_tests:
            print("\n🔍 Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return success_rate > 80

def main():
    tester = TDAHBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())