"use client";
import { useDroppable } from "@dnd-kit/core";
import RenderBlock from "./renderblock";

export default function Canvas({ canvasBlocks }) {
  const { setNodeRef } = useDroppable({ id: "canvas" });

  return (
    <div className="flex-1 bg-slate-100 overflow-auto p-4" ref={setNodeRef}>
      <h2 className="text-xl font-semibold mb-4">Canvas</h2>
      <div className="bg-white w-full h-[800px] shadow-md p-4">
        {canvasBlocks.map((block) => (
          <RenderBlock key={block.uniqueId} block={block} />
        ))}
      </div>
    </div>
  );
}
