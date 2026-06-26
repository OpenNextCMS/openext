'use client';

import { useState } from 'react';
import { Trash2, Blocks } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedBlock,
  setSelectedLabel,
  updateBlockContent,
} from '@/redux/canvasSlice';

type AlertVariant = 'default' | 'destructive';
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type SeparatorOrientation = 'horizontal' | 'vertical';

interface BadgeContent {
  text: string;
  variant: BadgeVariant;
}

interface AlertContent {
  title: string;
  description: string;
  variant: AlertVariant;
}

interface AvatarContent {
  src: string;
  alt: string;
  fallback: string;
}

interface SeparatorContent {
  orientation: SeparatorOrientation;
}

interface SwitchContent {
  label: string;
  name: string;
  checked: boolean;
  labelStyle?: React.CSSProperties;
}

interface TextareaContent {
  label: string;
  placeholder: string;
  name: string;
  value: string;
  required: boolean;
  labelStyle?: React.CSSProperties;
}

interface TableContent {
  caption: string;
  headers: string[];
  rows: string[][];
}

interface TabsContentData {
  defaultValue: string;
  tabs: Array<{
    value: string;
    label: string;
    content: string;
  }>;
}

const parseJsonContent = <T,>(content: string | undefined, fallback: T): T => {
  if (!content || !content.startsWith('{')) return fallback;

  try {
    return { ...fallback, ...JSON.parse(content) };
  } catch {
    return fallback;
  }
};

const blockLabels: Record<string, string> = {
  badge: 'Badge',
  alert: 'Alert',
  avatar: 'Avatar',
  separator: 'Separator',
  skeleton: 'Skeleton',
  switch: 'Switch',
  textarea: 'Textarea',
  table: 'Table',
  tabs: 'Tabs',
};

