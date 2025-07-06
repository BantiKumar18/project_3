import uuid
import random
import time
from flask import jsonify, request, send_from_directory
from app import app, documents, document_collaborators, mock_users

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get all documents"""
    try:
        doc_list = []
        for doc_id, doc in documents.items():
            doc_list.append({
                'id': doc_id,
                'title': doc.get('title', 'Untitled Document'),
                'created_at': doc.get('created_at'),
                'updated_at': doc.get('updated_at'),
                'collaborators': len(document_collaborators.get(doc_id, []))
            })
        return jsonify({'documents': doc_list})
    except Exception as e:
        app.logger.error(f"Error getting documents: {str(e)}")
        return jsonify({'error': 'Failed to retrieve documents'}), 500

@app.route('/api/documents', methods=['POST'])
def create_document():
    """Create a new document"""
    try:
        data = request.get_json()
        title = data.get('title', 'Untitled Document')
        
        doc_id = str(uuid.uuid4())
        timestamp = time.time()
        
        documents[doc_id] = {
            'id': doc_id,
            'title': title,
            'content': '',
            'created_at': timestamp,
            'updated_at': timestamp
        }
        
        document_collaborators[doc_id] = random.sample(mock_users, random.randint(1, 3))
        
        return jsonify(documents[doc_id]), 201
    except Exception as e:
        app.logger.error(f"Error creating document: {str(e)}")
        return jsonify({'error': 'Failed to create document'}), 500

@app.route('/api/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get a specific document"""
    try:
        if doc_id not in documents:
            return jsonify({'error': 'Document not found'}), 404
        
        doc = documents[doc_id].copy()
        doc['collaborators'] = document_collaborators.get(doc_id, [])
        
        return jsonify(doc)
    except Exception as e:
        app.logger.error(f"Error getting document {doc_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve document'}), 500

@app.route('/api/documents/<doc_id>', methods=['PUT'])
def update_document(doc_id):
    """Update a document"""
    try:
        if doc_id not in documents:
            return jsonify({'error': 'Document not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            documents[doc_id]['title'] = data['title']
        
        if 'content' in data:
            documents[doc_id]['content'] = data['content']
        
        documents[doc_id]['updated_at'] = time.time()
        
        return jsonify(documents[doc_id])
    except Exception as e:
        app.logger.error(f"Error updating document {doc_id}: {str(e)}")
        return jsonify({'error': 'Failed to update document'}), 500

@app.route('/api/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete a document"""
    try:
        if doc_id not in documents:
            return jsonify({'error': 'Document not found'}), 404
        
        del documents[doc_id]
        if doc_id in document_collaborators:
            del document_collaborators[doc_id]
        
        return jsonify({'message': 'Document deleted successfully'})
    except Exception as e:
        app.logger.error(f"Error deleting document {doc_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete document'}), 500

@app.route('/api/documents/<doc_id>/collaborators', methods=['GET'])
def get_collaborators(doc_id):
    """Get mock collaborators for a document"""
    try:
        if doc_id not in documents:
            return jsonify({'error': 'Document not found'}), 404
        
        collaborators = document_collaborators.get(doc_id, [])
        
        # Add mock activity for demonstration
        for collaborator in collaborators:
            collaborator['active'] = random.choice([True, False])
            if collaborator['active']:
                collaborator['cursor_position'] = random.randint(0, len(documents[doc_id].get('content', '')))
        
        return jsonify({'collaborators': collaborators})
    except Exception as e:
        app.logger.error(f"Error getting collaborators for {doc_id}: {str(e)}")
        return jsonify({'error': 'Failed to retrieve collaborators'}), 500

@app.route('/api/documents/<doc_id>/share', methods=['POST'])
def share_document(doc_id):
    """Generate a shareable link for a document"""
    try:
        if doc_id not in documents:
            return jsonify({'error': 'Document not found'}), 404
        
        share_link = f"{request.host_url}document/{doc_id}"
        
        return jsonify({
            'share_link': share_link,
            'document_id': doc_id
        })
    except Exception as e:
        app.logger.error(f"Error sharing document {doc_id}: {str(e)}")
        return jsonify({'error': 'Failed to generate share link'}), 500

@app.route('/document/<doc_id>')
def shared_document(doc_id):
    """Serve the editor for a shared document"""
    return send_from_directory('static', 'index.html')
