import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import TextFormatToolbar from './TextFormatToolbar';

const { Canvas, Rect, Ellipse, Textbox, PencilBrush } = fabric;

// Update the Toolbar component to include an Import Image button
const Toolbar = ({ activeMode, setActiveMode, clearCanvas, currentColor, setCurrentColor, onSave, onBack, onImportImage }) => {
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
      {/* Add Import Image button */}
      <button 
        onClick={onImportImage}
        style={{ 
          backgroundColor: '#6c757d',
          color: 'white'
        }}
      >
        Import Image
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
  // Add a ref for the file input element
  const fileInputRef = useRef(null);
  
  // Text formatting state
  const [formatToolbarVisible, setFormatToolbarVisible] = useState(false);
  const [formatToolbarPosition, setFormatToolbarPosition] = useState({ left: 0, top: 0 });
  const [activeTextObject, setActiveTextObject] = useState(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  
  // IMPORTANT: Move createRichTextbox definition here, before it's referenced in handleMouseDown
  // IMPORTANT: Update createRichTextbox to accept position parameters
  // 1. First, update the createRichTextbox function to ensure text objects are properly identified
  // Update createRichTextbox to remove LaTeX properties
  const createRichTextbox = useCallback((text, options = {}) => {
    return new fabric.IText(text, {
      left: options.left || 0,
      top: options.top || 0,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: currentColor,
      backgroundColor: options?.highlight ? highlightColor : null,
      width: 300,
      padding: 5,
      selectable: true,
      evented: true,
      strokeUniform: true,
      // Remove richTextData or just code-related properties
      customType: 'richTextbox'
    });
  }, [currentColor, highlightColor]);
  
  // Save workspace with thumbnail
  const handleSave = useCallback(() => {
    if (fabricCanvasRef.current) {
      try {
        // Store objects temporarily to ensure they don't get lost
        const canvasObjects = [...fabricCanvasRef.current.getObjects()];
        
        // Generate thumbnail
        const thumbnail = fabricCanvasRef.current.toDataURL({
          format: 'jpeg',
          quality: 0.1, 
          multiplier: 0.2 
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
  // 2. Update handleMouseDown to explicitly show the toolbar when creating a text
  const handleMouseDown = useCallback((o) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const pointer = canvas.getPointer(o.e);
    
    // For text tool, handle differently based on whether we clicked an existing text box
    if (activeMode === 'text') {
      // If we clicked on an existing text box, edit it
      if (o.target && (o.target instanceof fabric.IText || o.target instanceof fabric.Textbox)) {
        canvas.setActiveObject(o.target);
        o.target.enterEditing();
        o.target.selectAll();
        
        // DIRECTLY SET TOOLBAR POSITION AND VISIBILITY HERE
        const bounds = o.target.getBoundingRect();
        console.log("Text object clicked, showing toolbar at:", bounds);
        setFormatToolbarPosition({
          left: bounds.left,
          top: Math.max(bounds.top - 50, 10)
        });
        setFormatToolbarVisible(true);
        setActiveTextObject(o.target);
        
        canvas.renderAll();
        return;
      }
      
      // Otherwise create a new text box
      const textbox = createRichTextbox('Edit this text', {
        left: pointer.x,
        top: pointer.y
      });
      
      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      
      // DIRECTLY SET TOOLBAR POSITION AND VISIBILITY HERE TOO
      const bounds = textbox.getBoundingRect();
      console.log("New textbox created, showing toolbar at:", bounds);
      setFormatToolbarPosition({
        left: bounds.left,
        top: Math.max(bounds.top - 50, 10)
      });
      setFormatToolbarVisible(true);
      setActiveTextObject(textbox);
      
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
        stroke: currentColor,
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
        stroke: currentColor,
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
  }, [activeMode, currentColor, startPoint, createRichTextbox, setFormatToolbarPosition, setFormatToolbarVisible, setActiveTextObject]);

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

  // Function to handle image import button click
  const handleImportImageClick = useCallback(() => {
    // Trigger the hidden file input click event
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // Function to handle file selection
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    
    if (file && fabricCanvasRef.current) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log("Image loaded, creating fabric image...");
        const imgData = e.target.result;
        
        // Create an HTML image first to get dimensions
        const img = new Image();
        img.onload = function() {
          console.log(`Image dimensions: ${img.width}x${img.height}`);
          
          // Create a fabric.Image instance
          const fabricImage = new fabric.Image(img, {
            left: 100,
            top: 100
          });
          
          const canvas = fabricCanvasRef.current;
          
          // Scale down large images
          const maxWidth = canvas.width * 0.8;
          const maxHeight = canvas.height * 0.8;
          
          if (fabricImage.width > maxWidth || fabricImage.height > maxHeight) {
            const scale = Math.min(maxWidth / fabricImage.width, maxHeight / fabricImage.height);
            fabricImage.scale(scale);
          }
          
          // Center the image
          fabricImage.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center'
          });
          
          console.log("Adding image to canvas");
          canvas.add(fabricImage);
          canvas.setActiveObject(fabricImage);
          canvas.requestRenderAll(); // Use requestRenderAll for consistent rendering
          
          // Switch to select mode
          setActiveMode('select');
        };
        
        img.onerror = function() {
          console.error("Failed to load image");
        };
        
        // Set the source of the image to the file data
        img.src = imgData;
      };
      
      reader.readAsDataURL(file);
      
      // Reset the file input
      event.target.value = '';
    }
  }, [setActiveMode]);
  
  // Enhanced text editing exited handler
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const handleTextEditingExited = (e) => {
      console.log("Text editing exited:", e.target);
      if (e.target && e.target.richTextData?.isLatex) {
        console.log("LaTeX object editing exited, rendering...");
        setFormatToolbarVisible(false);
      }
    };
    
    console.log("Setting up text:editing:exited listener");
    fabricCanvasRef.current.on('text:editing:exited', handleTextEditingExited);
    
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('text:editing:exited', handleTextEditingExited);
      }
    };
  }, [canvasInitialized]);

  // Add formatting handlers
  const handleBold = useCallback(() => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // If text is selected during editing, apply formatting to selection only
      const currentStyles = activeTextObject.getSelectionStyles();
      const isBold = currentStyles[0]?.fontWeight === 'bold';
      
      activeTextObject.setSelectionStyles({
        fontWeight: isBold ? 'normal' : 'bold'
      });
    } else {
      // Apply to entire text if no selection
      const currentFontWeight = activeTextObject.fontWeight || 'normal';
      activeTextObject.set('fontWeight', currentFontWeight === 'bold' ? 'normal' : 'bold');
    }
    
    fabricCanvasRef.current.renderAll();
  }, [activeTextObject]);
  
  const handleItalic = useCallback(() => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // If text is selected during editing, apply formatting to selection only
      const currentStyles = activeTextObject.getSelectionStyles();
      const isItalic = currentStyles[0]?.fontStyle === 'italic';
      
      activeTextObject.setSelectionStyles({
        fontStyle: isItalic ? 'normal' : 'italic'
      });
    } else {
      // Apply to entire text if no selection
      const currentFontStyle = activeTextObject.fontStyle || 'normal';
      activeTextObject.set('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic');
    }
    
    fabricCanvasRef.current.renderAll();
  }, [activeTextObject]);
  
  const handleUnderline = useCallback(() => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // If text is selected during editing, apply formatting to selection only
      const currentStyles = activeTextObject.getSelectionStyles();
      const isUnderlined = currentStyles[0]?.underline === true;
      
      activeTextObject.setSelectionStyles({
        underline: !isUnderlined
      });
    } else {
      // Apply to entire text if no selection
      const currentUnderline = activeTextObject.underline || false;
      activeTextObject.set('underline', !currentUnderline);
    }
    
    fabricCanvasRef.current.renderAll();
  }, [activeTextObject]);
  
  const handleTextColor = useCallback((color) => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // If text is selected during editing, apply formatting to selection only
      activeTextObject.setSelectionStyles({
        fill: color
      });
    } else {
      // Apply to entire text if no selection
      activeTextObject.set('fill', color);
    }
    
    fabricCanvasRef.current.renderAll();
  }, [activeTextObject]);
  
  const handleHighlight = useCallback((color) => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // If text is selected during editing, apply formatting to selection only
      activeTextObject.setSelectionStyles({
        textBackgroundColor: color
      });
    } else {
      // Apply to entire text if no selection
      activeTextObject.set('backgroundColor', color);
    }
    
    setHighlightColor(color);
    fabricCanvasRef.current.renderAll();
  }, [activeTextObject]);
  
  // Enhanced selection handler
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Improved selection detection
    const handleObjectSelected = (e) => {
      console.log("Object selected:", e.target);
      
      // Check if it's a text object
      const isTextObject = e.target && (
        e.target instanceof fabric.IText || 
        e.target instanceof fabric.Textbox || 
        e.target.customType === 'richTextbox'
      );
      
      if (isTextObject) {
        const bounds = e.target.getBoundingRect();
        setFormatToolbarPosition({
          left: bounds.left,
          top: Math.max(bounds.top - 50, 10)
        });
        setFormatToolbarVisible(true);
        
        // Update active text object
        setActiveTextObject(e.target);
        
        // Update code mode based on font family
        const isMonospaceFont = e.target.fontFamily === 'Courier New' || e.target.fontFamily === 'monospace';
        setIsCodeMode(isMonospaceFont);
      } else {
        setFormatToolbarVisible(false);
      }
    };
    
    const handleSelectionCleared = () => {
      console.log("Selection cleared, hiding toolbar");
      setFormatToolbarVisible(false);
      // Don't clear activeTextObject here, which would break continuity
    };
    
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    return () => {
      if (fabricCanvasRef.current) {
        canvas.off('selection:created', handleObjectSelected);
        canvas.off('selection:updated', handleObjectSelected);
        canvas.off('selection:cleared', handleSelectionCleared);
      }
    };
  }, [canvasInitialized]);
  
  // 4. Add extra debugging just to make sure the toolbar is working
  console.log("Toolbar state:", { visible: formatToolbarVisible, position: formatToolbarPosition });

  // Add code formatting handler
  // Completely revised code formatting handler
  const handleCodeToggle = useCallback(() => {
    if (!activeTextObject || !fabricCanvasRef.current) return;
    
    console.log("Code toggle clicked");
    
    // For partial selection
    if (activeTextObject.isEditing && activeTextObject.selectionStart !== activeTextObject.selectionEnd) {
      // Get styles of the first character in the selection
      const currentStyles = activeTextObject.getSelectionStyles(
        activeTextObject.selectionStart,
        activeTextObject.selectionStart + 1
      );
      
      // Check if the selected text is using monospace font
      const isSelectionInCodeMode = currentStyles[0]?.fontFamily === 'Courier New' || 
                                   currentStyles[0]?.fontFamily === 'monospace';
      
      console.log("Selection is in code mode:", isSelectionInCodeMode);
      
      // Toggle the code mode for the selection only
      activeTextObject.setSelectionStyles({
        fontFamily: isSelectionInCodeMode ? 'Arial' : 'Courier New',
        backgroundColor: isSelectionInCodeMode ? '' : '#f5f5f5'
      }, 
      activeTextObject.selectionStart, 
      activeTextObject.selectionEnd);
      
    } else {
      // For entire text object
      const currentFont = activeTextObject.fontFamily || 'Arial';
      const isCurrentlyCode = currentFont === 'Courier New' || currentFont === 'monospace';
      
      console.log("Entire text is in code mode:", isCurrentlyCode);
      
      // Toggle the code mode for the entire text
      activeTextObject.set({
        fontFamily: isCurrentlyCode ? 'Arial' : 'Courier New',
        backgroundColor: isCurrentlyCode ? '' : '#f5f5f5'
      });
      
      // Update the UI state
      setIsCodeMode(!isCurrentlyCode);
    }
    
    // Force update the canvas
    fabricCanvasRef.current.requestRenderAll();
    
  }, [activeTextObject]);

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
        onImportImage={handleImportImageClick}
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
      
      <div className="canvas-container" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        
        {/* Add a visible indicator for debugging */}
        {formatToolbarVisible && (
          <div style={{
            position: 'absolute',
            left: formatToolbarPosition.left + 'px',
            top: formatToolbarPosition.top + 'px',
            backgroundColor: 'red',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            zIndex: 2000
          }} />
        )}
        
        {/* Text formatting toolbar - now imported as a separate component */}
        <TextFormatToolbar 
          visible={formatToolbarVisible}
          position={formatToolbarPosition}
          onBold={handleBold}
          onItalic={handleItalic}
          onUnderline={handleUnderline}
          onColor={handleTextColor}
          onHighlight={handleHighlight}
          onCodeToggle={handleCodeToggle}  // Replace onLatexToggle with onCodeToggle
          isCodeMode={isCodeMode}         // Replace isLatexMode with isCodeMode
          currentColor={currentColor}
          currentHighlightColor={highlightColor}
          onChangeColor={handleTextColor}
          onChangeHighlightColor={handleHighlight}
        />
        
        {/* Hidden file input for image upload */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
