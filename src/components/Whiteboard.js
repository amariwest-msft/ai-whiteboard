import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Textbox, PencilBrush } from 'fabric';

// Enhanced toolbar with save and back buttons
const Toolbar = ({ activeMode, setActiveMode, clearCanvas, currentColor, setCurrentColor, onSave, onBack }) => {
  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#f0f0f0', 
      display: 'flex', 
      gap: '10px', 
      alignItems: 'center' 
    }}>
      <button 
        onClick={onBack}
        style={{ marginRight: '10px' }}
      >
        ← Back
      </button>
      <button 
        onClick={() => setActiveMode('select')}
        style={{ 
          backgroundColor: activeMode === 'select' ? '#007bff' : '#ffffff',
          color: activeMode === 'select' ? 'white' : 'black'
        }}
      >
        Select
      </button>
      <button 
        onClick={() => setActiveMode('pen')}
        style={{ 
          backgroundColor: activeMode === 'pen' ? '#007bff' : '#ffffff',
          color: activeMode === 'pen' ? 'white' : 'black'
        }}
      >
        Pen
      </button>
      <button 
        onClick={() => setActiveMode('rectangle')}
        style={{ 
          backgroundColor: activeMode === 'rectangle' ? '#007bff' : '#ffffff',
          color: activeMode === 'rectangle' ? 'white' : 'black'
        }}
      >
        Rectangle
      </button>
      <button 
        onClick={() => setActiveMode('ellipse')}
        style={{ 
          backgroundColor: activeMode === 'ellipse' ? '#007bff' : '#ffffff',
          color: activeMode === 'ellipse' ? 'white' : 'black'
        }}
      >
        Ellipse
      </button>
      <button 
        onClick={() => setActiveMode('text')}
        style={{ 
          backgroundColor: activeMode === 'text' ? '#007bff' : '#ffffff',
          color: activeMode === 'text' ? 'white' : 'black'
        }}
      >
        Text
      </button>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        marginLeft: '10px'
      }}>
        <label htmlFor="colorPicker" style={{ fontSize: '14px' }}>Color:</label>
        <input
          id="colorPicker"
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
          style={{ width: '30px', height: '30px', cursor: 'pointer' }}
        />
      </div>
      <button onClick={clearCanvas}>Clear</button>
      <div style={{ marginLeft: 'auto' }}>
        <button 
          onClick={onSave}
          style={{ 
            backgroundColor: '#28a745', 
            color: 'white',
            border: 'none',
            padding: '5px 15px',
            borderRadius: '4px'
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

const Whiteboard = ({ workspaceId, onSaveWorkspace, onNavigateBack, initialData }) => {
  // Existing state
  const [activeMode, setActiveMode] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  // New state for workspace name
  const [workspaceName, setWorkspaceName] = useState(initialData?.name || "New Workspace");
  
  // Refs
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const currentObjectRef = useRef(null);
  
  // Save workspace with thumbnail
  const handleSave = useCallback(() => {
    if (fabricCanvasRef.current) {
      try {
        // Store objects temporarily to ensure they don't get lost
        const canvasObjects = [...fabricCanvasRef.current.getObjects()];
        
        // Generate thumbnail
        const thumbnail = fabricCanvasRef.current.toDataURL({
          format: 'jpeg',
          quality: 0.2,
          multiplier: 0.3
        });
        
        // Get JSON representation of canvas
        const canvasJSON = fabricCanvasRef.current.toJSON();
        
        // Save workspace
        onSaveWorkspace({
          id: workspaceId,
          name: workspaceName,
          lastModified: new Date().toISOString(),
          thumbnail: thumbnail,
          data: canvasJSON
        });
        
        // Force multiple re-renders to ensure canvas elements are visible
        setTimeout(() => {
          if (fabricCanvasRef.current) {
            // Ensure all objects are still on the canvas
            if (fabricCanvasRef.current.getObjects().length < canvasObjects.length) {
              // If objects were lost, restore them
              canvasObjects.forEach(obj => {
                if (!fabricCanvasRef.current.contains(obj)) {
                  fabricCanvasRef.current.add(obj);
                }
              });
            }
            
            // Multiple render attempts for reliability
            fabricCanvasRef.current.requestRenderAll();
            
            setTimeout(() => {
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.requestRenderAll();
              }
            }, 100);
            
            setTimeout(() => {
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.requestRenderAll();
              }
            }, 500);
          }
        }, 0);
        
      } catch (error) {
        console.error("Error during save:", error);
        // Make sure we still try to render if an error occurs
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.requestRenderAll();
        }
      }
    }
  }, [workspaceId, workspaceName, onSaveWorkspace]);
  
  // Initialize canvas and load data if present
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!fabricCanvasRef.current) {
      const canvas = new Canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        selection: true
      });
      
      fabricCanvasRef.current = canvas;
      
      // Set up brush
      fabricCanvasRef.current.freeDrawingBrush = new PencilBrush(fabricCanvasRef.current);
      fabricCanvasRef.current.freeDrawingBrush.width = 3;
      fabricCanvasRef.current.freeDrawingBrush.color = currentColor;
      
      // Set dimensions
      const updateCanvasSize = () => {
        if (fabricCanvasRef.current) {
          const width = window.innerWidth;
          const height = window.innerHeight - 60 - 46; // Account for toolbar and workspace name input
          fabricCanvasRef.current.setWidth(width);
          fabricCanvasRef.current.setHeight(height);
          
          // Load saved data if available
          if (initialData && initialData.data) {
            fabricCanvasRef.current.loadFromJSON(initialData.data, () => {
              fabricCanvasRef.current.renderAll();
            });
          } else {
            fabricCanvasRef.current.renderAll();
          }
        }
      };
      
      // Run immediately and again after a short delay to ensure DOM is ready
      updateCanvasSize();
      setTimeout(updateCanvasSize, 100);
      setCanvasInitialized(true);
    }
    
    // Handle resize
    const handleResize = () => {
      if (fabricCanvasRef.current && canvasRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight - 60 - 46; // Account for toolbar and workspace name input
        fabricCanvasRef.current.setWidth(width);
        fabricCanvasRef.current.setHeight(height);
        fabricCanvasRef.current.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (fabricCanvasRef.current) {
        const canvas = fabricCanvasRef.current;
        fabricCanvasRef.current = null;
        canvas.dispose();
      }
    };
  }, [initialData]);

  // Add a new effect that ensures the canvas is rendered after it's fully mounted
  useEffect(() => {
    if (canvasInitialized && fabricCanvasRef.current) {
      // Force a re-render of the canvas after initialization
      const renderCanvas = () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.requestRenderAll();
        }
      };
      
      renderCanvas();
      // Try again after a short delay to ensure all elements are loaded
      setTimeout(renderCanvas, 300);
    }
  }, [canvasInitialized]);

  // Update pen color when color changes
  useEffect(() => {
    if (fabricCanvasRef.current && fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = currentColor;
      
      // If there's a selected object, update its color too
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (activeObject) {
        if (activeObject.stroke) {
          activeObject.set({ stroke: currentColor });
        }
        if (activeObject.fill && activeObject.fill !== 'transparent') {
          activeObject.set({ fill: currentColor });
        }
        fabricCanvasRef.current.renderAll();
      }
    }
  }, [currentColor]);

  // Define stable event handlers using useCallback
  const handleMouseDown = useCallback((o) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const pointer = canvas.getPointer(o.e);
    
    // For text tool, handle differently based on whether we clicked an existing text box
    if (activeMode === 'text') {
      // If we clicked on an existing text box, edit it
      if (o.target && o.target instanceof Textbox) {
        canvas.setActiveObject(o.target);
        o.target.enterEditing();
        o.target.selectAll();
        canvas.renderAll();
        return;
      }
      
      // Otherwise create a new text box where the user clicked
      const textbox = new Textbox('Edit this text', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Arial',
        fontSize: 20,
        fill: currentColor, // Use the selected color
        width: 200,
        padding: 5,
        selectable: true,
        evented: true
      });
      
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      textbox.enterEditing();
      textbox.selectAll();
      canvas.renderAll();
      return;
    }
    
    // For other shape tools, proceed as before
    setIsDrawing(true);
    setStartPoint({ x: pointer.x, y: pointer.y });
    
    let newObject;
    if (activeMode === 'rectangle') {
      newObject = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 1,
        height: 1,
        fill: 'transparent',
        stroke: currentColor, // Use the selected color
        strokeWidth: 2,
        selectable: false,
        evented: false
      });
    } else if (activeMode === 'ellipse') {
      newObject = new Ellipse({
        left: pointer.x,
        top: pointer.y,
        rx: 1,
        ry: 1,
        fill: 'transparent',
        stroke: currentColor, // Use the selected color
        strokeWidth: 2,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center'
      });
    }
    
    if (newObject) {
      canvas.add(newObject);
      currentObjectRef.current = newObject;
      canvas.renderAll();
    }
  }, [activeMode, currentColor]);

  const handleMouseMove = useCallback((o) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isDrawing || !currentObjectRef.current) return;
    
    const pointer = canvas.getPointer(o.e);
    const object = currentObjectRef.current;
    
    if (activeMode === 'rectangle') {
      const width = Math.abs(pointer.x - startPoint.x);
      const height = Math.abs(pointer.y - startPoint.y);
      
      object.set({
        left: Math.min(startPoint.x, pointer.x),
        top: Math.min(startPoint.y, pointer.y),
        width: width,
        height: height
      });
    } else if (activeMode === 'ellipse') {
      const rx = Math.abs(pointer.x - startPoint.x) / 2;
      const ry = Math.abs(pointer.y - startPoint.y) / 2;
      
      const centerX = Math.min(startPoint.x, pointer.x) + rx;
      const centerY = Math.min(startPoint.y, pointer.y) + ry;
      
      object.set({
        left: centerX,
        top: centerY,
        rx: rx,
        ry: ry
      });
    }
    
    canvas.renderAll();
  }, [activeMode, isDrawing, startPoint]);

  const handleMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !isDrawing) return;
    
    setIsDrawing(false);
    
    const object = currentObjectRef.current;
    if (object) {
      // If shape is too small, remove it
      if ((activeMode === 'rectangle' && (object.width < 5 || object.height < 5)) ||
          (activeMode === 'ellipse' && (object.rx < 3 || object.ry < 3))) {
        canvas.remove(object);
      } else {
        // Make object selectable after creation is complete
        object.set({
          selectable: true,
          evented: true
        });
      }
    }
    
    currentObjectRef.current = null;
    canvas.renderAll();
  }, [activeMode, isDrawing]);
  
  // Handle tool changes - with safer checks
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasInitialized) return;
    
    // Remove existing event listeners to prevent duplicates
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Set drawing mode
    canvas.isDrawingMode = activeMode === 'pen';
    
    // Set selection mode
    canvas.selection = activeMode === 'select';
    
    // Make objects selectable only in select mode or text mode
    canvas.getObjects().forEach(obj => {
      obj.selectable = activeMode === 'select' || (activeMode === 'text' && obj instanceof Textbox);
      obj.evented = activeMode === 'select' || (activeMode === 'text' && obj instanceof Textbox);
    });
    
    // Only add mouse handlers for shape tools and text tool
    if (activeMode !== 'pen' && activeMode !== 'select') {
      canvas.on('mouse:down', handleMouseDown);
      
      // Only add move and up handlers for drawing shapes
      if (activeMode !== 'text') {
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
      }
    }
    
    canvas.renderAll();
    
    return () => {
      // Clean up only if canvas still exists
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('mouse:down', handleMouseDown);
        fabricCanvasRef.current.off('mouse:move', handleMouseMove);
        fabricCanvasRef.current.off('mouse:up', handleMouseUp);
      }
    };
  }, [activeMode, handleMouseDown, handleMouseMove, handleMouseUp, canvasInitialized]);
  
  // Clear canvas method
  const clearCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  return (
    <div className="whiteboard-container" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar 
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        clearCanvas={clearCanvas}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        onSave={handleSave}
        onBack={onNavigateBack}
      />
      
      {/* Workspace name input */}
      <div style={{ 
        padding: '5px 10px', 
        backgroundColor: '#f8f8f8', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Workspace Name"
          style={{
            fontSize: '16px',
            padding: '5px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px'
          }}
        />
        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
          Last saved: {initialData?.lastModified ? new Date(initialData.lastModified).toLocaleString() : 'Never'}
        </span>
      </div>
      
      <div className="canvas-container" style={{ flex: 1, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default Whiteboard;