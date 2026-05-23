import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface BlockData {
  id?: string;
  label?: string;
  description?: string;
  uniqueId: string;
  content: string;
  type:
    | 'column'
    | 'text'
    | 'row'
    | 'hero'
    | 'hero-main'
    | 'hero-centered'
    | 'stats'
    | 'progress'
    | 'countdown'
    | 'button'
    | 'icon'
    | 'input'
    | 'radio'
    | 'checkbox'
    | 'badge'
    | 'alert'
    | 'avatar'
    | 'separator'
    | 'skeleton'
    | 'switch'
    | 'textarea'
    | 'table'
    | 'tabs'
    | 'image'
    | 'card'
    | 'shape-divider'
    | 'slider'
    | 'nav-bar'
    | 'contact'
    | 'contact-simple'
    | 'content-features'
    | 'content-gallery'
    | 'content-icons'
    | 'content-categories'
    | 'content-detail'
    | 'content-split'
    | 'content-trio'
    | 'ecommerce-grid'
    | 'ecommerce-detail'
    | 'ecommerce-info'
    | 'ecommerce-info-alt'
    | 'feature-trio'
    | 'feature-vertical'
    | 'feature-side-image'
    | 'feature-horizontal'
    | 'feature-boxed'
    | 'feature-zigzag'
    | 'feature-checklist'
    | 'feature-list';
  children?: BlockData[][];
  style?: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
  icon?: string;
  events?: {
    onClick?: string;
    onClickValue?: string;
  };
}

export interface CanvasState {
  blocks: BlockData[];
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
  selectedLabel: string;
  selectedBlock: BlockData | null;
  selectedPart: string | null; // e.g. "titleStyle", "descriptionStyle"
  selectedValue: number | null;
}

