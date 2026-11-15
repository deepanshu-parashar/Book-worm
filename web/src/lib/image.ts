const MAX_SIDE = 1568;

export interface PreparedImage {
  image: string;
  mediaType: 'image/jpeg';
}

/** Downscale a camera photo in the browser and return base64 JPEG. The photo is never stored. */
export async function prepareImage(file: File, maxSide = MAX_SIDE): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { image: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
  } finally {
    bitmap.close();
  }
}
