import os
import logging
from flask import Flask
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Enable CORS for all routes
CORS(app)

# In-memory storage for documents
documents = {}
document_collaborators = {}
mock_users = [
    {"id": 1, "name": "Alice Johnson", "color": "#FF6B6B"},
    {"id": 2, "name": "Bob Smith", "color": "#4ECDC4"},
    {"id": 3, "name": "Charlie Brown", "color": "#45B7D1"},
    {"id": 4, "name": "Diana Prince", "color": "#96CEB4"},
]

# Import routes
from routes import *

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
