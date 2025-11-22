import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolMode, Point, ColorData, MeasurementData } from '../types';

interface ImageCanvasProps {
  imageSrc: string;
  mode: ToolMode;
  selectedPoint: Point | null;
  onColorPicked: (color: ColorData) => void;
  onMeasurementUpdate: (measurement: MeasurementData | null) => void;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageSrc,
  mode,
  selectedPoint,
  onColorPicked,
  onMeasurementUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stores the natural dimensions of the image
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Internal state for interaction
  const [scale, setScale] = useState(1);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);
  
  // Measurement state
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);

  // Load image
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImgDimensions({ width: img.width, height: img.height });
      // Reset measurement states on new image
      setMeasureStart(null);
      setMeasureEnd(null);
      onMeasurementUpdate(null);
    };
  }, [imageSrc, onMeasurementUpdate]);

  // Resize observer to handle responsiveness
  useEffect(() => {
    if (!containerRef.current || !imgDimensions) return;

    const updateScale = () => {
      if (containerRef.current && imgDimensions) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedScale = containerWidth / imgDimensions.width;
        setScale(calculatedScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imgDimensions]);

  // Helper: Convert screen coordinates to natural image coordinates
  const getNaturalCoords = (e: React.MouseEvent): Point | null => {
    if (!canvasRef.current || !imgDimensions) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imgDimensions.width / rect.width);
    const y = (e.clientY - rect.top) * (imgDimensions.height / rect.height);
    
    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(x, imgDimensions.width - 1));
    const clampedY = Math.max(0, Math.min(y, imgDimensions.height - 1));
    
    return { x: clampedX, y: clampedY };
  };

  // Drawing Logic
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !imgDimensions) return;

    // Set canvas to natural resolution
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;

    // 1. Draw Image
    ctx.drawImage(img, 0, 0);

    // 2. Draw Measurement Lines
    if (mode === ToolMode.MEASURE) {
      if (measureStart) {
        ctx.beginPath();
        ctx.arc(measureStart.x, measureStart.y, 5 / scale, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6'; // blue-500
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();

        const endPoint = measureEnd || (hoverPos ? hoverPos : null);
        
        if (endPoint) {
          // Line
          ctx.beginPath();
          ctx.moveTo(measureStart.x, measureStart.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3 / scale;
          ctx.stroke();
          
          // End dot
          ctx.beginPath();
          ctx.arc(endPoint.x, endPoint.y, 5 / scale, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.stroke();

          // Distance Text
          const dist = Math.sqrt(
            Math.pow(endPoint.x - measureStart.x, 2) + 
            Math.pow(endPoint.y - measureStart.y, 2)
          );
          const midX = (measureStart.x + endPoint.x) / 2;
          const midY = (measureStart.y + endPoint.y) / 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.roundRect(midX - (40 / scale), midY - (20 / scale), 80 / scale, 24 / scale, 4 / scale);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = `bold ${14 / scale}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(dist)}px`, midX, midY - (8 / scale)); // Adjust for baseline
        }
      }
    }

    // 3. Draw Color Picker Indicator
    if (mode === ToolMode.COLOR_PICKER && selectedPoint) {
       ctx.beginPath();
       // Outer ring white
       ctx.arc(selectedPoint.x, selectedPoint.y, 8 / scale, 0, 2 * Math.PI);
       ctx.strokeStyle = 'white';
       ctx.lineWidth = 3 / scale;
       ctx.stroke();
       // Inner ring black (contrast)
       ctx.beginPath();
       ctx.arc(selectedPoint.x, selectedPoint.y, 8 / scale, 0, 2 * Math.PI);
       ctx.strokeStyle = 'black';
       ctx.lineWidth = 1 / scale;
       ctx.stroke();
       
       // Target crosshair
       ctx.beginPath();
       ctx.moveTo(selectedPoint.x - (12 / scale), selectedPoint.y);
       ctx.lineTo(selectedPoint.x + (12 / scale), selectedPoint.y);
       ctx.moveTo(selectedPoint.x, selectedPoint.y - (12 / scale));
       ctx.lineTo(selectedPoint.x, selectedPoint.y + (12 / scale));
       ctx.strokeStyle = 'rgba(255,255,255,0.8)';
       ctx.lineWidth = 1 / scale;
       ctx.stroke();
    }

  }, [imgDimensions, measureStart, measureEnd, hoverPos, mode, scale, selectedPoint]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getNaturalCoords(e);
    if (coords) {
      setHoverPos(coords);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getNaturalCoords(e);
    if (!coords) return;

    if (mode === ToolMode.COLOR_PICKER) {
      pickColor(coords);
    } else if (mode === ToolMode.MEASURE) {
      if (!measureStart) {
        setMeasureStart(coords);
        setMeasureEnd(null);
        onMeasurementUpdate(null);
      } else {
        setMeasureEnd(coords);
        const dist = Math.sqrt(
            Math.pow(coords.x - measureStart.x, 2) + 
            Math.pow(coords.y - measureStart.y, 2)
        );
        onMeasurementUpdate({
          start: measureStart,
          end: coords,
          distancePixels: dist
        });
        // UX: If user clicks again after a completed measurement, restart
        if (measureStart && measureEnd) {
            setMeasureStart(coords);
            setMeasureEnd(null);
            onMeasurementUpdate(null);
        }
      }
    }
  };

  const pickColor = (coords: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();

    onColorPicked({ r, g, b, hex, x: Math.round(coords.x), y: Math.round(coords.y) });
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full overflow-hidden cursor-crosshair bg-slate-950 shadow-inner ${mode === ToolMode.MEASURE ? 'cursor-crosshair' : 'cursor-default'}`}
    >
      {imgDimensions ? (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          className="touch-none"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500">
          Loading Canvas...
        </div>
      )}
    </div>
  );
};