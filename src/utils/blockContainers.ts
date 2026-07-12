// Shared identifiers for drag-and-drop "containers" in the editor.
//
// Every place a block can live is addressed by a container id:
//   - the canvas root                -> ROOT_CONTAINER ('root')
//   - a slot inside another block     -> zoneContainerId(blockId, columnIndex)
//
// dnd-kit's SortableContext uses these ids so that, on drop, we can resolve the
// exact target container + index and reorder precisely (see placeBlockAt in
// canvasSlice and handleDragEnd in editor.tsx).

export const ROOT_CONTAINER = 'root';

const SEP = '::';

export const zoneContainerId = (blockId: string, columnIndex: number): string =>
  `zone${SEP}${blockId}${SEP}${columnIndex}`;

export interface ParsedZone {
  blockId: string;
  columnIndex: number;
}

export const parseContainerId = (id: string): ParsedZone | null => {
  if (id === ROOT_CONTAINER) return null;
  const parts = id.split(SEP);
  if (parts[0] !== 'zone' || parts.length < 3) return null;
  const columnIndex = Number(parts[2]);
  if (Number.isNaN(columnIndex)) return null;
  return { blockId: parts[1], columnIndex };
};
