export const ACTION_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export const ACTION_FILE_HINT = "Accepted: PDF, JPG, PNG, or WebP";

export const ACTION_FILE_TYPE_ERROR =
  "Only PDF, JPG, PNG, or WebP files are allowed.";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedActionFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
}
