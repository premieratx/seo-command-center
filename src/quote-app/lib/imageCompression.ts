/**
 * Compresses an image file to be under the target size using canvas
 * Converts to WebP for better compression when supported
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 900, // Default target: under 900KB (leaving buffer for 1MB)
  maxWidth: number = 2000,
  maxHeight: number = 2000
): Promise<{ blob: Blob; filename: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try to compress to target size
      const tryCompress = (quality: number): void => {
        // Try WebP first, fallback to JPEG
        const mimeType = 'image/webp';
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to JPEG if WebP fails
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }
                  handleBlob(jpegBlob, 'jpeg', quality);
                },
                'image/jpeg',
                quality
              );
              return;
            }
            handleBlob(blob, 'webp', quality);
          },
          mimeType,
          quality
        );
      };

      const handleBlob = (blob: Blob, format: string, quality: number): void => {
        const sizeKB = blob.size / 1024;
        
        if (sizeKB > maxSizeKB && quality > 0.1) {
          // Still too big, reduce quality
          tryCompress(quality - 0.1);
        } else {
          // Get original filename without extension
          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const newFilename = `${originalName}.${format}`;
          
          resolve({
            blob,
            filename: newFilename,
            originalSize: file.size,
            compressedSize: blob.size
          });
        }
      };

      // Start with high quality
      tryCompress(0.85);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
