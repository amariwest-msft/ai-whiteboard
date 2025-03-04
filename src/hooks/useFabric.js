import React, { useEffect, useRef } from 'react';
import { Canvas } from 'fabric';

const useFabric = (options = {}) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new Canvas(canvasRef.current, options);
    }

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [options]);

  return { canvasRef, fabricInstance: fabricRef };
};

export default useFabric;