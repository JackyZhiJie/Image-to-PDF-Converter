import { DragEvent } from 'react';
import { RotateCw, Crop, Type, Paintbrush, Trash2, Edit3, ArrowLeft, ArrowRight } from 'lucide-react';
import { ProcessedImage } from '../types';

interface ImageCardProps {
  image: ProcessedImage;
  index: number;
  totalImages: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void;
}

export default function ImageCard({
  image,
  index,
  totalImages,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
}: ImageCardProps) {
  const hasCrop = image.crop && (image.crop.x !== 0 || image.crop.y !== 0 || image.crop.width !== 100 || image.crop.height !== 100);
  const annotationCount = image.annotations.length;
  const drawingCount = image.drawings.length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="group relative flex flex-col glass-panel rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200/60 dark:border-brand-900/40 hover:-translate-y-0.5 transition-all duration-300 select-none project-card"
    >
      {/* Grid Thumbnail Wrapper */}
      <div className="relative aspect-square w-full bg-slate-100 dark:bg-brand-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-brand-900/30">
        {/* Page Number Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-slate-900/75 dark:bg-brand-900/80 backdrop-blur-sm rounded-lg text-[10px] font-bold text-white tracking-wider">
          PAGE {index + 1}
        </div>

        {/* Edit Indicators Badges */}
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
          {image.rotation > 0 && (
            <div className="p-1 bg-brand-600/90 text-white rounded-md shadow-sm" title={`Rotated ${image.rotation}°`}>
              <RotateCw size={11} />
            </div>
          )}
          {hasCrop && (
            <div className="p-1 bg-brand-600/90 text-white rounded-md shadow-sm" title="Image Cropped">
              <Crop size={11} />
            </div>
          )}
          {annotationCount > 0 && (
            <div className="px-1.5 py-0.5 bg-brand-600/90 text-white rounded-md shadow-sm text-[9px] font-bold flex items-center gap-0.5" title={`${annotationCount} text layers`}>
              <Type size={10} />
              <span>{annotationCount}</span>
            </div>
          )}
          {drawingCount > 0 && (
            <div className="px-1.5 py-0.5 bg-brand-600/90 text-white rounded-md shadow-sm text-[9px] font-bold flex items-center gap-0.5" title={`${drawingCount} sketches`}>
              <Paintbrush size={10} />
              <span>{drawingCount}</span>
            </div>
          )}
        </div>

        {/* Thumbnail Image inside crop aspect frame */}
        <div
          className="w-[85%] h-[85%] flex items-center justify-center transition-transform duration-300"
          style={{
            transform: `rotate(${image.rotation}deg)`,
          }}
        >
          <img
            src={image.previewUrl}
            alt={image.name}
            className="max-w-full max-h-full object-contain rounded shadow-sm select-none pointer-events-none"
            style={
              image.crop
                ? {
                    clipPath: `inset(${image.crop.y}% ${100 - (image.crop.x + image.crop.width)}% ${100 - (image.crop.y + image.crop.height)}% ${image.crop.x}%)`,
                  }
                : undefined
            }
          />
        </div>

        {/* Quick Edit Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition duration-200">
          <button
            onClick={onEdit}
            className="p-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-md hover:scale-105 active:scale-95 transition"
            title="Edit page"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md hover:scale-105 active:scale-95 transition"
            title="Delete page"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Card Info & Mobile Arrow Reorder Controls */}
      <div className="p-3 bg-white/50 dark:bg-brand-900/10 flex flex-col gap-2">
        <div className="text-[11px] font-medium text-slate-500 dark:text-brand-300 truncate pr-1" title={image.name}>
          {image.name}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-brand-900/20 pt-2.5">
          {/* Mobile Buttons */}
          <div className="flex gap-1.5 w-full">
            <button
              onClick={() => onMove(index, index - 1)}
              disabled={index === 0}
              className="flex-1 py-1 px-2 border border-slate-200 dark:border-brand-800 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 disabled:opacity-30 disabled:hover:text-slate-400 flex justify-center transition"
              title="Move Up"
            >
              <ArrowLeft size={13} />
            </button>
            
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:hover:bg-brand-800/40 dark:text-brand-300 rounded-lg text-[10px] font-bold tracking-wide uppercase transition"
            >
              Configure
            </button>

            <button
              onClick={() => onMove(index, index + 1)}
              disabled={index === totalImages - 1}
              className="flex-1 py-1 px-2 border border-slate-200 dark:border-brand-800 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 disabled:opacity-30 disabled:hover:text-slate-400 flex justify-center transition"
              title="Move Down"
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
