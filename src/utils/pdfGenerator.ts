import { PDFDocument } from 'pdf-lib';
import { ProcessedImage, PDFGenerationSettings } from '../types';

// Helper to convert mm to points (1 inch = 25.4 mm = 72 points)
const mmToPoints = (mm: number): number => mm * (72 / 25.4);

// Helper to load image file into an HTMLImageElement
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

/**
 * Processes an individual image on a canvas applying crop, rotate, annotations, and drawings.
 * Returns a compressed JPEG array buffer.
 */
export const processImageToBuffer = async (
  imgData: ProcessedImage,
  quality: number,
  maxDimension: number
): Promise<{ buffer: ArrayBuffer; width: number; height: number }> => {
  const img = await loadImage(imgData.previewUrl);

  const origW = imgData.width || img.naturalWidth;
  const origH = imgData.height || img.naturalHeight;

  // 1. Calculate source crop dimensions
  const crop = imgData.crop || { x: 0, y: 0, width: 100, height: 100 };
  const cropX = (crop.x / 100) * origW;
  const cropY = (crop.y / 100) * origH;
  const cropW = (crop.width / 100) * origW;
  const cropH = (crop.height / 100) * origH;

  // 2. Calculate scaling factor to compress resolution
  let scale = 1;
  const largestDim = Math.max(cropW, cropH);
  if (largestDim > maxDimension) {
    scale = maxDimension / largestDim;
  }

  const destW = cropW * scale;
  const destH = cropH * scale;

  // 3. Setup canvas size based on rotation (90 and 270 swap dimensions)
  const canvas = document.createElement('canvas');
  const isRotated90 = imgData.rotation % 180 === 90;

  if (isRotated90) {
    canvas.width = destH;
    canvas.height = destW;
  } else {
    canvas.width = destW;
    canvas.height = destH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  // Draw white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Draw rotated & cropped image
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((imgData.rotation * Math.PI) / 180);
  // Center drawing at translated origin
  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    -destW / 2,
    -destH / 2,
    destW,
    destH
  );
  ctx.restore();

  // 5. Draw hand-drawn lines / signatures
  imgData.drawings.forEach((stroke) => {
    if (stroke.points.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = (stroke.width / 100) * Math.min(canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    stroke.points.forEach((pt, idx) => {
      // Map percentages back to current canvas dimensions
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

  // 6. Draw text annotations
  imgData.annotations.forEach((ann) => {
    ctx.fillStyle = ann.color;
    const pxFontSize = (ann.fontSize / 400) * Math.min(canvas.width, canvas.height);
    ctx.font = `bold ${pxFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = 'top';

    const px = (ann.x / 100) * canvas.width;
    const py = (ann.y / 100) * canvas.height;
    ctx.fillText(ann.text, px, py);
  });

  // 7. Compress image to JPEG blob and convert to ArrayBuffer
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Canvas conversion to blob failed'));
          return;
        }
        const arrayBuffer = await blob.arrayBuffer();
        resolve({
          buffer: arrayBuffer,
          width: canvas.width,
          height: canvas.height,
        });
      },
      'image/jpeg',
      quality
    );
  });
};

/**
 * Generates a PDF file from processed images and settings.
 * Returns the PDF file as a Uint8Array.
 */
export const generatePDF = async (
  images: ProcessedImage[],
  settings: PDFGenerationSettings,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const total = images.length;

  for (let i = 0; i < total; i++) {
    const imgData = images[i];
    
    // Process image details on canvas and fetch its JPEG buffer
    const { buffer, width, height } = await processImageToBuffer(
      imgData,
      settings.quality,
      settings.maxDimension
    );

    // Embed compressed JPEG
    const pdfImg = await pdfDoc.embedJpg(buffer);

    // Calculate page size and orientation
    let pageW = width;
    let pageH = height;
    const marginPts = mmToPoints(settings.margin);

    if (settings.pageSize === 'a4') {
      pageW = 595.28; // standard A4 width in points
      pageH = 841.89; // standard A4 height in points
    } else if (settings.pageSize === 'letter') {
      pageW = 612; // standard Letter width in points
      pageH = 792; // standard Letter height in points
    }

    // Set page orientation
    let isLandscape = false;
    if (settings.orientation === 'landscape') {
      isLandscape = true;
    } else if (settings.orientation === 'auto') {
      isLandscape = width > height;
    }

    if (isLandscape && settings.pageSize !== 'fit') {
      // Swap width and height for landscape A4/Letter
      const temp = pageW;
      pageW = pageH;
      pageH = temp;
    } else if (settings.pageSize === 'fit') {
      // If fit, size page exactly to image + margins
      pageW = width + 2 * marginPts;
      pageH = height + 2 * marginPts;
    }

    // Add page
    const page = pdfDoc.addPage([pageW, pageH]);

    // Calculate printable bounding box
    const maxPrintableW = pageW - 2 * marginPts;
    const maxPrintableH = pageH - 2 * marginPts;

    // Scale image aspect ratio to fit the printable area
    let drawW = width;
    let drawH = height;
    const imgRatio = width / height;

    if (drawW > maxPrintableW) {
      drawW = maxPrintableW;
      drawH = drawW / imgRatio;
    }
    if (drawH > maxPrintableH) {
      drawH = maxPrintableH;
      drawW = drawH * imgRatio;
    }

    // Center image
    const drawX = marginPts + (maxPrintableW - drawW) / 2;
    // In pdf-lib, y-axis is from the bottom
    const drawY = marginPts + (maxPrintableH - drawH) / 2;

    page.drawImage(pdfImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  // Save and export PDF bytes
  return await pdfDoc.save();
};
