# Collaborative Document Editor

## Overview

This is a web-based collaborative document editor built with Flask (Python backend) and React (frontend). The application allows users to create, edit, and share documents with real-time collaboration features. The system uses an in-memory storage approach for simplicity and includes mock user data for demonstration purposes.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with vanilla JavaScript (no build process)
- **Rich Text Editor**: Draft.js for document editing capabilities
- **UI Framework**: Bootstrap 5 with dark theme
- **HTTP Client**: Axios for API communication
- **Styling**: CSS with Bootstrap variables for theming

### Backend Architecture
- **Framework**: Flask (Python)
- **Storage**: In-memory dictionaries for documents and collaborators
- **CORS**: Flask-CORS for cross-origin requests
- **API Design**: RESTful endpoints for document management

### Data Storage
- **Primary Storage**: In-memory Python dictionaries
- **Document Storage**: `documents = {}` - stores document metadata and content
- **Collaborator Storage**: `document_collaborators = {}` - manages user associations
- **Mock Data**: Predefined user list with names and colors for collaboration simulation

## Key Components

### Backend Components
1. **app.py**: Main Flask application setup with CORS configuration
2. **routes.py**: API endpoint definitions for document operations
3. **main.py**: Application entry point

### Frontend Components
1. **index.html**: Single-page application shell with CDN dependencies
2. **app.js**: React application with editor components and API integration
3. **style.css**: Custom styling for editor interface and collaboration features

### Core Features
- Document creation and listing
- Rich text editing with Draft.js
- Mock collaboration indicators
- Responsive dark-themed UI

## Data Flow

1. **Document Creation**: Frontend sends POST request → Backend generates UUID → Document stored in memory
2. **Document Retrieval**: Frontend requests document list → Backend returns formatted document metadata
3. **Collaboration Simulation**: Random mock users assigned to documents for demonstration
4. **Editor State**: Draft.js manages rich text state on frontend

## External Dependencies

### Frontend CDN Dependencies
- React 18 (development build)
- Draft.js 0.11.7 for rich text editing
- Bootstrap 5.3.0 for UI components
- Font Awesome 6.0.0 for icons
- Axios for HTTP requests
- Babel Standalone for JSX transformation
- Immutable.js for Draft.js compatibility

### Backend Dependencies
- Flask for web framework
- Flask-CORS for cross-origin support

## Deployment Strategy

- **Development Mode**: Flask runs with debug=True on all interfaces (0.0.0.0:5000)
- **Static Files**: Served directly by Flask from /static directory
- **Environment Variables**: SESSION_SECRET for Flask session management
- **Logging**: Debug-level logging enabled for development

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 04, 2025. Initial setup

## Notes for Development

- The application currently uses in-memory storage, making it suitable for development but not production-ready
- Mock users and collaboration features are simulated for demonstration purposes
- The frontend uses CDN-delivered libraries without a build process for simplicity
- Real-time collaboration features are mocked and would require WebSocket implementation for production use