import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react';
import { 
  FileImage, 
  Upload, 
  Camera, 
  Settings2, 
  FileText, 
  Sparkles, 
  Download, 
  Eye, 
  Sun, 
  Moon, 
  Trash2, 
  RefreshCw,
  Sliders,
  Play,
  RotateCcw,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProcessedImage, PDFGenerationSettings } from './types';
import { generatePDF } from './utils/pdfGenerator';
import ImageCard from './components/ImageCard';
import EditorModal from './components/EditorModal';

const COMPRESSION_PRESETS = [
  { name: 'Low (Email)', key: 'low', dimension: 900, quality: 0.55, desc: 'Smallest file size. Perfect for forms.' },
  { name: 'Medium (Balanced)', key: 'medium', dimension: 1600, quality: 0.75, desc: 'Crisp images, low storage footprint.' },
  { name: 'High (Print)', key: 'high', dimension: 2200, quality: 0.85, desc: 'High resolution, detailed graphics.' },
  { name: 'Original', key: 'original', dimension: 3200, quality: 0.95, desc: 'Maximum resolution, minimal compression.' },
];

export default function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [editingImage, setEditingImage] = useState<ProcessedImage | null>(null);
  const [activePreset, setActivePreset] = useState<string>('medium');
  const [settings, setSettings] = useState<PDFGenerationSettings>({
    pageSize: 'fit',
    orientation: 'auto',
    margin: 0,
    quality: 0.75,
    maxDimension: 1600,
  });

  // UI state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generatedPdf, setGeneratedPdf] = useState<{ blob: Blob; size: number; url: string } | null>(null);
  
  // Webcam capture states
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const defaultTheme = savedTheme || 'dark';
    setTheme(defaultTheme);
    if (defaultTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle theme helper
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sync settings when compression preset changes
  const applyPreset = (presetKey: string) => {
    const p = COMPRESSION_PRESETS.find(x => x.key === presetKey);
    if (!p) return;
    setActivePreset(presetKey);
    setSettings(prev => ({
      ...prev,
      quality: p.quality,
      maxDimension: p.dimension
    }));
    // Clear previously compiled PDF as parameters changed
    clearCompiledPDF();
  };

  const clearCompiledPDF = () => {
    if (generatedPdf) {
      URL.revokeObjectURL(generatedPdf.url);
      setGeneratedPdf(null);
    }
  };

  // Convert File object to local image details
  const processFiles = (files: FileList) => {
    clearCompiledPDF();
    const list = Array.from(files);

    list.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = previewUrl;
      img.onload = () => {
        const newImg: ProcessedImage = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
          file: file,
          previewUrl: previewUrl,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          rotation: 0,
          annotations: [],
          drawings: [],
        };
        setImages((prev) => [...prev, newImg]);
      };
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Direct Mobile camera capture handler
  const handleCameraCapture = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Built-in WebRTC webcam methods for desktops
  const startWebcam = async () => {
    try {
      setIsWebcamOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Could not access your camera. Make sure you granted permissions or use standard image uploading.');
      setIsWebcamOpen(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !webcamStream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame on canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `Webcam_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.jpg`, {
        type: 'image/jpeg'
      });
      const previewUrl = URL.createObjectURL(file);
      const newImg: ProcessedImage = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        file: file,
        previewUrl: previewUrl,
        width: canvas.width,
        height: canvas.height,
        rotation: 0,
        annotations: [],
        drawings: [],
      };
      setImages((prev) => [...prev, newImg]);
      stopWebcam();
    }, 'image/jpeg', 0.95);
  };

  // Reordering: Arrow Buttons
  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    clearCompiledPDF();
    const updated = [...images];
    const [item] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    setImages(updated);
  };

  // Reordering: HTML5 Drag & Drop
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, toIndex: number) => {
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(fromIndexStr);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;

    clearCompiledPDF();
    const updated = [...images];
    const [item] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, item);
    setImages(updated);
  };

  // Edit action
  const handleSaveEdits = (updated: ProcessedImage) => {
    clearCompiledPDF();
    setImages((prev) => prev.map((img) => (img.id === updated.id ? updated : img)));
    setEditingImage(null);
  };

  const handleDeleteImage = (index: number) => {
    clearCompiledPDF();
    setImages((prev) => {
      const copy = [...prev];
      // Revoke preview URL to save memory
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleClearAll = () => {
    clearCompiledPDF();
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  // Compile PDF document
  const handleCompilePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const pdfBytes = await generatePDF(images, settings, (progress) => {
        setGenerationProgress(progress);
      });

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setGeneratedPdf({
        blob,
        size: blob.size,
        url
      });

      // Celebrate!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error(err);
      alert('Error creating PDF document. Please verify your images and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPdf) return;
    const a = document.createElement('a');
    a.href = generatedPdf.url;
    a.download = `Document_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-300">
      
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-200/20 dark:bg-brand-900/10 blur-[120px] ambient-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sand-200/20 dark:bg-sand-900/10 blur-[120px] ambient-glow" />
      </div>

      {/* App Header Nav */}
      <header className="relative z-10 border-b border-slate-200/60 dark:border-brand-900/20 bg-white/70 dark:bg-brand-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sand-500 flex items-center justify-center shadow-md">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <h1 className="serif-title text-lg font-bold tracking-tight text-slate-800 dark:text-[#f3ece3]">
              Image to PDF <span className="premium-gradient-text">Converter</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold dark:text-brand-400">
              Image to Compressed PDF
            </p>
          </div>
        </div>

        {/* Theme and Actions Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-brand-900 dark:hover:bg-brand-900/40 text-slate-600 dark:text-brand-300 transition"
            title="Toggle theme mode"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Dashboard Container */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        
        {/* Left Side: Upload & Images Workspace (Grid of pages) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Uploader Box */}
          {images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-16 border-2 border-dashed border-slate-200 dark:border-brand-900/50 rounded-3xl bg-white/50 dark:bg-brand-950/20 backdrop-blur shadow-sm hover:border-brand-400 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 shadow-sm">
                <Upload size={28} />
              </div>
              <h2 className="serif-title text-2xl font-bold mb-2 text-slate-800 dark:text-[#f3ece3] text-center">
                Upload your images
              </h2>
              <p className="text-sm text-slate-500 dark:text-brand-300 text-center max-w-md mb-8">
                Import JPG, PNG, or WEBP photos. You can easily crop, rotate, write notes, draw signatures, and arrange them in order.
              </p>

              {/* Upload Triggers */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* File picker */}
                <label className="premium-btn premium-btn-primary cursor-pointer justify-center text-sm shadow-md">
                  <FileImage size={18} />
                  <span>Choose Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>

                {/* Direct Camera Picker for Mobile */}
                <label className="premium-btn premium-btn-secondary cursor-pointer sm:hidden justify-center text-sm">
                  <Camera size={18} />
                  <span>Use System Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraCapture}
                  />
                </label>

                {/* WebRTC Camera Trigger for Desktop */}
                <button
                  onClick={startWebcam}
                  className="premium-btn premium-btn-secondary justify-center text-sm hidden sm:flex"
                >
                  <Camera size={18} />
                  <span>Capture from Camera</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Grid Header Controls */}
              <div className="flex items-center justify-between bg-white/40 dark:bg-brand-950/20 p-3 rounded-2xl border border-slate-200/50 dark:border-brand-900/20 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-brand-100 dark:bg-brand-900/60 rounded-lg text-xs font-bold text-brand-700 dark:text-brand-300">
                    {images.length} Page{images.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-brand-400 hidden sm:inline">
                    Drag items to reorder them
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* File Pick Add Button */}
                  <label className="p-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/40 dark:hover:bg-brand-900/80 rounded-xl text-brand-600 dark:text-brand-300 cursor-pointer transition select-none flex items-center gap-1.5 text-xs font-bold border border-brand-100/50 dark:border-brand-800/30">
                    <Upload size={14} />
                    <span>Add Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <button
                    onClick={handleClearAll}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-slate-400 hover:text-red-500 transition flex items-center gap-1.5 text-xs font-bold border border-transparent hover:border-red-200/30"
                  >
                    <Trash2 size={14} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Grid Layout of Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <ImageCard
                    key={img.id}
                    image={img}
                    index={index}
                    totalImages={images.length}
                    onEdit={() => setEditingImage(img)}
                    onDelete={() => handleDeleteImage(index)}
                    onMove={handleMoveImage}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: PDF Compiler Controls & Settings */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Settings Box Panel */}
          <div className="glass-panel rounded-3xl p-5 md:p-6 flex flex-col gap-6">
            
            {/* Header Settings Tab */}
            <div className="flex items-center gap-2 pb-4 border-b border-slate-200/60 dark:border-brand-900/20">
              <Settings2 size={18} className="text-brand-500" />
              <h2 className="serif-title text-base font-bold text-slate-800 dark:text-[#f3ece3]">
                Compilation Settings
              </h2>
            </div>

            {/* Layout Options */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold dark:text-brand-400 flex items-center gap-1">
                <span>Page Formatting</span>
              </h3>

              {/* Page size selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-brand-300">Page Size</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-brand-950/60 rounded-xl">
                  {(['fit', 'a4', 'letter'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => { setSettings(prev => ({ ...prev, pageSize: size })); clearCompiledPDF(); }}
                      className={`py-1.5 text-xs font-medium rounded-lg uppercase tracking-wide transition ${
                        settings.pageSize === size
                          ? 'bg-white dark:bg-brand-900/80 text-brand-700 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:text-brand-300 dark:hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation selector */}
              {settings.pageSize !== 'fit' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-brand-300">Orientation</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-brand-950/60 rounded-xl">
                    {(['auto', 'portrait', 'landscape'] as const).map((orient) => (
                      <button
                        key={orient}
                        onClick={() => { setSettings(prev => ({ ...prev, orientation: orient })); clearCompiledPDF(); }}
                        className={`py-1.5 text-xs font-medium rounded-lg uppercase tracking-wide transition ${
                          settings.orientation === orient
                            ? 'bg-white dark:bg-brand-900/80 text-brand-700 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-brand-300 dark:hover:text-white'
                        }`}
                      >
                        {orient}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Margin sizes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-brand-300">Page Margins</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-brand-950/60 rounded-xl">
                  {([0, 5, 10, 15] as const).map((margin) => (
                    <button
                      key={margin}
                      onClick={() => { setSettings(prev => ({ ...prev, margin })); clearCompiledPDF(); }}
                      className={`py-1.5 text-xs font-medium rounded-lg transition ${
                        settings.margin === margin
                          ? 'bg-white dark:bg-brand-900/80 text-brand-700 dark:text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:text-brand-300 dark:hover:text-white'
                      }`}
                    >
                      {margin}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Compression Presets & Advanced controls */}
            <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-brand-900/10 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold dark:text-brand-400 flex items-center gap-1">
                  <span>Compression Tier</span>
                </h3>
                <Sparkles size={14} className="text-sand-500" />
              </div>

              {/* Preset buttons */}
              <div className="flex flex-col gap-2">
                {COMPRESSION_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p.key)}
                    className={`p-3 rounded-xl border text-left transition ${
                      activePreset === p.key
                        ? 'bg-brand-50/50 dark:bg-brand-950/30 border-brand-500/60 shadow-sm'
                        : 'border-slate-200/60 dark:border-brand-900/30 bg-white/10 hover:bg-slate-50 dark:hover:bg-brand-900/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-xs font-bold ${activePreset === p.key ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {p.name}
                      </span>
                      {activePreset === p.key && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{p.desc}</p>
                  </button>
                ))}
              </div>

              {/* Advanced Custom sliders if user edits presets manually */}
              <div className="bg-slate-100/60 dark:bg-brand-950/40 p-4 rounded-2xl border border-slate-200/20 dark:border-brand-900/10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-brand-400">Manual Compressors</span>
                  <Sliders size={12} className="text-slate-400" />
                </div>

                {/* Quality Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-brand-300">
                    <span>JPEG Quality</span>
                    <span className="font-bold">{Math.round(settings.quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={settings.quality * 100}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) / 100 }));
                      setActivePreset('custom');
                      clearCompiledPDF();
                    }}
                    className="w-full h-1 bg-slate-200 dark:bg-brand-900 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* Dimension Limit Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-medium text-slate-500 dark:text-brand-300">
                    <span>Max Resolution limit</span>
                    <span className="font-bold">{settings.maxDimension}px</span>
                  </div>
                  <input
                    type="range"
                    min="600"
                    max="3000"
                    step="100"
                    value={settings.maxDimension}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, maxDimension: parseInt(e.target.value) }));
                      setActivePreset('custom');
                      clearCompiledPDF();
                    }}
                    className="w-full h-1 bg-slate-200 dark:bg-brand-900 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col gap-3 pt-5 border-t border-slate-100 dark:border-brand-900/10 mt-auto">
              {images.length > 0 && !generatedPdf && (
                <button
                  onClick={handleCompilePDF}
                  disabled={isGenerating}
                  className="w-full premium-btn premium-btn-primary py-3.5 text-sm uppercase tracking-wider font-bold shadow-md disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Creating PDF ({generationProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Compile PDF File</span>
                    </>
                  )}
                </button>
              )}

              {/* Compiled output summary */}
              {generatedPdf && (
                <div className="flex flex-col gap-3 p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-500/30 rounded-2xl animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 dark:text-brand-300">PDF Compiled!</span>
                    <span className="font-bold text-slate-500 dark:text-brand-400">{formatSize(generatedPdf.size)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={downloadPDF}
                      className="flex-1 premium-btn premium-btn-primary py-2.5 text-xs font-bold"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                    <a
                      href={generatedPdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="premium-btn premium-btn-secondary py-2.5 text-xs font-bold"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </a>
                  </div>

                  <button
                    onClick={clearCompiledPDF}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-center flex items-center justify-center gap-1 mt-1.5"
                  >
                    <RotateCcw size={10} />
                    <span>Clear and Re-edit</span>
                  </button>
                </div>
              )}

              {images.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 dark:bg-brand-950/10 border border-dashed border-slate-200 dark:border-brand-900/30 rounded-2xl font-medium">
                  Add images above to begin compiling
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Full-Screen Image Editor Modal */}
      {editingImage && (
        <EditorModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEdits}
        />
      )}

      {/* Advanced Desktop Camera Preview Modal */}
      {isWebcamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl max-w-lg w-full mx-4 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="serif-title text-lg font-bold text-brand-300">Camera Capture</h3>
              <button
                onClick={stopWebcam}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Webcam viewport */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-slate-800/80">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={stopWebcam}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
              >
                Close
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-brand-900/20"
              >
                <Camera size={16} />
                <span>Capture Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="z-10 py-6 text-center text-xs text-slate-400 dark:text-brand-500 mt-auto border-t border-slate-100 dark:border-brand-900/10">
        <p>© {new Date().getFullYear()} Jacky Chen. Handcrafted with biophilic design.  Image to PDF Converter. Run 100% locally in your browser. Absolutely Private.</p>
      </footer>
    </div>
  );
}
