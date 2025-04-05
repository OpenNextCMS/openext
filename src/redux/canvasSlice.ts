import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

interface BlockData {
  uniqueId: string;
  content: string;
  type: 'column' | 'text';
  children?: BlockData[][];
  style?: React.CSSProperties;
  icon?: string;
}

interface CanvasState {
  blocks: BlockData[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

const initialState: CanvasState = {
  blocks: [],
  viewMode: 'desktop',
};

const removeBlockFromChildren = (blocks: BlockData[][], blockId: string): BlockData[][] => {
  return blocks.map((column) =>
    column.filter((block) => {
      if (block.uniqueId === blockId) {
        return false;
      }
      if (block.children) {
        block.children = removeBlockFromChildren(block.children, blockId);
      }
      return true;
    })
  );
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    addBlock: (state, action: PayloadAction<Omit<BlockData, 'uniqueId'>>) => {
      const newBlock = {
        ...action.payload,
        style: action.payload.style || {},
        uniqueId: uuidv4(),
      };
      state.blocks.push(newBlock);
    },
    addBlockToColumn: (
      state,
      action: PayloadAction<{
        targetBlockId: string;
        columnIndex: number;
        newBlock: Omit<BlockData, 'uniqueId'>;
      }>
    ) => {
      const { targetBlockId, columnIndex, newBlock } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === targetBlockId) {
          const updatedChildren = [...(block.children || [])];
          updatedChildren[columnIndex] = [
            ...(updatedChildren[columnIndex] || []),
            { ...newBlock, style: newBlock.style || {}, uniqueId: uuidv4() },
          ];
          return { ...block, children: updatedChildren };
        }

        if (block.children) {
          return {
            ...block,
            children: block.children.map((col) => col.map((child) => updateBlock(child))),
          };
        }

        return block;
      };

      state.blocks = state.blocks.map(updateBlock);
    },
    setViewMode: (state, action: PayloadAction<'desktop' | 'tablet' | 'mobile'>) => {
      state.viewMode = action.payload;
    },
    removeBlock: (state, action: PayloadAction<string>) => {
      // First try to remove from top-level blocks
      state.blocks = state.blocks.filter((block) => {
        if (block.uniqueId === action.payload) {
          return false;
        }
        // If block has children, search through them
        if (block.children) {
          block.children = removeBlockFromChildren(block.children, action.payload);
        }
        return true;
      });
    },
  },
});

export const { addBlock, addBlockToColumn, setViewMode, removeBlock } = canvasSlice.actions;

export default canvasSlice.reducer;