const initialState: CanvasState = {
  blocks: [],
  headerBlocks: [],
  footerBlocks: [],
  viewMode: 'desktop',
  selectedLabel: '',
  selectedBlock: null,
  selectedPart: null,
  selectedValue: null,
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

const takeBlockFromTree = (
  blocks: BlockData[],
  blockId: string
): { blocks: BlockData[]; removedBlock?: BlockData } => {
  let removedBlock: BlockData | undefined;

  const nextBlocks = blocks
    .map((block) => {
      if (!block.children) return block;

      const nextChildren = block.children.map((column) => {
        const nextColumn: BlockData[] = [];

        for (const child of column) {
          if (child.uniqueId === blockId) {
            removedBlock = child;
            continue;
          }

          const result = takeBlockFromTree([child], blockId);
          if (result.removedBlock) {
            removedBlock = result.removedBlock;
            nextColumn.push(result.blocks[0]);
          } else {
            nextColumn.push(child);
          }
        }

        return nextColumn;
      });

      return {
        ...block,
        children: nextChildren,
      };
    })
    .filter((block) => {
      if (block.uniqueId === blockId) {
        removedBlock = block;
        return false;
      }

      return true;
    });

  return { blocks: nextBlocks, removedBlock };
};

const appendBlockToColumn = (
  blocks: BlockData[],
  targetBlockId: string,
  columnIndex: number,
  blockToInsert: BlockData
): BlockData[] => {
  return blocks.map((block) => {
    if (block.uniqueId === targetBlockId) {
      const nextChildren = [...(block.children || [])];
      nextChildren[columnIndex] = [...(nextChildren[columnIndex] || []), blockToInsert];

      return {
        ...block,
        children: nextChildren,
      };
    }

    if (block.children) {
      return {
        ...block,
        children: block.children.map((column) =>
          appendBlockToColumn(column, targetBlockId, columnIndex, blockToInsert)
        ),
      };
    }

    return block;
  });
};

const findBlockById = (blocks: BlockData[], blockId: string): BlockData | null => {
  for (const block of blocks) {
    if (block.uniqueId === blockId) return block;

    if (block.children) {
      for (const column of block.children) {
        const found = findBlockById(column, blockId);
        if (found) return found;
      }
    }
  }

  return null;
};

const normalizeBlockTreeIds = (
  blocks: BlockData[] = [],
  usedIds = new Set<string>()
): BlockData[] =>
  blocks.map((block) => {
    const currentId = typeof block.uniqueId === 'string' ? block.uniqueId.trim() : '';
    const uniqueId = currentId && !usedIds.has(currentId) ? currentId : uuidv4();
    usedIds.add(uniqueId);

    return {
      ...block,
      uniqueId,
      children: block.children?.map((column) => normalizeBlockTreeIds(column, usedIds)),
    };
  });

const moveColumnBetweenRows = (
  blocks: BlockData[],
  sourceRowBlockId: string,
  sourceColumnIndex: number,
  targetRowBlockId: string,
  targetColumnIndex: number
): BlockData[] => {
  let movedColumn: BlockData[] | null = null;

  const removeColumnFromRow = (items: BlockData[]): BlockData[] =>
    items.map((block) => {
      if (block.uniqueId === sourceRowBlockId) {
        const currentChildren = [...(block.children || [])];
        if (sourceColumnIndex < 0 || sourceColumnIndex >= currentChildren.length) {
          return block;
        }

        movedColumn = currentChildren[sourceColumnIndex];
        currentChildren.splice(sourceColumnIndex, 1);

        return {
          ...block,
          children: currentChildren.length > 0 ? currentChildren : [[]],
        };
      }

      if (block.children) {
        return {
          ...block,
          children: block.children.map((column) => removeColumnFromRow(column)),
        };
      }

      return block;
    });

  const blocksAfterRemoval = removeColumnFromRow(blocks);

  if (!movedColumn) return blocks;

  const insertColumnIntoRow = (items: BlockData[]): BlockData[] =>
    items.map((block) => {
      if (block.uniqueId === targetRowBlockId) {
        const currentChildren = [...(block.children || [])];
        const rawIndex =
          sourceRowBlockId === targetRowBlockId && sourceColumnIndex < targetColumnIndex
            ? targetColumnIndex - 1
            : targetColumnIndex;
        const safeIndex = Math.max(0, Math.min(rawIndex, currentChildren.length));
        currentChildren.splice(safeIndex, 0, movedColumn || []);

        return {
          ...block,
          children: currentChildren,
        };
      }

      if (block.children) {
        return {
          ...block,
          children: block.children.map((column) => insertColumnIntoRow(column)),
        };
      }

      return block;
    });

  return insertColumnIntoRow(blocksAfterRemoval);
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
    moveBlockToColumn: (
      state,
      action: PayloadAction<{
        activeId: string;
        targetBlockId: string;
        columnIndex: number;
      }>
    ) => {
      const { activeId, targetBlockId, columnIndex } = action.payload;

      if (activeId === targetBlockId) return;

      const { blocks, removedBlock } = takeBlockFromTree(state.blocks, activeId);
      if (!removedBlock) return;

      state.blocks = appendBlockToColumn(blocks, targetBlockId, columnIndex, removedBlock);
    },
    moveRowColumn: (
      state,
      action: PayloadAction<{
        sourceRowBlockId: string;
        sourceColumnIndex: number;
        targetRowBlockId: string;
        targetColumnIndex: number;
      }>
    ) => {
      const { sourceRowBlockId, sourceColumnIndex, targetRowBlockId, targetColumnIndex } =
        action.payload;

      state.blocks = moveColumnBetweenRows(
        state.blocks,
        sourceRowBlockId,
        sourceColumnIndex,
        targetRowBlockId,
        targetColumnIndex
      );

      if (
        state.selectedBlock &&
        (state.selectedBlock.uniqueId === sourceRowBlockId ||
          state.selectedBlock.uniqueId === targetRowBlockId)
      ) {
        state.selectedBlock = findBlockById(state.blocks, state.selectedBlock.uniqueId) || null;
      }
    },
    setViewMode: (state, action: PayloadAction<'desktop' | 'tablet' | 'mobile'>) => {
      state.viewMode = action.payload;
    },
    setBlocks: (state, action: PayloadAction<BlockData[]>) => {
      state.blocks = normalizeBlockTreeIds(action.payload);
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
    moveBlock: (state, action: PayloadAction<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = action.payload;
      const activeIndex = state.blocks.findIndex((block) => block.uniqueId === activeId);
      const overIndex = state.blocks.findIndex((block) => block.uniqueId === overId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      const [movedBlock] = state.blocks.splice(activeIndex, 1);
      state.blocks.splice(overIndex, 0, movedBlock);
    },
    insertColumn: (
      state,
      action: PayloadAction<{ targetBlockId: string; columnIndex: number }>
    ) => {
      const { targetBlockId, columnIndex } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === targetBlockId) {
          const updatedChildren = [...(block.children || [])];
          const safeIndex = Math.max(0, Math.min(columnIndex, updatedChildren.length));
          updatedChildren.splice(safeIndex, 0, []);

          return {
            ...block,
            children: updatedChildren,
          };
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

      if (state.selectedBlock?.uniqueId === targetBlockId) {
        const updatedChildren = [...(state.selectedBlock.children || [])];
        const safeIndex = Math.max(0, Math.min(columnIndex, updatedChildren.length));
        updatedChildren.splice(safeIndex, 0, []);
        state.selectedBlock.children = updatedChildren;
      }
    },
    removeColumn: (
      state,
      action: PayloadAction<{ targetBlockId: string; columnIndex: number }>
    ) => {
      const { targetBlockId, columnIndex } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === targetBlockId) {
          const updatedChildren = [...(block.children || [])];
          if (updatedChildren.length <= 1) return block;

          updatedChildren.splice(columnIndex, 1);
          return {
            ...block,
            children: updatedChildren,
          };
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

      if (state.selectedBlock?.uniqueId === targetBlockId) {
        const updatedChildren = [...(state.selectedBlock.children || [])];
        if (updatedChildren.length > 1) {
          updatedChildren.splice(columnIndex, 1);
          state.selectedBlock.children = updatedChildren;
        }
      }
    },
    setSelectedLabel: (state, action: PayloadAction<string>) => {
      state.selectedLabel = action.payload;
    },
    setSelectedBlock: (state, action: PayloadAction<BlockData>) => {
      state.selectedBlock = action.payload;
      state.selectedPart = null; // Clear sub-part when selecting a new block
    },
    setSelectedPart: (state, action: PayloadAction<string | null>) => {
      state.selectedPart = action.payload;
    },
    setSelectedValue: (state, action: PayloadAction<number>) => {
      state.selectedValue = action.payload;
    },
    clearSelectedLabel: (state) => {
      state.selectedLabel = '';
      state.selectedBlock = null;
      state.selectedPart = null;
    },
    updateSelectedBlockStyles: (state, action: PayloadAction<Partial<React.CSSProperties>>) => {
      if (state.selectedBlock) {
        const { selectedPart } = state;

        if (selectedPart) {
          // Update a specific part inside the content JSON
          try {
            const contentObj = JSON.parse(state.selectedBlock.content);
            const partStyleKey = selectedPart.endsWith('Style') ? selectedPart : `${selectedPart}Style`;
            contentObj[partStyleKey] = {
              ...(contentObj[partStyleKey] || {}),
              ...action.payload,
            };
            const newContent = JSON.stringify(contentObj);
            state.selectedBlock.content = newContent;

            // Sync with main blocks tree
            const updateInTree = (block: BlockData): BlockData => {
              if (block.uniqueId === state.selectedBlock!.uniqueId) {
                return { ...block, content: newContent };
              }
              if (block.children) {
                return {
                  ...block,
                  children: block.children.map((col) => col.map(updateInTree)),
                };
              }
              return block;
            };
            state.blocks = state.blocks.map(updateInTree);
          } catch (e) {
            console.error('Failed to update part style:', e);
          }
        } else {
          // Standard block style update
          state.selectedBlock.style = {
            ...state.selectedBlock.style,
            ...action.payload,
          };

          const updateBlock = (block: BlockData): BlockData => {
            if (block.uniqueId === state.selectedBlock!.uniqueId) {
              return {
                ...block,
                style: {
                  ...block.style,
                  ...action.payload,
                },
              };
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
        }
      }
    },
    updateSelectedBlockHoverStyles: (
      state,
      action: PayloadAction<Partial<React.CSSProperties>>
    ) => {
      if (state.selectedBlock) {
        state.selectedBlock.hoverStyle = {
          ...(state.selectedBlock.hoverStyle || {}),
          ...action.payload,
        };

        const updateBlock = (block: BlockData): BlockData => {
          if (block.uniqueId === state.selectedBlock!.uniqueId) {
            return {
              ...block,
              hoverStyle: {
                ...(block.hoverStyle || {}),
                ...action.payload,
              },
            };
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
      }
    },
    updateBlockContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const { id, content } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === id) {
          return { ...block, content };
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

      if (state.selectedBlock && state.selectedBlock.uniqueId === id) {
        state.selectedBlock = {
          ...state.selectedBlock,
          content: content,
        };
      }
    },
    updateBlockEvents: (
      state,
      action: PayloadAction<{ id: string; events: BlockData['events'] }>
    ) => {
      const { id, events } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === id) {
          return { ...block, events };
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

      if (state.selectedBlock && state.selectedBlock.uniqueId === id) {
        state.selectedBlock.events = events;
      }
    },
    updateBlockIcon: (state, action: PayloadAction<{ id: string; icon?: string }>) => {
      const { id, icon } = action.payload;

      const updateBlock = (block: BlockData): BlockData => {
        if (block.uniqueId === id) {
          return { ...block, icon };
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

      if (state.selectedBlock && state.selectedBlock.uniqueId === id) {
        state.selectedBlock.icon = icon;
      }
    },
    setCanvasState: (state, action: PayloadAction<CanvasState>) => {
      const usedIds = new Set<string>();

      return {
        ...action.payload,
        blocks: normalizeBlockTreeIds(action.payload.blocks, usedIds),
        headerBlocks: normalizeBlockTreeIds(action.payload.headerBlocks, usedIds),
        footerBlocks: normalizeBlockTreeIds(action.payload.footerBlocks, usedIds),
        selectedBlock: null,
      };
    },
    setLayoutBlocks: (
      state,
      action: PayloadAction<{ headerBlocks: BlockData[]; footerBlocks: BlockData[] }>
    ) => {
      const usedIds = new Set<string>();
      state.headerBlocks = normalizeBlockTreeIds(action.payload.headerBlocks, usedIds);
      state.footerBlocks = normalizeBlockTreeIds(action.payload.footerBlocks, usedIds);
    },
  },
});

export const {
  addBlock,
  setBlocks,
  addBlockToColumn,
  moveBlockToColumn,
  moveRowColumn,
  moveBlock,
  insertColumn,
  removeColumn,
  setViewMode,
  removeBlock,
  setSelectedLabel,
  setSelectedBlock,
  setSelectedPart,
  setSelectedValue,
  clearSelectedLabel,
  updateSelectedBlockStyles,
  updateSelectedBlockHoverStyles,
  updateBlockContent,
  updateBlockEvents,
  updateBlockIcon,
  setCanvasState,
  setLayoutBlocks,
} = canvasSlice.actions;

export default canvasSlice.reducer;
