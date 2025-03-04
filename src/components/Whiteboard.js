import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas, Rect, Ellipse, Textbox, PencilBrush } from 'fabric';

// Enhanced toolbar with selection tool and text box
const Toolbar = ({ activeMode, setActiveMode, clearCanvas }) => {
  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#f0f0f0', 
      display: 'flex', 
      gap: '10px' 
    }}>
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
      <button onClick={clearCanvas}>Clear</button>
    </div>
  );
};

const Whiteboard = () => {
  // Main state
  const [activeMode, setActiveMode] = useState('select'); // Default to select mode
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  
  // Refs
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const currentObjectRef = useRef(null);

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
        fill: 'black',
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
        stroke: 'black',
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
        stroke: 'black',
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
  }, [activeMode]);

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
  
  // Initialize the canvas once
  useEffect(() => {
    // Wait for the canvas DOM element to be ready
    if (!canvasRef.current) return;

    // Create canvas instance only once
    if (!fabricCanvasRef.current) {
      // Create the canvas with initial dimensions
      const canvas = new Canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        selection: true // Enable multi-selection with dragging
      });
      
      fabricCanvasRef.current = canvas;
      
      // Set initial brush settings
      fabricCanvasRef.current.freeDrawingBrush = new PencilBrush(fabricCanvasRef.current);
      fabricCanvasRef.current.freeDrawingBrush.width = 3;
      fabricCanvasRef.current.freeDrawingBrush.color = '#000000';
      
      // Set initial dimensions after canvas is ready
      const updateCanvasSize = () => {
        if (fabricCanvasRef.current) {
          const width = window.innerWidth;
          const height = window.innerHeight - 60;
          fabricCanvasRef.current.setWidth(width);
          fabricCanvasRef.current.setHeight(height);
          fabricCanvasRef.current.renderAll();
        }
      };
      
      // First render after a short delay to ensure DOM is ready
      setTimeout(updateCanvasSize, 100);
      setCanvasInitialized(true);
    }
    
    // Handle window resize safely
    const handleResize = () => {
      if (fabricCanvasRef.current && canvasRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight - 60;
        fabricCanvasRef.current.setWidth(width);
        fabricCanvasRef.current.setHeight(height);
        fabricCanvasRef.current.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (fabricCanvasRef.current) {
        // Save a reference before cleanup
        const canvas = fabricCanvasRef.current;
        // Clear the ref first to prevent further access
        fabricCanvasRef.current = null;
        // Then dispose
        canvas.dispose();
      }
    };
  }, []);
  
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
      />
      <div className="canvas-container" style={{ flex: 1, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default Whiteboard;