import { Group, Rect, IText, Line, Text } from 'fabric';

const createMindMapNode = ({ canvas, left = 100, top = 100, text = 'New Idea', fill = '#f0f8ff', stroke = '#0078d7', id = null }) => {
  const nodeId = id || `node_${Date.now()}`;
  
  // Better starting dimensions
  const minWidth = 200;
  const minHeight = 100;
  
  // Create text first to measure it
  const textbox = new IText(text, {
    fontSize: 16,
    fontFamily: 'Arial',
    fill: '#333333',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    width: minWidth - 40,
    breakWords: true,
    editable: true,
    hasControls: false
  });
  
  // Calculate size based on text (ensuring minimums)
  const textWidth = Math.max(textbox.width + 40, minWidth);
  const textHeight = Math.max(textbox.height + 40, minHeight);
  
  // Create background
  const background = new Rect({
    width: textWidth,
    height: textHeight,
    rx: 10,
    ry: 10,
    fill: fill,
    stroke: stroke,
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
    shadow: {
      color: 'rgba(0,0,0,0.3)',
      blur: 8,
      offsetX: 3,
      offsetY: 3
    }
  });
  
  // Create RECTANGULAR expand button with improved properties
  const expandButton = new Rect({
    width: 30,
    height: 30,
    rx: 5,
    ry: 5,
    fill: stroke,
    stroke: '#ffffff',
    strokeWidth: 1,
    originX: 'center',
    originY: 'center',
    left: -20, // Moved left to make room for summarize button
    top: textHeight/2 - 20,
    shadow: {
      color: 'rgba(0,0,0,0.2)',
      blur: 4,
      offsetX: 1,
      offsetY: 1
    },
    selectable: false,
    evented: true,
    hoverCursor: 'pointer',
    isExpandButton: true
  });
  
  // Create plus sign with improved properties
  const expandIcon = new Text('+', {
    left: -20, // Match the button's position
    top: textHeight/2 - 22,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    fill: 'white',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: true,
    hoverCursor: 'pointer',
    isExpandIcon: true
  });
  
  // Create RECTANGULAR summarize button with similar properties
  const summarizeButton = new Rect({
    width: 30,
    height: 30,
    rx: 5,
    ry: 5,
    fill: stroke,
    stroke: '#ffffff',
    strokeWidth: 1,
    originX: 'center',
    originY: 'center',
    left: 20, // Positioned to the right of expand button
    top: textHeight/2 - 20,
    shadow: {
      color: 'rgba(0,0,0,0.2)',
      blur: 4,
      offsetX: 1,
      offsetY: 1
    },
    selectable: false,
    evented: true,
    hoverCursor: 'pointer',
    isSummarizeButton: true // Special marker for identification
  });
  
  // Create 'S' letter icon
  const summarizeIcon = new Text('S', {
    left: 20, // Match the button's position
    top: textHeight/2 - 22,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Arial',
    fill: 'white',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: true,
    hoverCursor: 'pointer',
    isSummarizeIcon: true // Special marker for identification
  });
  
  // Create node group with both buttons
  const nodeGroup = new Group([background, textbox, expandButton, expandIcon, summarizeButton, summarizeIcon], {
    left: left,
    top: top,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    subTargetCheck: true
  });
  
  // Add required properties
  nodeGroup.nodeId = nodeId;
  nodeGroup.connections = [];
  nodeGroup.textObject = textbox;
  nodeGroup.expandButton = expandButton;
  nodeGroup.summarizeButton = summarizeButton; // Add reference to summarize button
  nodeGroup.nodeType = 'mindMapNode';
  
  // Function to get text content
  nodeGroup.getText = function() {
    return this.textObject.text;
  };
  
  // Function to set text content
  nodeGroup.setText = function(text) {
    this.textObject.set('text', text);
    this.updateSize();
  };
  
  // Function to update node size based on text content
  nodeGroup.updateSize = function() {
    const textWidth = Math.max(this.textObject.width + 40, minWidth);
    const textHeight = Math.max(this.textObject.height + 40, minHeight);
    
    background.set({
      width: textWidth,
      height: textHeight
    });
    
    expandButton.set({
      left: -20,
      top: textHeight/2 - 20
    });
    
    expandIcon.set({
      left: -20,
      top: textHeight/2 - 22
    });
    
    // Update summarize button position too
    summarizeButton.set({
      left: 20,
      top: textHeight/2 - 20
    });
    
    summarizeIcon.set({
      left: 20,
      top: textHeight/2 - 22
    });
    
    if (canvas) canvas.requestRenderAll();
  };
  
  // Function to make text editable - NEW improved version!
  nodeGroup.editText = function() {
    if (canvas) {
      // First deselect current selection
      canvas.discardActiveObject();
      
      // Create a temporary IText object at the same position
      const tempText = new IText(this.textObject.text, {
        left: this.left,
        top: this.top,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#333333',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.textObject.width,
        breakWords: true,
        editable: true,
        hasControls: true,
        editingBorderColor: '#0078d7'
      });
      
      // Hide the original node
      this.visible = false;
      
      // Add temp text to canvas
      canvas.add(tempText);
      canvas.setActiveObject(tempText);
      tempText.enterEditing();
      
      // When editing is done, update the original node
      tempText.on('editing:exited', () => {
        // Update original node text
        this.setText(tempText.text);
        
        // Show original node and remove temp text
        this.visible = true;
        canvas.remove(tempText);
        
        // Select the original node again
        canvas.setActiveObject(this);
        canvas.requestRenderAll();
      });
      
      canvas.requestRenderAll();
    }
  };
  
  // Corrected connection handler
  nodeGroup.addConnection = function(targetNode, canvas) {
    const connection = {
      targetId: targetNode.nodeId,
      line: new Line(
        [
          this.left, 
          this.top, 
          targetNode.left, 
          targetNode.top
        ],
        {
          stroke: stroke,
          strokeWidth: 2,
          selectable: false,
          evented: false,
        }
      )
    };
    
    this.connections.push(connection);
    canvas.add(connection.line);
    
    // Use sendObjectToBack instead of sendToBack
    canvas.sendObjectToBack(connection.line);
    
    return connection;
  };
  
  // Update connections when node moves
  nodeGroup.updateConnections = function(canvas) {
    this.connections.forEach(conn => {
      const targetNode = this._findNodeById(canvas, conn.targetId);
      if (targetNode) {
        conn.line.set({
          x1: this.left,
          y1: this.top,
          x2: targetNode.left,
          y2: targetNode.top,
        });
      }
    });
  };
  
  nodeGroup._findNodeById = function(canvas, nodeId) {
    return canvas.getObjects().find(obj => 
      obj.nodeType === 'mindMapNode' && obj.nodeId === nodeId
    );
  };
  
  return nodeGroup;
};

export default createMindMapNode;