import React from 'react';

const Toolbar = ({ fabricCanvas, setActiveShape, addRect, addCircle, setPenMode, selectedNode }) => {
  const handleRectangleClick = () => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = false;
    }
    
    if (typeof addRect === 'function') {
      addRect();
    } else if (typeof setActiveShape === 'function') {
      setActiveShape('rectangle');
    }
  };

  const handleCircleClick = () => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = false;
    }
    
    if (typeof addCircle === 'function') {
      addCircle();
    } else if (typeof setActiveShape === 'function') {
      setActiveShape('circle');
    }
  };

  const handlePenClick = () => {
    if (typeof setPenMode === 'function') {
      setPenMode();
    } else if (typeof setActiveShape === 'function') {
      setActiveShape('pen');
    }
  };

  const clearCanvas = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
    }
  };

  return (
    <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
      <button onClick={handleRectangleClick}>Rectangle</button>
      <button onClick={handleCircleClick}>Circle</button>
      <button onClick={handlePenClick}>Pen</button>
      <button onClick={clearCanvas}>Clear</button>
    </div>
  );
};

export default Toolbar;