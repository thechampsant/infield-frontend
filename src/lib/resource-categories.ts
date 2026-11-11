export const CATEGORY_NAME_MAX_LENGTH = 24;

export function categoryNameError(name: string, otherNames: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Category name is required.";
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) return "Use 24 characters or fewer.";
  if (otherNames.some((other) => other.trim().toLowerCase() === trimmed.toLowerCase())) {
    return "A category with this name already exists.";
  }
  return null;
}
