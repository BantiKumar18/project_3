const { useState, useEffect, useRef, useCallback } = React;
const { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, getDefaultKeyBinding } = Draft;

// API service
const api = {
    async getDocuments() {
        const response = await axios.get('/api/documents');
        return response.data;
    },
    
    async createDocument(title) {
        const response = await axios.post('/api/documents', { title });
        return response.data;
    },
    
    async getDocument(id) {
        const response = await axios.get(`/api/documents/${id}`);
        return response.data;
    },
    
    async updateDocument(id, data) {
        const response = await axios.put(`/api/documents/${id}`, data);
        return response.data;
    },
    
    async deleteDocument(id) {
        const response = await axios.delete(`/api/documents/${id}`);
        return response.data;
    },
    
    async getCollaborators(id) {
        const response = await axios.get(`/api/documents/${id}/collaborators`);
        return response.data;
    },
    
    async shareDocument(id) {
        const response = await axios.post(`/api/documents/${id}/share`);
        return response.data;
    }
};

// Toolbar component
function EditorToolbar({ editorState, onChange }) {
    const handleStyleClick = (style, type) => {
        if (type === 'block') {
            onChange(RichUtils.toggleBlockType(editorState, style));
        } else {
            onChange(RichUtils.toggleInlineStyle(editorState, style));
        }
    };

    const currentStyle = editorState.getCurrentInlineStyle();
    const selection = editorState.getSelection();
    const blockType = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getStartKey())
        .getType();

    return (
        <div className="editor-toolbar">
            <button
                className={`toolbar-button ${currentStyle.has('BOLD') ? 'active' : ''}`}
                onClick={() => handleStyleClick('BOLD', 'inline')}
                title="Bold"
            >
                <i className="fas fa-bold"></i>
            </button>
            <button
                className={`toolbar-button ${currentStyle.has('ITALIC') ? 'active' : ''}`}
                onClick={() => handleStyleClick('ITALIC', 'inline')}
                title="Italic"
            >
                <i className="fas fa-italic"></i>
            </button>
            <button
                className={`toolbar-button ${currentStyle.has('UNDERLINE') ? 'active' : ''}`}
                onClick={() => handleStyleClick('UNDERLINE', 'inline')}
                title="Underline"
            >
                <i className="fas fa-underline"></i>
            </button>
            <div className="vr mx-2"></div>
            <button
                className={`toolbar-button ${blockType === 'unordered-list-item' ? 'active' : ''}`}
                onClick={() => handleStyleClick('unordered-list-item', 'block')}
                title="Bullet List"
            >
                <i className="fas fa-list-ul"></i>
            </button>
            <button
                className={`toolbar-button ${blockType === 'ordered-list-item' ? 'active' : ''}`}
                onClick={() => handleStyleClick('ordered-list-item', 'block')}
                title="Numbered List"
            >
                <i className="fas fa-list-ol"></i>
            </button>
            <button
                className={`toolbar-button ${blockType === 'header-one' ? 'active' : ''}`}
                onClick={() => handleStyleClick('header-one', 'block')}
                title="Heading 1"
            >
                H1
            </button>
            <button
                className={`toolbar-button ${blockType === 'header-two' ? 'active' : ''}`}
                onClick={() => handleStyleClick('header-two', 'block')}
                title="Heading 2"
            >
                H2
            </button>
        </div>
    );
}

// Collaborator indicator component
function CollaboratorIndicator({ collaborator }) {
    return (
        <div 
            className={`collaborator-indicator ${collaborator.active ? 'active-collaborator' : ''}`}
            style={{ backgroundColor: collaborator.color + '20', color: collaborator.color }}
        >
            <div 
                className="collaborator-avatar"
                style={{ backgroundColor: collaborator.color }}
            >
                {collaborator.name.charAt(0)}
            </div>
            <span>{collaborator.name}</span>
            {collaborator.active && <i className="fas fa-circle text-success" style={{ fontSize: '0.5rem' }}></i>}
        </div>
    );
}

