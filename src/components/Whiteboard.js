import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import TextFormatToolbar from './TextFormatToolbar';
import createMindMapNode from './MindMapNode';

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
      {/* Add Mind Map Node button */}
      <button 
        onClick={() => setActiveMode('mindmap')}
        style={{ 
          backgroundColor: activeMode === 'mindmap' ? '#007bff' : '#ffffff',
          color: activeMode === 'mindmap' ? 'white' : 'black'
        }}
      >
        Mind Map
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
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  // Add state to track mind map nodes
  const [mindMapNodes, setMindMapNodes] = useState([]);
  
  // Add state for API configuration in your component
  const [apiConfig] = useState({
    endpoint: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    key: process.env.REACT_APP_AZURE_OPENAI_KEY,
    deployment: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT
  });
  
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
    
    // Handle mind map node creation
    if (activeMode === 'mindmap') {
      // Check if clicked on any existing object
      if (o.target) {
        // Allow existing mind map node interaction but don't create a new node
        // If the target is already a mind map node or part of one
        const isPartOfMindMap = o.target.nodeType === 'mindMapNode' || 
                               (o.target.group && o.target.group.nodeType === 'mindMapNode');
        
        if (isPartOfMindMap) {
          // For mind map nodes, let the existing handlers work
          return;
        }
        
        // If clicked on any other object, don't create a node
        return;
      }
      
      // Add buffer check to prevent creating nodes too close to existing objects
      const bufferDistance = 30; // Distance in pixels to keep from other objects
      const nearbyObjects = canvas.getObjects().filter(obj => {
        // Skip non-visible objects
        if (!obj.visible) return false;
        
        // Calculate distance from click to object center
        const objCenterX = obj.left + (obj.width || 0) * (obj.originX === 'center' ? 0 : 0.5);
        const objCenterY = obj.top + (obj.height || 0) * (obj.originY === 'center' ? 0 : 0.5);
        
        // For groups and complex objects, use bounding box
        const bounds = obj.getBoundingRect();
        if (bounds) {
          // Check if click is within buffer distance of the object's bounding box
          return (
            pointer.x >= bounds.left - bufferDistance &&
            pointer.x <= bounds.left + bounds.width + bufferDistance &&
            pointer.y >= bounds.top - bufferDistance &&
            pointer.y <= bounds.top + bounds.height + bufferDistance
          );
        }
        
        // For simple objects, use a circular buffer
        const distance = Math.sqrt(Math.pow(pointer.x - objCenterX, 2) + Math.pow(pointer.y - objCenterY, 2));
        return distance < ((obj.width || 50) / 2 + bufferDistance);
      });
      
      // If there are nearby objects, don't create a new mind map node
      if (nearbyObjects.length > 0) {
        return;
      }
      
      // If we reach here, user clicked on empty canvas space, create new node
      const newNode = createMindMapNode({
        canvas,
        left: pointer.x, 
        top: pointer.y,
        text: 'New Idea',
        fill: '#f0f8ff', 
        stroke: currentColor
      });
      
      canvas.add(newNode);
      canvas.setActiveObject(newNode);
      
      // Automatically enter edit mode with text selected for immediate typing
      setTimeout(() => {
        newNode.editText();
        
        // If the textObject has selectAll method, use it to select all text
        if (newNode.textObject && newNode.textObject.selectAll) {
          newNode.textObject.selectAll();
        }
      }, 50);
      
      // Add event listener for the expand button
      newNode.on('mousedown', (e) => {
        // Check if click was on expand button
        const target = e.subTargets ? e.subTargets[0] : null;
        if (target && target === newNode.expandButton) {
          e.e.stopPropagation();
          handleExpandNode(newNode);
        } else if (target && target === newNode.summarizeButton) {
          e.e.stopPropagation();
          handleSummarizeNode(newNode);
        }
      });
      
      // Track movement for connection lines
      newNode.on('moving', () => {
        // Update connections where this node is the source
        newNode.updateConnections(canvas);
        
        // Also update connections where this node is the target
        canvas.getObjects().forEach(obj => {
          if (obj.nodeType === 'mindMapNode' && obj.connections) {
            // Check if this node has a connection to the moving node
            const connectionToMovingNode = obj.connections.find(conn => 
              conn.targetId === newNode.nodeId
            );
            
            if (connectionToMovingNode) {
              // Update this specific connection
              connectionToMovingNode.line.set({
                x2: newNode.left,
                y2: newNode.top
              });
            }
          }
        });
        
        canvas.requestRenderAll();
      });
      
      canvas.requestRenderAll();
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
  
  // Add function to handle node expansion with context awareness
  const handleExpandNode = useCallback((sourceNode) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    // Get text from source node
    const sourceText = sourceNode.getText();
    
    // Build tree context by traversing the mind map
    const buildNodeContext = (node) => {
      if (!node) return null;
      
      // Create base node representation
      const nodeContext = {
        id: node.nodeId,
        text: node.getText(),
        children: []
      };
      
      // Recursively add children if any
      if (node.connections && node.connections.length > 0) {
        node.connections.forEach(conn => {
          // Find the target node in the canvas
          const targetNode = canvas.getObjects().find(obj => 
            obj.nodeType === 'mindMapNode' && obj.nodeId === conn.targetId
          );
          
          if (targetNode) {
            nodeContext.children.push(buildNodeContext(targetNode));
          }
        });
      }
      
      return nodeContext;
    };
    
    // Find the root node by traversing up the tree
    const findRootNode = (startNode) => {
      // Check all nodes to find if any has this node as a target
      const allNodes = canvas.getObjects().filter(obj => obj.nodeType === 'mindMapNode');
      
      for (const node of allNodes) {
        if (node.connections && node.connections.some(conn => conn.targetId === startNode.nodeId)) {
          // This node is a parent, so recurse upward
          return findRootNode(node);
        }
      }
      
      // If no parent found, this is a root node
      return startNode;
    };
    
    // Get the root node and build the complete context
    const rootNode = findRootNode(sourceNode);
    const fullTreeContext = buildNodeContext(rootNode);
    
    // Generate ideas with context awareness
    const generateIdeas = async (text) => {
      try {
        setIsLoading(true);
        
        // Azure OpenAI requires a different URL format and headers
        const apiUrl = `${apiConfig.endpoint}/openai/deployments/${apiConfig.deployment}/chat/completions?api-version=2024-10-21`;
        
        // DEBUG: Log the tree context and path
        console.log("Mind map tree context:", fullTreeContext);
        console.log("Current node:", sourceText);
        
        // Get the path from root to current node for context
        const getNodePath = (treeNode, targetId, currentPath = []) => {
          if (treeNode.id === targetId) {
            return [...currentPath, treeNode.text];
          }
          
          for (const child of treeNode.children) {
            const path = getNodePath(child, targetId, [...currentPath, treeNode.text]);
            if (path) return path;
          }
          
          return null;
        };
        
        // Get the full path from root to current node
        const nodePath = getNodePath(fullTreeContext, sourceNode.nodeId) || [fullTreeContext.text];
        
        // Construct context-aware prompt
        const systemPrompt = 
          "You are an AI mind mapping assistant. Generate concise subtopics that break down concepts " +
          "while maintaining hierarchical context. Each subtopic should be 1-5 words maximum - " +
          "extremely brief phrases that capture essential aspects while maintaining focus on the overall topic. " +
          "Ensure that subtopics directly relate to their parent and fit within the complete mind map context. " +
          "ALWAYS format your response as a numbered list with 4 items.";
        
        // Create a simplified tree representation for the prompt
        const formatTreeForPrompt = (node, depth = 0) => {
          const indent = "  ".repeat(depth);
          let result = `${indent}- ${node.text}\n`;
          
          node.children.forEach(child => {
            result += formatTreeForPrompt(child, depth + 1);
          });
          
          return result;
        };
        
        const treeRepresentation = formatTreeForPrompt(fullTreeContext);
        const userPrompt = 
          `I'm creating a mind map with the following structure:\n\n${treeRepresentation}\n` +
          `I need to expand the node: "${text}"\n` +
          `This node is in the context path: ${nodePath.join(" > ")}\n\n` +
          `Generate exactly 4 concise subtopics (maximum 5 words each) that break down this specific concept ` +
          `while maintaining clear relevance to both its parent and the main topic. Format as a numbered list.`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiConfig.key
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_completion_tokens: 150
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error response:", errorText);
          return [`Error: ${response.status} - ${errorText.substring(0, 100)}...`];
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        console.log("FULL LLM RESPONSE:", content);
        
        // Enhanced parsing logic to handle different formats
        let ideas = [];
        
        // Method 1: Try to parse numbered list format (1. Item)
        const numberedItems = content.match(/\d+\.\s*([^\n]+)/g);
        if (numberedItems && numberedItems.length > 0) {
          ideas = numberedItems.map(item => item.replace(/^\d+\.\s*/, '').trim());
          console.log("Parsed using numbered list pattern:", ideas);
        } else {
          // Method 2: Split by new lines and filter out empty lines
          ideas = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.match(/^\d+\.?\s*$/));
          
          // Remove any remaining numbers at the beginning of lines
          ideas = ideas.map(idea => idea.replace(/^\d+\.\s*/, '').trim());
          console.log("Parsed using line breaks:", ideas);
        }
        
        // Ensure we have at least some ideas
        if (ideas.length === 0) {
          console.warn("No ideas extracted, using fallback parsing");
          ideas = [
            content.trim().substring(0, 50) + "...",
            "Subtopic 1",
            "Subtopic 2",
            "Subtopic 3"
          ];
        }
        
        // Ensure we have at least 3 ideas (pad if necessary)
        if (ideas.length < 3) {
          console.warn("Too few ideas extracted, padding");
          while (ideas.length < 4) {
            ideas.push(`Subtopic ${ideas.length + 1}`);
          }
        }
        
        // Limit to maximum 5 items
        ideas = ideas.slice(0, 5);
        
        console.log("Final extracted ideas:", ideas);
        return ideas;
      } catch (error) {
        console.error('Error generating ideas:', error);
        // Provide fallback ideas on error
        return ['Subtopic 1', 'Subtopic 2', 'Subtopic 3', 'Subtopic 4'];
      } finally {
        setIsLoading(false);
      }
    };
    
    // Make the function async to handle the API call
    const expandWithIdeas = async () => {
      const ideas = await generateIdeas(sourceText);
      
      // Create nodes in a radial pattern
      const nodeCount = ideas.length;
      const radius = 200;
      
      ideas.forEach((idea, index) => {
        // Calculate position in a circular pattern
        const angle = (index / nodeCount) * Math.PI * 2;
        const x = sourceNode.left + radius * Math.cos(angle);
        const y = sourceNode.top + radius * Math.sin(angle);
        
        // Create child node
        const childNode = createMindMapNode({
          canvas,
          left: x,
          top: y,
          text: idea,
          fill: '#f0fff0',
          stroke: currentColor
        });
        
        // Add to canvas and create connections
        canvas.add(childNode);
        sourceNode.addConnection(childNode, canvas);
        
        // Add event handlers
        childNode.on('mousedown', (e) => {
          const target = e.subTargets ? e.subTargets[0] : null;
          if (target && target === childNode.expandButton) {
            e.e.stopPropagation();
            handleExpandNode(childNode);
          }
        });
        
        childNode.on('moving', () => {
          childNode.updateConnections(canvas);
          canvas.requestRenderAll();
        });
      });
      
      canvas.requestRenderAll();
    };
    
    // Call the async function
    expandWithIdeas();
    
  }, [currentColor, apiConfig]);
  
  // Add function to handle node summarization
