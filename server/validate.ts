import type { ScanRequest } from '../shared/types.ts';
import { emptyProfile } from '../shared/types.ts';

const MEDIA = ['image/jpeg', 'image/png', 'image/webp'];
/** ~6 MB of base64; the client downscales well below this. */
const MAX_IMAGE_CHARS = 8_000_000;

export function parseScanRequest(body: unknown): ScanRequest | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object.';
  const b = body as Record<string, unknown>;
  if (typeof b.image !== 'string' || b.image.length === 0) return 'Missing image.';
  if (b.image.length > MAX_IMAGE_CHARS) return 'Image too large.';
  if (typeof b.mediaType !== 'string' || !MEDIA.includes(b.mediaType)) return 'Unsupported image type.';
  const profile = { ...emptyProfile, ...(typeof b.profile === 'object' && b.profile ? b.profile : {}) };
  return {
    image: b.image,
    mediaType: b.mediaType as ScanRequest['mediaType'],
    lang: b.lang === 'en' ? 'en' : 'de',
    profile,
    feedback: Array.isArray(b.feedback) ? (b.feedback.slice(0, 30) as ScanRequest['feedback']) : [],
  };
}
