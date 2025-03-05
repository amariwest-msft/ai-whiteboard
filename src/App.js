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
      localStorage.setItem('aibrainstorming-workspaces', JSON.stringify(workspaces));
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