export const ReusableUiBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const blockLabel = blockLabels[block.type] || 'Reusable UI';
  const blockStyle = block.style || {};

  const switchContent = parseJsonContent<SwitchContent>(block.content, {
    label: 'Enable option',
    name: 'enable_option',
    checked: false,
    labelStyle: {
      color: '#111827',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4',
      marginLeft: '10px',
    },
  });
  const textareaContent = parseJsonContent<TextareaContent>(block.content, {
    label: 'Message',
    placeholder: 'Enter your message',
    name: 'message',
    value: '',
    required: false,
    labelStyle: {
      color: '#111827',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4',
      marginBottom: '6px',
    },
  });
  const [switchChecked, setSwitchChecked] = useState(Boolean(switchContent.checked));
  const [textareaValue, setTextareaValue] = useState(textareaContent.value || '');

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isEditing) return;
    dispatch(setSelectedLabel(blockLabel));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const updateJsonLabel = <T extends { label: string }>(
    currentContent: T,
    nextLabel: string
  ) => {
    if (!isEditing || !block.uniqueId) return;

    dispatch(
      updateBlockContent({
        id: block.uniqueId,
        content: JSON.stringify({
          ...currentContent,
          label: nextLabel,
        }),
      })
    );
  };

  const editableLabelStyle: React.CSSProperties = {
    cursor: isEditing ? 'text' : 'inherit',
    outline: 'none',
  };

  const renderBlock = () => {
    if (block.type === 'badge') {
      const content = parseJsonContent<BadgeContent>(block.content, {
        text: 'New',
        variant: 'default',
      });

      return (
        <UiBadge variant={content.variant} style={blockStyle}>
          {content.text}
        </UiBadge>
      );
    }

    if (block.type === 'alert') {
      const content = parseJsonContent<AlertContent>(block.content, {
        title: 'Heads up',
        description: 'This is an alert message for your visitors.',
        variant: 'default',
      });

      return (
        <Alert variant={content.variant} style={blockStyle}>
          {content.title && <AlertTitle>{content.title}</AlertTitle>}
          {content.description && <AlertDescription>{content.description}</AlertDescription>}
        </Alert>
      );
    }

    if (block.type === 'avatar') {
      const content = parseJsonContent<AvatarContent>(block.content, {
        src: '',
        alt: 'User avatar',
        fallback: 'AT',
      });

      return (
        <Avatar style={blockStyle}>
          {content.src && <AvatarImage src={content.src} alt={content.alt} />}
          <AvatarFallback>{content.fallback}</AvatarFallback>
        </Avatar>
      );
    }

    if (block.type === 'separator') {
      const content = parseJsonContent<SeparatorContent>(block.content, {
        orientation: 'horizontal',
      });

      return <Separator orientation={content.orientation} style={blockStyle} />;
    }

    if (block.type === 'skeleton') {
      return <Skeleton style={blockStyle} />;
    }

    if (block.type === 'switch') {
      const labelStyle: React.CSSProperties = {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '10px',
        ...switchContent.labelStyle,
      };

      return (
        <div style={{ display: 'flex', alignItems: 'center', ...blockStyle }}>
          <Switch
            name={switchContent.name}
            checked={isEditing ? Boolean(switchContent.checked) : switchChecked}
            onCheckedChange={(nextChecked) => {
              if (!isEditing) setSwitchChecked(nextChecked);
            }}
            onClick={(e) => {
              if (isEditing) e.preventDefault();
            }}
          />
          {(isEditing || switchContent.label) && (
            <span style={labelStyle}>
              <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => updateJsonLabel(switchContent, e.currentTarget.innerText.trim())}
                onClick={(e) => e.stopPropagation()}
                style={editableLabelStyle}
              >
                {switchContent.label || 'Label'}
              </span>
            </span>
          )}
        </div>
      );
    }

    if (block.type === 'textarea') {
      const labelStyle: React.CSSProperties = {
        display: 'block',
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginBottom: '6px',
        ...textareaContent.labelStyle,
      };

      return (
        <div style={{ width: blockStyle.width || '100%' }}>
          {(isEditing || textareaContent.label) && (
            <label htmlFor={block.uniqueId} style={labelStyle}>
              <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => updateJsonLabel(textareaContent, e.currentTarget.innerText.trim())}
                onClick={(e) => e.stopPropagation()}
                style={editableLabelStyle}
              >
                {textareaContent.label || 'Label'}
              </span>
              {textareaContent.required ? ' *' : ''}
            </label>
          )}
          <Textarea
            id={block.uniqueId}
            name={textareaContent.name}
            placeholder={textareaContent.placeholder}
            required={textareaContent.required}
            value={isEditing ? textareaContent.value : textareaValue}
            readOnly={isEditing}
            onChange={(e) => setTextareaValue(e.target.value)}
            style={blockStyle}
          />
        </div>
      );
    }

    if (block.type === 'table') {
      const content = parseJsonContent<TableContent>(block.content, {
        caption: 'Service overview',
        headers: ['Service', 'Timeline', 'Status'],
        rows: [
          ['Website', '2 weeks', 'Active'],
          ['Mobile App', '4 weeks', 'Planned'],
        ],
      });
      const headers = Array.isArray(content.headers) ? content.headers : [];
      const rows = Array.isArray(content.rows) ? content.rows : [];

      return (
        <Table style={blockStyle}>
          {content.caption && (
            <TableCaption
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => {
                if (!isEditing || !block.uniqueId) return;
                dispatch(
                  updateBlockContent({
                    id: block.uniqueId,
                    content: JSON.stringify({
                      ...content,
                      caption: e.currentTarget.innerText.trim(),
                    }),
                  })
                );
              }}
            >
              {content.caption}
            </TableCaption>
          )}
          {headers.length > 0 && (
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={`${block.uniqueId}-head-${index}`}>
                    <span
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newHeaders = [...headers];
                        newHeaders[index] = e.currentTarget.innerText.trim();
                        dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: JSON.stringify({ ...content, headers: newHeaders }) }));
                      }}
                    >
                      {header}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${block.uniqueId}-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={`${block.uniqueId}-cell-${rowIndex}-${cellIndex}`}>
                    <span
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newRows = [...rows];
                        newRows[rowIndex][cellIndex] = e.currentTarget.innerText.trim();
                        dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: JSON.stringify({ ...content, rows: newRows }) }));
                      }}
                    >
                      {cell}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        );
        }

        if (block.type === 'tabs') {
        const content = parseJsonContent<TabsContentData>(block.content, {
        defaultValue: 'overview',
        tabs: [
          { value: 'overview', label: 'Overview', content: 'Overview content goes here.' },
          { value: 'details', label: 'Details', content: 'Details content goes here.' },
        ],
        });
        const tabs = Array.isArray(content.tabs) ? content.tabs : [];
        const defaultValue = content.defaultValue || tabs[0]?.value || 'tab-1';

        return (
        <Tabs defaultValue={defaultValue} style={blockStyle}>
          <TabsList>
            {tabs.map((tab, index) => (
              <TabsTrigger key={`${block.uniqueId}-trigger-${tab.value}`} value={tab.value}>
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newTabs = [...tabs];
                    newTabs[index].label = e.currentTarget.innerText.trim();
                    dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: JSON.stringify({ ...content, tabs: newTabs }) }));
                  }}
                >
                  {tab.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab, index) => (
            <TabsContent key={`${block.uniqueId}-content-${tab.value}`} value={tab.value}>
              <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newTabs = [...tabs];
                  newTabs[index].content = e.currentTarget.innerText.trim();
                  dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: JSON.stringify({ ...content, tabs: newTabs }) }));
                }}
              >
                {tab.content}
              </span>
            </TabsContent>
          ))}
        </Tabs>
        );
        }
    return null;
  };

  return (
    <div
      className="relative mb-4"
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <Blocks className="h-3 w-3" />
          <span>{blockLabel}</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={handleRemove}
            className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
            title={`Delete ${blockLabel.toLowerCase()}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <div
        style={{
          outline: isHovered && isEditing ? '1px solid #3b82f6' : 'none',
          outlineOffset: '2px',
        }}
      >
        {renderBlock()}
      </div>
    </div>
  );
};
