import React from 'react';

const TextFormatToolbar = ({ 
  visible, 
  position, 
  onBold, 
  onItalic, 
  onUnderline, 
  onCodeToggle, // Changed from onLatexToggle to onCodeToggle
  isCodeMode, // Changed from isLatexMode to isCodeMode
  currentColor,
  currentHighlightColor,
  onChangeColor,
  onChangeHighlightColor
}) => {
  if (!visible) return null;
  
  return (
    <div 
      className="text-format-toolbar" 
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}
    >
      <button 
        onClick={onBold}
        style={{ 
          fontWeight: 'bold',
          cursor: 'pointer' 
        }}
      >
        B
      </button>
      <button 
        onClick={onItalic}
        style={{ 
          fontStyle: 'italic',
          cursor: 'pointer' 
        }}
      >
        I
      </button>
      <button 
        onClick={onUnderline}
        style={{ 
          textDecoration: 'underline',
          cursor: 'pointer' 
        }}
      >
        U
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label htmlFor="text-color-picker">Color:</label>
        <input
          id="text-color-picker"
          type="color"
          value={currentColor}
          onChange={(e) => onChangeColor(e.target.value)}
          style={{ width: '20px', height: '20px' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label htmlFor="highlight-color-picker">Highlight:</label>
        <input
          id="highlight-color-picker"
          type="color"
          value={currentHighlightColor}
          onChange={(e) => onChangeHighlightColor(e.target.value)}
          style={{ width: '20px', height: '20px' }}
        />
      </div>
      <button 
        onClick={onCodeToggle}  // New prop for code formatting
        style={{ 
          backgroundColor: isCodeMode ? '#007bff' : '#ffffff', // Changed from isLatexMode to isCodeMode
          color: isCodeMode ? 'white' : 'black',
          cursor: 'pointer',
          fontFamily: 'monospace' // Changed from 'serif' to 'monospace' to indicate code
        }}
      >
        Code
      </button>
    </div>
  );
};

export default TextFormatToolbar;