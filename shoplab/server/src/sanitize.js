import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong'];

export function sanitizeReview(html) {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],   // no attributes at all, so no onerror, src, href
  });
}