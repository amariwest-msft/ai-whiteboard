import React, { useState, useEffect } from 'react';
import Whiteboard from './components/Whiteboard';
import WorkspaceGrid from './components/WorkspaceGrid';
import { v4 as uuidv4 } from 'uuid';

const App = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load workspaces from local storage
  useEffect(() => {
    const loadWorkspaces = () => {
      const savedWorkspaces = localStorage.getItem('aibrainstorming-workspaces');
      if (savedWorkspaces) {
        try {
          setWorkspaces(JSON.parse(savedWorkspaces));
        } catch (e) {
          console.error('Error loading workspaces:', e);
          setWorkspaces([]);
        }
      }
      setIsLoading(false);
    };
    
    loadWorkspaces();
  }, []);

  // Save workspaces to local storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('aibrainstorming-workspaces', JSON.stringify(workspaces));
      } catch (e) {
        console.error("Storage quota exceeded. Implementing cleanup strategy...");
        
        // Cleanup strategy: Keep newest workspaces, reduce thumbnail quality for others
        const compressWorkspaces = [...workspaces].map(workspace => {
          // Create a smaller thumbnail for older workspaces
          if (workspace.thumbnail && workspace.thumbnail.length > 10000) {
            const img = new Image();
            img.src = workspace.thumbnail;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100; // Smaller thumbnail
            canvas.height = 75;
            
            // Draw image at reduced size
            ctx.drawImage(img, 0, 0, 100, 75);
            
            // Create extremely compressed thumbnail
            workspace.thumbnail = canvas.toDataURL('image/jpeg', 0.1);
          }
          return workspace;
        });
        
        try {
          localStorage.setItem('aibrainstorming-workspaces', JSON.stringify(compressWorkspaces));
        } catch (e2) {
          // If still failing, keep only the most recent 3 workspaces
          console.error("Still exceeding quota. Keeping only recent workspaces.");
          
          const sortedWorkspaces = [...compressWorkspaces].sort((a, b) => {
            return new Date(b.lastModified) - new Date(a.lastModified);
          });
          
          // Keep only the most recent 3 workspaces
          const reducedWorkspaces = sortedWorkspaces.slice(0, 3);
          
          try {
            localStorage.setItem('aibrainstorming-workspaces', JSON.stringify(reducedWorkspaces));
            alert("Storage limit reached. Only keeping your 3 most recent workspaces.");
          } catch (e3) {
            alert("Unable to save workspaces. Storage quota exceeded.");
          }
        }
      }
    }
  }, [workspaces, isLoading]);

  // Create new workspace
  const handleCreateWorkspace = () => {
    const newWorkspace = {
      id: uuidv4(),
      name: `Workspace ${workspaces.length + 1}`,
      lastModified: new Date().toISOString(),
      thumbnail: null,
      data: null
    };
    setActiveWorkspace(newWorkspace);
  };

  // Select and open existing workspace
  const handleSelectWorkspace = (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
    }
  };

  // Save workspace
  const handleSaveWorkspace = (updatedWorkspace) => {
    setWorkspaces(prevWorkspaces => {
      const existingIndex = prevWorkspaces.findIndex(w => w.id === updatedWorkspace.id);
      
      if (existingIndex >= 0) {
        // Update existing workspace
        const updated = [...prevWorkspaces];
        updated[existingIndex] = updatedWorkspace;
        return updated;
      } else {
        // Add new workspace
        return [...prevWorkspaces, updatedWorkspace];
      }
    });
    
    // Update active workspace
    setActiveWorkspace(updatedWorkspace);
    
    // Show confirmation
    alert("Workspace saved successfully!");
  };

  // Delete workspace
  const handleDeleteWorkspace = (workspaceId) => {
    if (window.confirm('Are you sure you want to delete this workspace?')) {
      setWorkspaces(prevWorkspaces => prevWorkspaces.filter(w => w.id !== workspaceId));
    }
  };

  // Navigate back to workspace grid
  const handleNavigateBack = () => {
    setActiveWorkspace(null);
  };

  if (isLoading) {
    return <div>Loading workspaces...</div>;
  }

  return (
    <div>
      {activeWorkspace ? (
        <Whiteboard 
          workspaceId={activeWorkspace.id}
          onSaveWorkspace={handleSaveWorkspace}
          onNavigateBack={handleNavigateBack}
          initialData={activeWorkspace}
        />
      ) : (
        <WorkspaceGrid 
          workspaces={workspaces}
          onCreateWorkspace={handleCreateWorkspace}
          onSelectWorkspace={handleSelectWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
        />
      )}
    </div>
  );
};

export default App;