import { useDroppable } from "@dnd-kit/core";

export function DropZone({ parentId, index, empty }: { parentId: string | null; index: number; empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: JSON.stringify([parentId, index]),
    data: { parentId, index },
  });
  return (
    <div
      ref={setNodeRef}
      data-drop-parent={parentId ?? ""}
      data-drop-index={index}
      style={{
        boxSizing: "border-box", minHeight: isOver || empty ? 36 : 12,
        display: "grid", placeItems: "center", borderRadius: 6,
        border: `2px dashed ${isOver ? "#2563eb" : "#bfdbfe"}`,
        background: isOver ? "#dbeafe" : "transparent", color: "#475569", fontSize: 12,
      }}
    >
      {empty && "Drop fields here"}
    </div>
  );
}
