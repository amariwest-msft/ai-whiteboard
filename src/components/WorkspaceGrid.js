import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkspaceGrid = ({ workspaces, onCreateWorkspace, onSelectWorkspace, onDeleteWorkspace }) => {
  return (
    <div className="workspace-container" style={{ padding: '20px' }}>
      <h2>My Workspaces</h2>
      <div className="workspace-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        {/* New workspace button */}
        <div 
          className="workspace-card new-workspace"
          onClick={onCreateWorkspace}
          style={{ 
            height: '150px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '48px',
            border: '2px dashed #ccc'
          }}
        >
          <div>+</div>
        </div>

        {/* Existing workspaces */}
        {workspaces.map(workspace => (
          <div 
            key={workspace.id}
            className="workspace-card"
            onClick={() => onSelectWorkspace(workspace.id)}
            style={{ 
              height: '150px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #ddd',
              padding: '10px',
              position: 'relative',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            {/* Workspace thumbnail */}
            {workspace.thumbnail && (
              <div style={{ 
                width: '100%', 
                height: '100px', 
                backgroundImage: `url(${workspace.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '10px',
                borderRadius: '4px'
              }} />
            )}
            
            {/* Workspace title */}
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{workspace.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {new Date(workspace.lastModified).toLocaleString()}
            </div>
            
            {/* Delete button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteWorkspace(workspace.id);
              }}
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                background: 'rgba(255,255,255,0.7)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceGrid;