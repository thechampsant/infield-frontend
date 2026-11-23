import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { FormField } from "@/lib/form-builder/types";

export function FieldDragHandle({ field }: { field: FormField }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `field-${field.id}`,
    data: { fieldId: field.id, componentType: field.type, label: field.label },
  });
  return (
    <button
      type="button" ref={setNodeRef} {...attributes} {...listeners}
      aria-label={`Move ${field.label}`}
      onClick={(event) => event.stopPropagation()}
      style={{ padding: 2, background: "transparent", border: 0, cursor: "grab", touchAction: "none", color: "#64748b" }}
    >
      <GripVertical size={16} />
    </button>
  );
}
