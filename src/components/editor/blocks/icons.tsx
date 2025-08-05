import { Type, Heading2, Image as ImageIcon, LayoutGrid, PlusSquare } from 'lucide-react';

export const iconMap = {
  text: <Type className="h-4 w-4 text-primary" />,
  heading: <Heading2 className="h-4 w-4 text-primary" />,
  image: <ImageIcon className="h-4 w-4 text-primary" />,
  '1-column': <LayoutGrid className="h-4 w-4 text-primary" />,
  '2-column': <LayoutGrid className="h-4 w-4 text-primary" />,
  '3-column': <LayoutGrid className="h-4 w-4 text-primary" />,
  defaultIcon: <PlusSquare className="h-4 w-4 text-primary" />,
} as const;

export const getIconForBlock = (iconId?: string) => {
  return iconMap[iconId as keyof typeof iconMap] || iconMap['defaultIcon'];
};
