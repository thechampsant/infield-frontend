"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor,
  pointerWithin, rectIntersection, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";

export function BuilderDragContext({ children }: { children: ReactNode }) {
  const { dispatch } = useFormBuilder();
  const [label, setLabel] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } }),
  );

  function finishDrag({ active, over }: DragEndEvent) {
    setLabel("");
    const source = active.data.current;
    const target = over?.data.current;
    if (!source || !target) return;
    if (source.fieldId) {
      dispatch({ type: "MOVE_FIELD", fieldId: source.fieldId, toIndex: target.index, toParentId: target.parentId });
    } else {
      dispatch({ type: "ADD_FIELD", componentType: source.componentType, atIndex: target.index, parentId: target.parentId });
    }
    requestAnimationFrame(() => {
      document.querySelector('[data-builder-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      collisionDetection={(args) => args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)}
      onDragStart={({ active }) => setLabel(active.data.current?.label ?? "")}
      onDragCancel={() => setLabel("")}
      onDragEnd={finishDrag}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {label && <div style={{ background: "white", border: "1px solid #93c5fd", padding: 8, borderRadius: 6, width: "max-content", pointerEvents: "none" }}>{label}</div>}
      </DragOverlay>
    </DndContext>
  );
}