// Document editor component
function DocumentEditor({ document, onSave, onTitleChange }) {
    const [editorState, setEditorState] = useState(() => {
        if (document && document.content) {
            try {
                const contentState = convertFromRaw(JSON.parse(document.content));
                return EditorState.createWithContent(contentState);
            } catch (error) {
                console.warn('Failed to parse document content:', error);
                return EditorState.createEmpty();
            }
        }
        return EditorState.createEmpty();
    });
    
    const [collaborators, setCollaborators] = useState([]);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef(null);

    useEffect(() => {
        if (document && document.id) {
            loadCollaborators();
            const interval = setInterval(loadCollaborators, 3000); // Simulate real-time updates
            return () => clearInterval(interval);
        }
    }, [document?.id]);

    useEffect(() => {
        if (document && document.content) {
            try {
                const contentState = convertFromRaw(JSON.parse(document.content));
                setEditorState(EditorState.createWithContent(contentState));
            } catch (error) {
                console.warn('Failed to parse document content:', error);
                setEditorState(EditorState.createEmpty());
            }
        } else {
            setEditorState(EditorState.createEmpty());
        }
    }, [document?.content]);

    const loadCollaborators = async () => {
        if (!document?.id) return;
        
        try {
            const data = await api.getCollaborators(document.id);
            setCollaborators(data.collaborators);
        } catch (error) {
            console.error('Failed to load collaborators:', error);
            setCollaborators([]);
        }
    };

    const handleEditorChange = (newEditorState) => {
        setEditorState(newEditorState);
        
        // Auto-save after 1 second of inactivity
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            saveDocument(newEditorState);
        }, 1000);
    };

    const saveDocument = async (currentEditorState = editorState) => {
        if (!document?.id) return;
        
        setSaving(true);
        try {
            const contentState = currentEditorState.getCurrentContent();
            const content = JSON.stringify(convertToRaw(contentState));
            await onSave({ content });
        } catch (error) {
            console.error('Failed to save document:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyCommand = (command, editorState) => {
        const newState = RichUtils.handleKeyCommand(editorState, command);
        
        if (newState) {
            setEditorState(newState);
            return 'handled';
        }
        
        return 'not-handled';
    };

    const mapKeyToEditorCommand = (e) => {
        if (e.keyCode === 9) { // Tab
            const newEditorState = RichUtils.onTab(
                e,
                editorState,
                4, // max depth
            );
            if (newEditorState !== editorState) {
                setEditorState(newEditorState);
            }
            return;
        }
        return getDefaultKeyBinding(e);
    };

    return (
        <div className="h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <input
                    type="text"
                    className="form-control form-control-lg border-0 bg-transparent"
                    value={document.title || ''}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Document title..."
                    style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                />
                <div className="d-flex align-items-center gap-2">
                    {saving && (
                        <div className="d-flex align-items-center text-muted">
                            <div className="loading-spinner me-2"></div>
                            <small>Saving...</small>
                        </div>
                    )}
                    <small className="text-muted">
                        {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
                    </small>
                </div>
            </div>

            {collaborators.length > 0 && (
                <div className="mb-3">
                    {collaborators.map((collaborator) => (
                        <CollaboratorIndicator 
                            key={collaborator.id} 
                            collaborator={collaborator} 
                        />
                    ))}
                </div>
            )}

            <div className="document-editor">
                <EditorToolbar editorState={editorState} onChange={setEditorState} />
                <div className="editor-content" onClick={() => editorRef.current?.focus()}>
                    <Editor
                        ref={editorRef}
                        editorState={editorState}
                        onChange={handleEditorChange}
                        handleKeyCommand={handleKeyCommand}
                        keyBindingFn={mapKeyToEditorCommand}
                        placeholder="Start writing your document..."
                        spellCheck={true}
                    />
                </div>
            </div>
        </div>
    );
}

// Document list component
function DocumentList({ documents, currentDocument, onDocumentSelect, onDocumentCreate, onDocumentDelete }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!newDocTitle.trim()) return;
        
        setCreating(true);
        try {
            const newDoc = await onDocumentCreate(newDocTitle.trim());
            onDocumentSelect(newDoc);
            setNewDocTitle('');
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create document:', error);
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleDateString();
    };

    return (
        <div className="h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Documents</h5>
                <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateModal(true)}
                >
                    <i className="fas fa-plus me-1"></i>
                    New
                </button>
            </div>

            <div className="list-group">
                {documents.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-file-alt fa-2x mb-2"></i>
                        <p>No documents yet. Create your first document to get started.</p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={`list-group-item document-list-item ${
                                currentDocument?.id === doc.id ? 'active' : ''
                            }`}
                            onClick={() => onDocumentSelect(doc)}
                        >
                            <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                    <h6 className="mb-1">{doc.title}</h6>
                                    <small className="text-muted">
                                        Updated {formatDate(doc.updated_at)}
                                    </small>
                                    {doc.collaborators > 0 && (
                                        <div className="mt-1">
                                            <small className="badge bg-secondary">
                                                {doc.collaborators} collaborator{doc.collaborators !== 1 ? 's' : ''}
                                            </small>
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this document?')) {
                                            onDocumentDelete(doc.id);
                                        }
                                    }}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Document Modal */}
            <div className={`modal fade ${showCreateModal ? 'show' : ''}`} 
                 style={{ display: showCreateModal ? 'block' : 'none' }}
                 tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Create New Document</h5>
                            <button 
                                type="button" 
                                className="btn-close"
                                onClick={() => setShowCreateModal(false)}
                            ></button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Document title"
                                value={newDocTitle}
                                onChange={(e) => setNewDocTitle(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={handleCreate}
                                disabled={!newDocTitle.trim() || creating}
                            >
                                {creating ? (
                                    <>
                                        <div className="loading-spinner me-2"></div>
                                        Creating...
                                    </>
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showCreateModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
}

// Share modal component
function ShareModal({ document, show, onHide }) {
    const [shareLink, setShareLink] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && document?.id) {
            generateShareLink();
        }
    }, [show, document?.id]);

    const generateShareLink = async () => {
        setLoading(true);
        try {
            const data = await api.shareDocument(document.id);
            setShareLink(data.share_link);
        } catch (error) {
            console.error('Failed to generate share link:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        // You could add a toast notification here
    };

    return (
        <div className={`modal fade ${show ? 'show' : ''}`} 
             style={{ display: show ? 'block' : 'none' }}
             tabIndex="-1">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Share Document</h5>
                        <button 
                            type="button" 
                            className="btn-close"
                            onClick={onHide}
                        ></button>
                    </div>
                    <div className="modal-body">
                        <p>Share this link with others to collaborate on "{document?.title}":</p>
                        {loading ? (
                            <div className="text-center py-3">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : (
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control share-link-input"
                                    value={shareLink}
                                    readOnly
                                />
                                <button 
                                    className="btn btn-outline-secondary"
                                    onClick={copyToClipboard}
                                >
                                    <i className="fas fa-copy"></i>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={onHide}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main App component
function App() {
    const [documents, setDocuments] = useState([]);
    const [currentDocument, setCurrentDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        loadDocuments();
        
        // Check if we're viewing a specific document from URL
        const path = window.location.pathname;
        const match = path.match(/\/document\/(.+)/);
        if (match) {
            const docId = match[1];
            loadSpecificDocument(docId);
        }
    }, []);

    const loadDocuments = async () => {
        try {
            const data = await api.getDocuments();
            setDocuments(data.documents);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSpecificDocument = async (docId) => {
        try {
            const doc = await api.getDocument(docId);
            setCurrentDocument(doc);
        } catch (error) {
            console.error('Failed to load document:', error);
        }
    };

    const handleDocumentSelect = async (doc) => {
        try {
            const fullDoc = await api.getDocument(doc.id);
            setCurrentDocument(fullDoc);
            
            // Update URL without page refresh
            window.history.pushState(null, '', `/document/${doc.id}`);
        } catch (error) {
            console.error('Failed to load document:', error);
        }
    };

    const handleDocumentCreate = async (title) => {
        const newDoc = await api.createDocument(title);
        setDocuments([newDoc, ...documents]);
        return newDoc;
    };

    const handleDocumentDelete = async (docId) => {
        try {
            await api.deleteDocument(docId);
            setDocuments(documents.filter(doc => doc.id !== docId));
            
            if (currentDocument?.id === docId) {
                setCurrentDocument(null);
                window.history.pushState(null, '', '/');
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    const handleDocumentSave = async (data) => {
        if (!currentDocument) return;
        
        try {
            const updatedDoc = await api.updateDocument(currentDocument.id, data);
            setCurrentDocument(updatedDoc);
            
            // Update the document in the list
            setDocuments(docs => 
                docs.map(doc => 
                    doc.id === updatedDoc.id ? { ...doc, ...updatedDoc } : doc
                )
            );
        } catch (error) {
            console.error('Failed to save document:', error);
        }
    };

    const handleTitleChange = async (title) => {
        if (!currentDocument) return;
        
        const updatedDoc = { ...currentDocument, title };
        setCurrentDocument(updatedDoc);
        
        // Debounce title updates
        clearTimeout(window.titleUpdateTimeout);
        window.titleUpdateTimeout = setTimeout(() => {
            handleDocumentSave({ title });
        }, 500);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <div className="loading-spinner mb-3" style={{ width: '3rem', height: '3rem' }}></div>
                    <p>Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid vh-100">
            <div className="row h-100">
                <div className="col-md-3 sidebar p-3">
                    <DocumentList
                        documents={documents}
                        currentDocument={currentDocument}
                        onDocumentSelect={handleDocumentSelect}
                        onDocumentCreate={handleDocumentCreate}
                        onDocumentDelete={handleDocumentDelete}
                    />
                </div>
                
                <div className="col-md-9 main-content p-3">
                    {currentDocument ? (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb mb-0">
                                        <li className="breadcrumb-item">
                                            <button 
                                                className="btn btn-link p-0 text-decoration-none"
                                                onClick={() => {
                                                    setCurrentDocument(null);
                                                    window.history.pushState(null, '', '/');
                                                }}
                                            >
                                                Documents
                                            </button>
                                        </li>
                                        <li className="breadcrumb-item active" aria-current="page">
                                            {currentDocument.title}
                                        </li>
                                    </ol>
                                </nav>
                                
                                <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => setShowShareModal(true)}
                                >
                                    <i className="fas fa-share-alt me-1"></i>
                                    Share
                                </button>
                            </div>
                            
                            <DocumentEditor
                                document={currentDocument}
                                onSave={handleDocumentSave}
                                onTitleChange={handleTitleChange}
                            />
                        </>
                    ) : (
                        <div className="d-flex justify-content-center align-items-center h-100">
                            <div className="text-center">
                                <i className="fas fa-file-alt fa-4x text-muted mb-3"></i>
                                <h4>Welcome to Collaborative Editor</h4>
                                <p className="text-muted">
                                    Select a document from the sidebar or create a new one to start editing.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <ShareModal
                document={currentDocument}
                show={showShareModal}
                onHide={() => setShowShareModal(false)}
            />
        </div>
    );
}

// Render the app with React 18 createRoot
const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);
