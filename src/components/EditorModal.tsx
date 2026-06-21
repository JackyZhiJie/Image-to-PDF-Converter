import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { X, RotateCw, Crop, Type, Paintbrush, Undo, Save, Trash2, Move } from 'lucide-react';
import { ProcessedImage, TextAnnotation, DrawingStroke, CropArea } from '../types';

interface EditorModalProps {
  image: ProcessedImage;
  onClose: () => void;
  onSave: (updatedImage: ProcessedImage) => void;
}

const COLORS = [
  { name: 'Dark slate', value: '#1e293b' },
  { name: 'Crimson red', value: '#e11d48' },
  { name: 'Royal blue', value: '#2563eb' },
  { name: 'Forest green', value: '#16a34a' },
  { name: 'Pure white', value: '#ffffff' },
];

export default function EditorModal({ image, onClose, onSave }: EditorModalProps) {
  // Modal states initialized from current image data
  const [rotation, setRotation] = useState<number>(image.rotation);
  const [crop, setCrop] = useState<CropArea>(
    image.crop || { x: 0, y: 0, width: 100, height: 100 }
  );
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(image.annotations || []);
  const [drawings, setDrawings] = useState<DrawingStroke[]>(image.drawings || []);
  const [activeTool, setActiveTool] = useState<'rotate' | 'crop' | 'text' | 'draw'>('rotate');

  // Drawing settings
  const [currentColor, setCurrentColor] = useState<string>('#e11d48'); // Crimson red default
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // Text annotation states
  const [textInput, setTextInput] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(20);
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; annX: number; annY: number } | null>(null);

  // Rotate helper (0 -> 90 -> 180 -> 270 -> 0)
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Re-draw drawings on the local workspace canvas when dimensions change
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw past strokes
    drawings.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = (stroke.width / 100) * Math.min(canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      stroke.points.forEach((pt, idx) => {
        const px = (pt.x / 100) * canvas.width;
        const py = (pt.y / 100) * canvas.height;
        if (idx === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    });

    // Draw active drawing stroke
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = (brushWidth / 100) * Math.min(canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      currentPoints.forEach((pt, idx) => {
        const px = (pt.x / 100) * canvas.width;
        const py = (pt.y / 100) * canvas.height;
        if (idx === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    }
  }, [drawings, currentPoints, currentColor, brushWidth]);

  // Adjust local drawing canvas buffer size to match client width/height
  const syncCanvasSize = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  };

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [activeTool, rotation, crop]);

  // Drawing event handlers (Touch & Mouse)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleStartDraw = (clientX: number, clientY: number) => {
    if (activeTool !== 'draw') return;
    setIsDrawing(true);
    const coords = getCanvasCoords(clientX, clientY);
    setCurrentPoints([coords]);
  };

  const handleMoveDraw = (clientX: number, clientY: number) => {
    if (!isDrawing || activeTool !== 'draw') return;
    const coords = getCanvasCoords(clientX, clientY);
    setCurrentPoints((prev) => [...prev, coords]);
  };

  const handleEndDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 0) {
      const newStroke: DrawingStroke = {
        id: Math.random().toString(36).substr(2, 9),
        points: currentPoints,
        color: currentColor,
        width: brushWidth,
      };
      setDrawings((prev) => [...prev, newStroke]);
    }
    setCurrentPoints([]);
  };

  // Dragging annotations
  const handleAnnDragStart = (e: ReactMouseEvent | ReactTouchEvent, ann: TextAnnotation) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      annX: ann.x,
      annY: ann.y,
    };
    setSelectedTextId(ann.id);
  };

  const handleAnnDragMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!dragStartRef.current || !selectedTextId) return;
    const container = containerRef.current;
    if (!container) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = container.getBoundingClientRect();
    const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100;

    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === selectedTextId
          ? {
              ...ann,
              x: Math.max(0, Math.min(100, dragStartRef.current!.annX + deltaX)),
              y: Math.max(0, Math.min(100, dragStartRef.current!.annY + deltaY)),
            }
          : ann
      )
    );
  };

  const handleAnnDragEnd = () => {
    dragStartRef.current = null;
  };

  // Add text annotation
  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newAnn: TextAnnotation = {
      id: Math.random().toString(36).substr(2, 9),
      text: textInput,
      x: textInputPos.x,
      y: textInputPos.y,
      color: currentColor,
      fontSize: fontSize,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setTextInput('');
    setShowTextInput(false);
  };

  const handleCanvasClick = (e: ReactMouseEvent) => {
    if (activeTool !== 'text') return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setTextInputPos({ x, y });
    setShowTextInput(true);
  };

  const handleUndoDraw = () => {
    setDrawings((prev) => prev.slice(0, -1));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleSave = () => {
    onSave({
      ...image,
      rotation,
      crop,
      annotations,
      drawings,
    });
  };

  // Calculated crop style overlay helper
  const borderLeft = `${crop.x}%`;
  const borderTop = `${crop.y}%`;
  const borderRight = `${100 - (crop.x + crop.width)}%`;
  const borderBottom = `${100 - (crop.y + crop.height)}%`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-slate-950/95 backdrop-blur-sm text-slate-100 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-6 select-none shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="serif-title text-xl font-bold tracking-tight text-brand-300">Editor</h3>
            <p className="text-xs text-slate-400 truncate max-w-[180px]">{image.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tool Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/50">
          <button
            onClick={() => { setActiveTool('rotate'); setShowTextInput(false); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTool === 'rotate' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw size={16} />
            <span>Rotate</span>
          </button>
          <button
            onClick={() => { setActiveTool('crop'); setShowTextInput(false); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTool === 'crop' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crop size={16} />
            <span>Crop</span>
          </button>
          <button
            onClick={() => { setActiveTool('text'); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTool === 'text' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type size={16} />
            <span>Text</span>
          </button>
          <button
            onClick={() => { setActiveTool('draw'); setShowTextInput(false); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition ${
              activeTool === 'draw' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Paintbrush size={16} />
            <span>Draw</span>
          </button>
        </div>

        {/* Dynamic Tool Settings */}
        <div className="flex-1 flex flex-col gap-5 py-2">
          {activeTool === 'rotate' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Rotational Angle</span>
              <button
                onClick={handleRotate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700/80 active:scale-98 rounded-xl font-medium transition text-brand-200 border border-slate-700/30"
              >
                <RotateCw size={18} />
                <span>Rotate 90° Clockwise</span>
              </button>
              <div className="mt-2 text-center text-xs text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-900">
                Current angle: <span className="font-semibold text-brand-400">{rotation}°</span>
              </div>
            </div>
          )}

          {activeTool === 'crop' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Crop Settings</span>
                <button
                  onClick={() => setCrop({ x: 0, y: 0, width: 100, height: 100 })}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  Reset Crop
                </button>
              </div>

              {/* Crop Boundaries Sliders */}
              <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Left Crop</span>
                    <span>{crop.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={100 - crop.width}
                    value={crop.x}
                    onChange={(e) => {
                      const newX = parseInt(e.target.value);
                      setCrop((prev) => ({ ...prev, x: newX }));
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Width Crop</span>
                    <span>{crop.width}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={100 - crop.x}
                    value={crop.width}
                    onChange={(e) => {
                      const newW = parseInt(e.target.value);
                      setCrop((prev) => ({ ...prev, width: newW }));
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Top Crop</span>
                    <span>{crop.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={100 - crop.height}
                    value={crop.y}
                    onChange={(e) => {
                      const newY = parseInt(e.target.value);
                      setCrop((prev) => ({ ...prev, y: newY }));
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Height Crop</span>
                    <span>{crop.height}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={100 - crop.y}
                    value={crop.height}
                    onChange={(e) => {
                      const newH = parseInt(e.target.value);
                      setCrop((prev) => ({ ...prev, height: newH }));
                    }}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Text Color</span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCurrentColor(c.value)}
                    className={`w-8 h-8 rounded-full border transition flex items-center justify-center ${
                      currentColor === c.value
                        ? 'border-brand-400 scale-110 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {c.value === '#ffffff' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">Text Size</span>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-900 leading-relaxed mt-2">
                💡 <span className="font-semibold text-brand-300">Click anywhere on the image</span> to drop a text box. Tap and drag labels to reposition them.
              </div>

              {annotations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Text Layers ({annotations.length})</span>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5">
                    {annotations.map((ann) => (
                      <div
                        key={ann.id}
                        onClick={() => setSelectedTextId(ann.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          selectedTextId === ann.id
                            ? 'bg-slate-800 border-brand-500/50'
                            : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="truncate max-w-[160px] text-slate-200">{ann.text}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(ann.id);
                          }}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTool === 'draw' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Ink Color</span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCurrentColor(c.value)}
                    className={`w-8 h-8 rounded-full border transition flex items-center justify-center ${
                      currentColor === c.value
                        ? 'border-brand-400 scale-110 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {c.value === '#ffffff' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">Brush Thickness</span>
                  <span>{brushWidth}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUndoDraw}
                  disabled={drawings.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 disabled:opacity-40 disabled:hover:bg-slate-800 transition border border-slate-700/30 text-slate-300"
                >
                  <Undo size={14} />
                  <span>Undo Stroke</span>
                </button>
                <button
                  onClick={() => setDrawings([])}
                  disabled={drawings.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-slate-850 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-850 transition border border-slate-850 text-slate-400"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-900 leading-relaxed">
                ✏️ <span className="font-semibold text-brand-300">Click/Touch & Drag</span> on the image to draw notes or place your signature.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700/40 text-slate-300 font-semibold text-sm hover:bg-slate-800/50 active:scale-95 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-brand-900/20"
          >
            <Save size={16} />
            <span>Apply Edits</span>
          </button>
        </div>
      </div>

      {/* Editor Canvas workspace area */}
      <div
        className={`flex-1 relative flex items-center justify-center p-6 md:p-12 overflow-hidden bg-slate-950 ${
          activeTool === 'draw' ? 'cursor-crosshair' : activeTool === 'text' ? 'cursor-text' : 'cursor-default'
        }`}
        onMouseMove={handleAnnDragMove}
        onTouchMove={handleAnnDragMove}
        onMouseUp={handleAnnDragEnd}
        onTouchEnd={handleAnnDragEnd}
      >
        {/* Workspace board container */}
        <div
          ref={containerRef}
          className="relative shadow-2xl transition-transform duration-300 max-h-full max-w-full flex items-center justify-center bg-[#1c1d21]"
          style={{
            transform: `rotate(${rotation}deg)`,
            // Maintain exact aspect ratio for layout
            aspectRatio: rotation % 180 === 90 ? `${image.height}/${image.width}` : `${image.width}/${image.height}`,
          }}
        >
          {/* Base Image */}
          <img
            src={image.previewUrl}
            alt="Source preview"
            className="max-h-[70vh] md:max-h-[80vh] w-auto h-auto object-contain select-none pointer-events-none"
          />

          {/* Interactive drawing and clicking canvas overlay */}
          <canvas
            ref={drawingCanvasRef}
            onClick={handleCanvasClick}
            onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleStartDraw(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handleMoveDraw(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handleEndDraw}
            className="absolute inset-0 w-full h-full z-20 touch-none"
          />

          {/* Crop Area Shading Visualizer */}
          {activeTool === 'crop' && (
            <div className="absolute inset-0 pointer-events-none z-30">
              {/* Shaded boundaries */}
              <div
                className="absolute border border-brand-400 bg-slate-950/60"
                style={{
                  left: 0,
                  top: 0,
                  right: 0,
                  height: borderTop,
                }}
              />
              <div
                className="absolute border border-brand-400 bg-slate-950/60"
                style={{
                  left: 0,
                  bottom: 0,
                  right: 0,
                  height: borderBottom,
                }}
              />
              <div
                className="absolute border border-brand-400 bg-slate-950/60"
                style={{
                  left: 0,
                  top: borderTop,
                  bottom: borderBottom,
                  width: borderLeft,
                }}
              />
              <div
                className="absolute border border-brand-400 bg-slate-950/60"
                style={{
                  right: 0,
                  top: borderTop,
                  bottom: borderBottom,
                  width: borderRight,
                }}
              />
              {/* Highlight box */}
              <div
                className="absolute border-2 border-brand-400 border-dashed"
                style={{
                  left: borderLeft,
                  top: borderTop,
                  right: borderRight,
                  bottom: borderBottom,
                }}
              />
            </div>
          )}

          {/* Text Annotations Overlays */}
          <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden">
            {annotations.map((ann) => {
              const isSelected = selectedTextId === ann.id;
              return (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleAnnDragStart(e, ann)}
                  onTouchStart={(e) => handleAnnDragStart(e, ann)}
                  className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing px-2 py-0.5 rounded flex items-center gap-1.5 transition whitespace-nowrap font-bold select-none ${
                    isSelected
                      ? 'bg-brand-600/90 text-white border border-brand-400 scale-105 z-40'
                      : 'bg-slate-900/70 border border-slate-700/30'
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    color: ann.color,
                    fontSize: `${(ann.fontSize / 450) * 100}vw`, // responsive scaling size
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Move size={11} className="text-white/70" />
                  <span>{ann.text}</span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(ann.id);
                      }}
                      className="hover:text-red-300 p-0.5 rounded text-white"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input modal trigger for Text placement */}
          {showTextInput && (
            <div
              className="absolute pointer-events-auto z-40 bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-xl flex gap-1.5 max-w-xs shrink-0"
              style={{
                left: `${textInputPos.x}%`,
                top: `${textInputPos.y}%`,
                transform: 'translate(-50%, -110%)', // render just above click site
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Type note text..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddText();
                  if (e.key === 'Escape') setShowTextInput(false);
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-44"
              />
              <button
                onClick={handleAddText}
                className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 rounded-lg text-xs font-bold text-white transition active:scale-95"
              >
                Add
              </button>
              <button
                onClick={() => { setShowTextInput(false); setTextInput(''); }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
