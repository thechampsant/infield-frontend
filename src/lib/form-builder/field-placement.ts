import type { ComponentType, FormField } from "./types";

export function isFormContainer(type: ComponentType) {
  return type === "section-group" || type === "add-more-block";
}

export function canPlaceField(
  fields: FormField[],
  type: ComponentType,
  parentId: string | null,
  movingId?: string,
) {
  if (parentId === null) return true;
  const parent = fields.find((field) => field.id === parentId);
  if (!parent || !isFormContainer(parent.type) || parent.id === movingId) return false;
  if (!isFormContainer(type)) return true;

  // Two container levels are supported. Moving a group carries its children.
  return parent.type !== type && parent.parentId === null &&
    !fields.some((field) => field.parentId === movingId && isFormContainer(field.type));
}

/** index identifies the gap in the original, sorted list of siblings. */
export function placeField(fields: FormField[], field: FormField, parentId: string | null, index: number) {
  const siblings = fields.filter((item) => item.parentId === parentId).sort((a, b) => a.order - b.order);
  const originalIndex = siblings.findIndex((item) => item.id === field.id);
  if (originalIndex >= 0 && (index === originalIndex || index === originalIndex + 1)) return fields;

  siblings.splice(index, 0, { ...field, parentId });
  if (originalIndex >= 0) siblings.splice(originalIndex < index ? originalIndex : originalIndex + 1, 1);
  return [
    ...fields.filter((item) => item.id !== field.id && item.parentId !== parentId),
    ...siblings.map((item, order) => ({ ...item, order })),
  ];
}