const handleSummarizeNode = useCallback((sourceNode) => {
  if (!fabricCanvasRef.current) return;
  const canvas = fabricCanvasRef.current;
  
  // Get text from source node
  const sourceText = sourceNode.getText();
  
  // Build tree context by traversing the mind map (same as in handleExpandNode)
  const buildNodeContext = (node) => {
    if (!node) return null;
    
    // Create base node representation
    const nodeContext = {
      id: node.nodeId,
      text: node.getText(),
      children: []
    };
    
    // Recursively add children if any
    if (node.connections && node.connections.length > 0) {
      node.connections.forEach(conn => {
        // Find the target node in the canvas
        const targetNode = canvas.getObjects().find(obj => 
          obj.nodeType === 'mindMapNode' && obj.nodeId === conn.targetId
        );
        
        if (targetNode) {
          nodeContext.children.push(buildNodeContext(targetNode));
        }
      });
    }
    
    return nodeContext;
  };
  
  // Find the root node by traversing up the tree (same as in handleExpandNode)
  const findRootNode = (startNode) => {
    // Check all nodes to find if any has this node as a target
    const allNodes = canvas.getObjects().filter(obj => obj.nodeType === 'mindMapNode');
    
    for (const node of allNodes) {
      if (node.connections && node.connections.some(conn => conn.targetId === startNode.nodeId)) {
        // This node is a parent, so recurse upward
        return findRootNode(node);
      }
    }
    
    // If no parent found, this is a root node
    return startNode;
  };
  
  // Get the root node and build the complete context
  const rootNode = findRootNode(sourceNode);
  const fullTreeContext = buildNodeContext(rootNode);
  
  // Generate summary for the node
  const generateSummary = async (text) => {
    try {
      setIsLoading(true);
      
      // Azure OpenAI requires a different URL format and headers (same as handleExpandNode)
      const apiUrl = `${apiConfig.endpoint}/openai/deployments/${apiConfig.deployment}/chat/completions?api-version=2024-10-21`;
      
      // DEBUG: Log the tree context and path
      console.log("Mind map tree context for summary:", fullTreeContext);
      console.log("Current node for summary:", sourceText);
      
      // Get the path from root to current node for context (same as handleExpandNode)
      const getNodePath = (treeNode, targetId, currentPath = []) => {
        if (treeNode.id === targetId) {
          return [...currentPath, treeNode.text];
        }
        
        for (const child of treeNode.children) {
          const path = getNodePath(child, targetId, [...currentPath, treeNode.text]);
          if (path) return path;
        }
        
        return null;
      };
      
      // Get the full path from root to current node
      const nodePath = getNodePath(fullTreeContext, sourceNode.nodeId) || [fullTreeContext.text];
      
      // Construct context-aware prompt for summarization
      const systemPrompt = 
        "You are an AI mind mapping assistant. Create a concise summary of the provided concept. " +
        "Your summary should be 20-30 words maximum - a brief paragraph that captures the " +
        "essence while maintaining focus on the overall topic. Ensure that your summary directly " +
        "relates to the concept and fits within the complete mind map context.";
      
      // Create a simplified tree representation for the prompt (same as handleExpandNode)
      const formatTreeForPrompt = (node, depth = 0) => {
        const indent = "  ".repeat(depth);
        let result = `${indent}- ${node.text}\n`;
        
        node.children.forEach(child => {
          result += formatTreeForPrompt(child, depth + 1);
        });
        
        return result;
      };
      
      const treeRepresentation = formatTreeForPrompt(fullTreeContext);
      const userPrompt = 
        `I'm creating a mind map with the following structure:\n\n${treeRepresentation}\n` +
        `I need to create a summary of this concept: "${text}"\n` +
        `This node is in the context path: ${nodePath.join(" > ")}\n\n` +
        `Generate a concise summary (20-30 words maximu) that captures the essence of this concept ` +
        `while maintaining clear relevance to both its context and the main topic.`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiConfig.key
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_completion_tokens: 100
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        return `Summary error: ${response.status}`;
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      console.log("FULL SUMMARY RESPONSE:", content);
      
      // Return the trimmed summary
      return content.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      // Provide fallback summary on error
      return 'Brief summary of concept';
    } finally {
      setIsLoading(false);
    }
  };
  
  // Make the function async to handle the API call
  const summarizeWithApi = async () => {
    const summary = await generateSummary(sourceText);
    
    // Calculate position for the summary node - place it below the source node
    const x = sourceNode.left;
    const y = sourceNode.top + 150; // Place it below the source node
    
    // Create summary node
    const summaryNode = createMindMapNode({
      canvas,
      left: x,
      top: y,
      text: summary,
      fill: '#fff0f5', // Light pink background to distinguish from expansion nodes
      stroke: currentColor
    });
    
    // Add to canvas and create connections
    canvas.add(summaryNode);
    sourceNode.addConnection(summaryNode, canvas);
    
    // Add event handlers
    summaryNode.on('mousedown', (e) => {
      const target = e.subTargets ? e.subTargets[0] : null;
      if (target && target === summaryNode.expandButton) {
        e.e.stopPropagation();
        handleExpandNode(summaryNode);
      } else if (target && target === summaryNode.summarizeButton) {
        e.e.stopPropagation();
        handleSummarizeNode(summaryNode);
      }
    });
    
    summaryNode.on('moving', () => {
      summaryNode.updateConnections(canvas);
      canvas.requestRenderAll();
    });
    
    canvas.requestRenderAll();
  };
  
  // Call the async function
  summarizeWithApi();
  
}, [currentColor, apiConfig]);
  
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
      
      // Handle mind map nodes specially
      if (e.target && e.target.nodeType === 'mindMapNode') {
        // Allow double-clicking to edit the text inside
        if (e.target.textObject) {
          e.target.textObject.enterEditing();
        }
        return;
      }
      
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

  // Enhanced selection handler for mind map nodes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Double-click handler to edit text in mind map nodes
    const handleDblClick = (e) => {
      const target = e.target;
      if (target && target.nodeType === 'mindMapNode') {
        // Enter editing mode for the text in this node
        target.editText();
      }
    };
    
    // Improved selection detection
    const handleObjectSelected = (e) => {
      console.log("Object selected:", e.target);
      
      // Handle mind map nodes specially
      if (e.target && e.target.nodeType === 'mindMapNode') {
        // Allow changing the node color when selected
        setActiveMode('select'); // Switch to select mode
        return;
      }
      
      // Rest of existing selection handler...
    };
    
    canvas.on('mouse:dblclick', handleDblClick);
    
    return () => {
      if (fabricCanvasRef.current) {
        canvas.off('mouse:dblclick', handleDblClick);
      }
    };
  }, [canvasInitialized]);

  // Enhanced double-click handler for mind map nodes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Improved double-click handler to properly target text in mind map nodes
    const handleDblClick = (e) => {
      const target = e.target;
      
      // Check if we clicked directly on a node or one of its parts
      if (target) {
        let mindMapNode = null;
        
        if (target.nodeType === 'mindMapNode') {
          // Direct click on node group
          mindMapNode = target;
        } else if (target.group && target.group.nodeType === 'mindMapNode') {
          // Click on a part of the node (like the text or button)
          mindMapNode = target.group;
          
          // If clicked directly on text object, use that
          if (target === mindMapNode.textObject) {
            console.log("Direct text object click detected");
            // Immediately try to enter editing mode
            setTimeout(() => {
              try {
                canvas.setActiveObject(target); // Fixed: changed targetObject to target
                target.enterEditing(); // Fixed: changed targetObject to target
                canvas.requestRenderAll();
                return;
              } catch (err) {
                console.error("Error entering direct text edit mode:", err);
              }
            }, 10);
          }
        }
        
        if (mindMapNode && mindMapNode.textObject) {
          console.log("Mind map node detected - entering edit mode", mindMapNode);
          
          // First select the whole node
          canvas.setActiveObject(mindMapNode);
          canvas.requestRenderAll();
          
          // Then attempt to edit the text inside using multiple techniques
          setTimeout(() => {
            try {
              // Try to directly access the text object and select it
              canvas.discardActiveObject();
              canvas.setActiveObject(mindMapNode.textObject);
              mindMapNode.textObject.enterEditing();
              canvas.requestRenderAll();
            } catch (err) {
              console.error("First attempt failed:", err);
              
              // Fall back to indirect method
              try {
                // Select the group again
                canvas.setActiveObject(mindMapNode);
                
                // Try to direct text object access from the group
                if (mindMapNode.textObject) {
                  mindMapNode.textObject.selectable = true;
                  mindMapNode.textObject.evented = true;
                  mindMapNode.textObject.enterEditing();
                }
                canvas.requestRenderAll();
              } catch (err2) {
                console.error("Second attempt failed:", err2);
              }
            }
          }, 50);
        }
      }
    };
    
    canvas.on('mouse:dblclick', handleDblClick);
    
    return () => {
      if (fabricCanvasRef.current) {
        canvas.off('mouse:dblclick', handleDblClick);
      }
    };
  }, [canvasInitialized]);

  // Replace the existing double-click handler with this improved version
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Improved double-click handler to properly target text in mind map nodes
    const handleDblClick = (e) => {
      console.log("Double-click detected", e);
      
      let targetObject = e.target;
      let mindMapNode = null;
      
      // Identify the node or text that was clicked
      if (targetObject) {
        if (targetObject.nodeType === 'mindMapNode') {
          // Direct click on node group
          mindMapNode = targetObject;
        } else if (targetObject.group && targetObject.group.nodeType === 'mindMapNode') {
          mindMapNode = targetObject.group;
          
          // If clicked directly on text object, use that
          if (targetObject === mindMapNode.textObject) {
            console.log("Direct text object click detected");
            // Immediately try to enter editing mode
            setTimeout(() => {
              try {
                canvas.setActiveObject(targetObject);
                targetObject.enterEditing();
                canvas.requestRenderAll();
                return;
              } catch (err) {
                console.error("Error entering direct text edit mode:", err);
              }
            }, 10);
          }
        }
        
        if (mindMapNode && mindMapNode.textObject) {
          console.log("Mind map node detected - entering edit mode", mindMapNode);
          
          // First select the whole node
          canvas.setActiveObject(mindMapNode);
          canvas.requestRenderAll();
          
          // Then attempt to edit the text inside using multiple techniques
          setTimeout(() => {
            try {
              // Try to directly access the text object and select it
              canvas.discardActiveObject();
              canvas.setActiveObject(mindMapNode.textObject);
              mindMapNode.textObject.enterEditing();
              canvas.requestRenderAll();
            } catch (err) {
              console.error("First attempt failed:", err);
              
              // Fall back to indirect method
              try {
                // Select the group again
                canvas.setActiveObject(mindMapNode);
                
                // Try to direct text object access from the group
                if (mindMapNode.textObject) {
                  mindMapNode.textObject.selectable = true;
                  mindMapNode.textObject.evented = true;
                  mindMapNode.textObject.enterEditing();
                }
                canvas.requestRenderAll();
              } catch (err2) {
                console.error("Second attempt failed:", err2);
              }
            }
          }, 50);
        }
      }
    };
    
    // Remove old handler if it exists
    canvas.off('mouse:dblclick');
    // Add the new handler
    canvas.on('mouse:dblclick', handleDblClick);
    
    return () => {
      if (fabricCanvasRef.current) {
        canvas.off('mouse:dblclick', handleDblClick);
      }
    };
  }, [canvasInitialized]);

  // In Whiteboard.js, add this in your initialization effect
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    const canvas = fabricCanvasRef.current;
    
    // Handle text changes to update node size
    canvas.on('text:changed', (e) => {
      const textObj = e.target;
      if (textObj && textObj.group && textObj.group.nodeType === 'mindMapNode') {
        setTimeout(() => {
          if (textObj.group.updateSize) {
            textObj.group.updateSize();
            canvas.requestRenderAll();
          }
        }, 0);
      }
    });
    
    return () => {
      canvas.off('text:changed');
    };
  }, [canvasInitialized]);

  // New improved double-click handler for mind map nodes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Single function to handle both direct double-clicks and clicks on the expand button
    const handleMindMapInteraction = (e) => {
      // For double-clicks, check the target
      if (e.type === 'mouse:dblclick') {
        const target = e.target;
        
        if (target && (target.nodeType === 'mindMapNode' || 
            (target.group && target.group.nodeType === 'mindMapNode'))) {
          
          const mindMapNode = target.nodeType === 'mindMapNode' ? 
                             target : target.group;
          
          // Don't edit if clicked on the expand button
          if (target === mindMapNode.expandButton) {
            return;
          }
          
          // Call the node's edit method
          mindMapNode.editText();
          return;
        }
      }
    };
    
    // Remove existing handlers to avoid duplicates
    canvas.off('mouse:dblclick');
    
    // Add the new handler
    canvas.on('mouse:dblclick', handleMindMapInteraction);
    
    return () => {
      canvas.off('mouse:dblclick', handleMindMapInteraction);
    };
  }, [canvasInitialized]);

  // Add event handler for mind map nodes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Handle double-click for text editing
    const handleDblClick = (e) => {
      const target = e.target;
      
      // Check if it's a mind map node or part of one
      if (target) {
        let mindMapNode = null;
        
        if (target.nodeType === 'mindMapNode') {
          mindMapNode = target;
        } else if (target.group && target.group.nodeType === 'mindMapNode') {
          mindMapNode = target.group;
          
          // If we clicked on the expand button, don't edit text
          if (target === mindMapNode.expandButton) {
            return;
          }
        }
        
        // Start editing if we found a node
        if (mindMapNode) {
          mindMapNode.editText();
        }
      }
    };
    
    // Handle mousedown to detect expand button clicks
    const handleMouseDown = (e) => {
      const target = e.target;
      
      if (target) {
        // Check if clicked directly on expand button
        if (target.group && 
            target.group.nodeType === 'mindMapNode' && 
            target === target.group.expandButton) {
          
          e.e.stopPropagation();
          handleExpandNode(target.group);
          return;
        }
        
        // Check if clicked on expand icon (the plus sign)
        if (target.group && 
            target.group.nodeType === 'mindMapNode' && 
            target === target.group._objects[3]) { // Index 3 is the expand icon
          
          e.e.stopPropagation();
          handleExpandNode(target.group);
          return;
        }
      }
    };
    
    // Remove existing handlers to avoid duplicates
    canvas.off('mouse:dblclick');
    canvas.off('mouse:down');
    
    // Add handlers
    canvas.on('mouse:dblclick', handleDblClick);
    canvas.on('mouse:down', handleMouseDown);
    
    return () => {
      if (fabricCanvasRef.current) {
        canvas.off('mouse:dblclick', handleDblClick);
        canvas.off('mouse:down', handleMouseDown);
      }
    };
  }, [canvasInitialized, handleExpandNode]);

  // Add this after canvasInitialized is set up
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Add object moving handler to update all connections
    const handleObjectMoving = (opt) => {
      const movingObject = opt.target;
      
      // Only handle mind map nodes
      if (!movingObject || movingObject.nodeType !== 'mindMapNode') return;
      
      // 1. Update connections where this node is the source (outgoing connections)
      if (movingObject.updateConnections) {
        movingObject.updateConnections(canvas);
      }
      
      // 2. Update connections where this node is the target (incoming connections)
      canvas.getObjects().forEach(obj => {
        if (obj.nodeType === 'mindMapNode' && obj.connections) {
          // Find connections to the moving node
          const connectionsToMovingNode = obj.connections.filter(conn => 
            conn.targetId === movingObject.nodeId
          );
          
          // Update each connection line
          connectionsToMovingNode.forEach(conn => {
            conn.line.set({
              x2: movingObject.left,
              y2: movingObject.top
            });
          });
        }
      });
      
      canvas.requestRenderAll();
    };
    
    // Add handler for object moving
    canvas.on('object:moving', handleObjectMoving);
    
    return () => {
      canvas.off('object:moving', handleObjectMoving);
    };
  }, [canvasInitialized]);

  // Add this after canvasInitialized is set up
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Specialized handler just for expand button clicks
    const handleNodeButtonClicks = (opt) => {
      console.log('Mouse down event detected', opt);
      const target = opt.target;
      
      // Check if we clicked on an expand button or its icon
      if (target) {
        let mindMapNode, expandButton;
        
        // Case 1: Direct click on button that's part of a mind map node
        if (target.group && target.group.nodeType === 'mindMapNode') {
          mindMapNode = target.group;
          
          // Check if clicked element is the expand button or icon
          if (target === mindMapNode._objects[2] || target === mindMapNode._objects[3]) {
            console.log('Expand button clicked!', mindMapNode);
            opt.e.stopPropagation();
            handleExpandNode(mindMapNode);
            return;
          }
        }
        
        // Case 2: Double-click on mind map node text for editing
        if (opt.e.type === 'dblclick') {
          if (target.nodeType === 'mindMapNode') {
            target.editText();
          }
        }
      }
    };
    
    // Add the specialized handler
    canvas.on('mouse:down', handleNodeButtonClicks);
    canvas.on('mouse:dblclick', handleNodeButtonClicks);
    
    return () => {
      canvas.off('mouse:down', handleNodeButtonClicks);
      canvas.off('mouse:dblclick', handleNodeButtonClicks);
    };
  }, [canvasInitialized, handleExpandNode]);

  // Add dedicated handler for mind map buttons
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Enhanced mouse down handler specifically for expand button clicks
    const handleMouseDown = (opt) => {
      console.log('Mouse down event:', opt);
      
      if (!opt.target) return;
      
      // First check for direct clicks on button or icon
      if (opt.target.isExpandButton || opt.target.isExpandIcon) {
        console.log('Expand button/icon clicked directly!');
        
        // Find the parent mind map node
        const objects = canvas.getObjects();
        for (let obj of objects) {
          if (obj.nodeType === 'mindMapNode' && 
             (obj.expandButton === opt.target || obj._objects.includes(opt.target))) {
            console.log('Found parent node:', obj);
            opt.e.stopPropagation();
            handleExpandNode(obj);
            return;
          }
        }
      }
      
      // Check if we clicked on a part of a mind map node
      if (opt.target.group && opt.target.group.nodeType === 'mindMapNode') {
        const mindMapNode = opt.target.group;
        
        // Check if target is the expand button or its icon
        if (opt.target === mindMapNode.expandButton || 
            opt.target === mindMapNode._objects[3] ||  // Icon is typically at index 3
            opt.target.isExpandButton || 
            opt.target.isExpandIcon) {
          
          console.log('Expand button clicked through group!');
          opt.e.stopPropagation();
          handleExpandNode(mindMapNode);
          return;
        }
      }
      
      // If we clicked directly on a node, check if it was on the button area
      if (opt.target.nodeType === 'mindMapNode' && opt.subTargets) {
        // Check subTargets for the expand button or icon
        for (const subTarget of opt.subTargets) {
          if (subTarget.isExpandButton || 
              subTarget.isExpandIcon ||
              subTarget === opt.target.expandButton) {
            
            console.log('Expand button clicked through subtarget!');
            opt.e.stopPropagation();
            handleExpandNode(opt.target);
            return;
          }
        }
      }
    };
    
    // Add the handler
    canvas.on('mouse:down', handleMouseDown);
    
    return () => {
      canvas.off('mouse:down', handleMouseDown);
    };
  }, [canvasInitialized, handleExpandNode]);

  // Replace all existing mind map interaction handlers with this single dedicated one
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Create a single consolidated handler for mind map interactions
    const handleMindMapInteractions = (opt) => {
      const target = opt.target;
      
      // Skip if no target
      if (!target) return;
      
      console.log('Mind map interaction:', opt.e.type, target);
      
      // CASE 1: Handle expand button clicks
      if (opt.e.type === 'mousedown') {
        // Check direct click on button (part of a group)
        if (target.group && target.group.nodeType === 'mindMapNode') {
          const node = target.group;
          
          // Check if we clicked on button or icon (indices 2 & 3)
          if (target === node._objects[2] || target === node._objects[3]) {
            console.log('EXPAND BUTTON CLICKED!');
            opt.e.stopPropagation();
            
            // Call expand node with a short timeout to ensure event is processed
            setTimeout(() => handleExpandNode(node), 10);
            return;
          }
        }
        
        // Check if clicked directly on a node's button area
        if (target.nodeType === 'mindMapNode') {
          // Get pointer position relative to object
          const pointer = canvas.getPointer(opt.e);
          
          // Get object bounds
          const objLeft = target.left;
          const objTop = target.top;
          const objWidth = target.width || 200;
          const objHeight = target.height || 100;
          
          // Define button area at bottom of node
          const buttonArea = {
            left: objLeft - 15, 
            top: objTop + objHeight/2 - 30,
            width: 30, 
            height: 30
          };
          
          // Check if click is in button area
          if (pointer.x >= buttonArea.left && 
              pointer.x <= buttonArea.left + buttonArea.width &&
              pointer.y >= buttonArea.top && 
              pointer.y <= buttonArea.top + buttonArea.height) {
            
            console.log('BUTTON AREA CLICKED!');
            opt.e.stopPropagation();
            
            // Call expand node with a short timeout
            setTimeout(() => handleExpandNode(target), 10);
            return;
          }
        }
      }
      
      // CASE 2: Handle double-click for text editing
      if (opt.e.type === 'dblclick') {
        let mindMapNode = null;
        
        if (target.nodeType === 'mindMapNode') {
          mindMapNode = target;
        } else if (target.group && target.group.nodeType === 'mindMapNode') {
          mindMapNode = target.group;
        }
        
        if (mindMapNode) {
          mindMapNode.editText();
        }
      }
    };
    
    // Remove any existing handlers to avoid conflicts
    canvas.off('mouse:down');
    canvas.off('mouse:dblclick');
    
    // Add our consolidated handlers
    canvas.on('mouse:down', handleMindMapInteractions);
    canvas.on('mouse:dblclick', handleMindMapInteractions);
    
    return () => {
      canvas.off('mouse:down', handleMindMapInteractions);
      canvas.off('mouse:dblclick', handleMindMapInteractions);
    };
  }, [canvasInitialized, handleExpandNode, handleSummarizeNode]);

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
        
        {isLoading && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '20px',
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}>
            Generating ideas...
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
