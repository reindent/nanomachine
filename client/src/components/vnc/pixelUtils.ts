/**
 * Utility functions for VNC pixel processing
 */

/**
 * Process VNC frame data into RGBA format for browser rendering
 */
export function processVncFrame(frame: any): Uint8ClampedArray {
  // For raw RGB/RGBA data
  const binary = atob(frame.data);
  
  // Create array for pixel data (always RGBA for browser)
  const array = new Uint8ClampedArray(frame.width * frame.height * 4);
  
  // Process the pixel data based on bits per pixel
  const bytesPerPixel = frame.bpp ? frame.bpp / 8 : 4;
  
  if (bytesPerPixel === 4) {
    // 32-bit color (BGRA or similar)
    // VNC typically uses BGRA format, but we need RGBA for the browser
    for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
      // Get color values
      const b = binary.charCodeAt(i);
      const g = binary.charCodeAt(i + 1);
      const r = binary.charCodeAt(i + 2);
      // Skip alpha value as we're always using 255
      
      // Store as RGBA
      array[j] = r;     // Red
      array[j + 1] = g; // Green
      array[j + 2] = b; // Blue
      array[j + 3] = 255; // Always use full opacity
    }
  } else if (bytesPerPixel === 3) {
    // 24-bit color (BGR)
    for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
      // Get color values
      const b = binary.charCodeAt(i);
      const g = binary.charCodeAt(i + 1);
      const r = binary.charCodeAt(i + 2);
      
      // Store as RGBA
      array[j] = r;     // Red
      array[j + 1] = g; // Green
      array[j + 2] = b; // Blue
      array[j + 3] = 255; // Alpha (opaque)
    }
  } else if (bytesPerPixel === 2) {
    // 16-bit color (typically 5-6-5 RGB)
    for (let i = 0, j = 0; i < binary.length && j < array.length; i += bytesPerPixel, j += 4) {
      // Get 16-bit pixel value (2 bytes)
      const pixelValue = (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
      
      // Extract RGB components based on shifts if provided
      let r, g, b;
      if (frame.redShift !== undefined) {
        // Use provided color shifts
        r = ((pixelValue >> frame.redShift) & 0xFF);
        g = ((pixelValue >> frame.greenShift) & 0xFF);
        b = ((pixelValue >> frame.blueShift) & 0xFF);
      } else {
        // Assume standard 5-6-5 format
        r = ((pixelValue >> 11) & 0x1F) << 3; // 5 bits red
        g = ((pixelValue >> 5) & 0x3F) << 2;  // 6 bits green
        b = (pixelValue & 0x1F) << 3;         // 5 bits blue
      }
      
      // Store as RGBA
      array[j] = r;     // Red
      array[j + 1] = g; // Green
      array[j + 2] = b; // Blue
      array[j + 3] = 255; // Alpha (opaque)
    }
  } else {
    console.error('Unsupported bytes per pixel:', bytesPerPixel);
    throw new Error('Unsupported bytes per pixel: ' + bytesPerPixel);
  }
  
  return array;
}

/**
 * Handle CopyRect encoding
 */
export function handleCopyRect(
  rect: any,
  canvas: HTMLCanvasElement
): void {
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  try {
    // Copy rectangle from source to destination
    const imageData = ctx.getImageData(rect.srcX, rect.srcY, rect.width, rect.height);
    ctx.putImageData(imageData, rect.x, rect.y);
    console.log('CopyRect rendered successfully');
  } catch (err) {
    console.error('Error processing CopyRect:', err);
  }
}
