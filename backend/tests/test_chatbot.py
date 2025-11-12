"""
Test chatbot module-based restriction

Note: These tests verify the authentication and module validation logic.
Full integration tests would require a running LLM service (Ollama/Gmini).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock faiss, numpy and sentence_transformers to avoid import errors
import numpy as np
sys.modules['faiss'] = type('MockFaiss', (), {'read_index': lambda x: type('MockIndex', (), {'search': lambda self, q, k: ([0], [[0]])})()})()
sys.modules['sentence_transformers'] = type('MockST', (), {'SentenceTransformer': lambda x: type('MockModel', (), {'encode': lambda self, texts, **kwargs: np.array([[0.0]])})()})()
sys.modules['numpy'] = np

from app import create_app
from extensions import db
from models.user import User
from werkzeug.security import generate_password_hash
import json

def test_chatbot_requires_jwt():
    """Test that chatbot endpoint requires JWT authentication"""
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        # Try to access chatbot without JWT
        response = client.post('/api/chatbot/respond', 
                              json={'prompt': 'Test question'},
                              content_type='application/json')
        
        # Should return 401 Unauthorized
        assert response.status_code == 401
        print("✓ Chatbot requires JWT authentication")

def test_chatbot_requires_modules():
    """Test that chatbot requires user to have modules"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        
        # Create a test user with no modules
        user = User(
            username='testuser',
            email='test@test.com',
            password_hash=generate_password_hash('password'),
            modules_in_progress='[]',
            completed_modules='[]'
        )
        db.session.add(user)
        db.session.commit()
        
        with app.test_client() as client:
            # Login to get JWT token
            login_response = client.post('/auth/login',
                                        json={'username': 'testuser', 'password': 'password'},
                                        content_type='application/json')
            
            assert login_response.status_code == 200
            token = login_response.json['access_token']
            
            # Try to use chatbot with no modules
            response = client.post('/api/chatbot/respond',
                                  json={'prompt': 'Test question'},
                                  content_type='application/json',
                                  headers={'Authorization': f'Bearer {token}'})
            
            # Should return 400 with message about no modules
            assert response.status_code == 400
            assert 'modul' in response.json['msg'].lower()
            print("✓ Chatbot requires user to have modules")

def test_chatbot_with_modules():
    """Test that chatbot works when user has modules"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        
        # Create a test user with module 1
        user = User(
            username='testuser2',
            email='test2@test.com',
            password_hash=generate_password_hash('password'),
            modules_in_progress='[1]',
            completed_modules='[]'
        )
        db.session.add(user)
        db.session.commit()
        
        with app.test_client() as client:
            # Login to get JWT token
            login_response = client.post('/auth/login',
                                        json={'username': 'testuser2', 'password': 'password'},
                                        content_type='application/json')
            
            assert login_response.status_code == 200
            token = login_response.json['access_token']
            
            # Try to use chatbot with module 1
            # Note: This might fail if OLLAMA_URL is not configured, but we just check it gets past auth
            response = client.post('/api/chatbot/respond',
                                  json={'prompt': 'Ce este celula?'},
                                  content_type='application/json',
                                  headers={'Authorization': f'Bearer {token}'})
            
            # Should either succeed or fail with model error (not auth error)
            assert response.status_code in [200, 500]
            if response.status_code == 500:
                # If it fails, it should be a model error, not auth error
                assert 'model' in response.json.get('msg', '').lower() or 'error' in response.json
            print("✓ Chatbot works with modules (auth passed)")

def test_chatbot_validates_module_access():
    """Test that chatbot validates user can only access their modules"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        
        # Create a test user with only module 1
        user = User(
            username='testuser3',
            email='test3@test.com',
            password_hash=generate_password_hash('password'),
            modules_in_progress='[1]',
            completed_modules='[]'
        )
        db.session.add(user)
        db.session.commit()
        
        with app.test_client() as client:
            # Login to get JWT token
            login_response = client.post('/auth/login',
                                        json={'username': 'testuser3', 'password': 'password'},
                                        content_type='application/json')
            
            assert login_response.status_code == 200
            token = login_response.json['access_token']
            
            # Try to access module 5 which user doesn't have
            response = client.post('/api/chatbot/respond',
                                  json={'prompt': 'Test', 'module': 5},
                                  content_type='application/json',
                                  headers={'Authorization': f'Bearer {token}'})
            
            # Should return 403 Forbidden
            assert response.status_code == 403
            assert 'disponibil' in response.json.get('msg', '').lower()
            print("✓ Chatbot validates module access")

if __name__ == '__main__':
    print("Running chatbot tests...\n")
    test_chatbot_requires_jwt()
    test_chatbot_requires_modules()
    test_chatbot_with_modules()
    test_chatbot_validates_module_access()
    print("\n✓ All tests passed!")
