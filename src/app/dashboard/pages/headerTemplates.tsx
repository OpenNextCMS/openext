import { v4 as uuidv4 } from 'uuid';
import type { ReactNode } from 'react';
import type { BlockData } from '@/types/index';

export interface HeaderTemplate {
  id: string;
  name: string;
  description: string;
  Preview: () => ReactNode;
  buildBlocks: () => BlockData[];
}

const defaultLinks = [
  { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
  { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
  { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
  { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
];

type NavbarLayout = 'horizontal' | 'vertical' | 'hamburger' | 'two-line';

const navbarBlock = (
  links = defaultLinks,
  logo = 'Brand',
  layout: NavbarLayout = 'horizontal'
): BlockData => ({
  uniqueId: uuidv4(),
  type: 'nav-bar',
  content: JSON.stringify({
    logo,
    logoType: 'text',
    logoImage: '',
    layout,
    links,
  }),
  style: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: '12px 24px',
  },
});

const textBlock = (
  content: string,
  style: React.CSSProperties = {},
  type: BlockData['type'] = 'text'
): BlockData => ({
  uniqueId: uuidv4(),
  type,
  content,
  style: {
    padding: '12px 24px',
    width: '100%',
    textAlign: 'center',
    ...style,
  },
});

const buttonBlock = (label: string): BlockData => ({
  uniqueId: uuidv4(),
  type: 'button',
  content: label,
  style: {
    padding: '10px 20px',
    backgroundColor: '#111111',
    color: '#ffffff',
    borderRadius: '6px',
    fontWeight: 600,
  },
});

const rowBlock = (children: BlockData[][]): BlockData => ({
  uniqueId: uuidv4(),
  type: 'row',
  content: '',
  children,
  style: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
  },
});

const previewShell =
  'border border-gray-200 rounded-md bg-white shadow-sm h-16 w-full overflow-hidden';

export const headerTemplates: HeaderTemplate[] = [
  {
    id: 'horizontal-menu',
    name: 'Horizontal Menu',
    description: 'Logo on the left, links inline on the right.',
    Preview: () => (
      <div className={`${previewShell} flex items-center justify-between px-3`}>
        <span className="text-xs font-semibold">Brand</span>
        <div className="flex gap-2 text-[10px] text-gray-600">
          <span>Home</span>
          <span>About</span>
          <span>Services</span>
          <span>Contact</span>
        </div>
      </div>
    ),
    buildBlocks: () => [navbarBlock(defaultLinks, 'Brand', 'horizontal')],
  },
  {
    id: 'hamburger-menu',
    name: 'Hamburger Menu',
    description: 'Logo plus a hamburger icon that opens a slide-down menu.',
    Preview: () => (
      <div className={`${previewShell} flex items-center justify-between px-3`}>
        <span className="text-xs font-semibold">Brand</span>
        <div className="flex flex-col gap-[3px]">
          <span className="block h-[2px] w-4 bg-gray-700" />
          <span className="block h-[2px] w-4 bg-gray-700" />
          <span className="block h-[2px] w-4 bg-gray-700" />
        </div>
      </div>
    ),
    buildBlocks: () => [navbarBlock(defaultLinks, 'Brand', 'hamburger')],
  },
  {
    id: 'two-line',
    name: 'Two Line',
    description: 'Logo on top, navigation links below — split across two rows.',
    Preview: () => (
      <div className={`${previewShell} flex flex-col items-center justify-center py-1`}>
        <span className="text-xs font-semibold">Brand</span>
        <div className="mt-1 flex gap-2 text-[9px] text-gray-600">
          <span>Home</span>
          <span>About</span>
          <span>Services</span>
          <span>Contact</span>
        </div>
      </div>
    ),
    buildBlocks: () => [navbarBlock(defaultLinks, 'Brand', 'two-line')],
  },
  {
    id: 'vertical-menu',
    name: 'Vertical Menu',
    description: 'Logo at the top with links stacked vertically below.',
    Preview: () => (
      <div className={`${previewShell} flex items-start gap-3 px-3 py-2`}>
        <span className="text-xs font-semibold">Brand</span>
        <div className="flex flex-col gap-[2px] text-[9px] text-gray-600">
          <span>Home</span>
          <span>About</span>
          <span>Services</span>
        </div>
      </div>
    ),
    buildBlocks: () => [navbarBlock(defaultLinks, 'Brand', 'vertical')],
  },
  {
    id: 'nav-with-cta',
    name: 'Navigation with CTA',
    description: 'Links plus a prominent call-to-action button.',
    Preview: () => (
      <div className={`${previewShell} flex items-center justify-between px-3`}>
        <span className="text-xs font-semibold">Brand</span>
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <span>Home</span>
          <span>Pricing</span>
          <span>Docs</span>
          <span className="ml-1 rounded bg-black px-2 py-0.5 text-[9px] text-white">
            Get Started
          </span>
        </div>
      </div>
    ),
    buildBlocks: () => [
      rowBlock([
        [
          navbarBlock([
            { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
            { label: 'Pricing', href: '#', onClick: 'none', onClickValue: '' },
            { label: 'Docs', href: '#', onClick: 'none', onClickValue: '' },
          ]),
        ],
        [buttonBlock('Get Started')],
      ]),
    ],
  },
  {
    id: 'centered-brand',
    name: 'Centered Brand',
    description: 'Single brand name centered — minimal and bold.',
    Preview: () => (
      <div className={`${previewShell} flex items-center justify-center`}>
        <span className="text-sm font-bold tracking-wide">BRAND</span>
      </div>
    ),
    buildBlocks: () => [
      textBlock('BRAND', {
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '20px 24px',
      }),
    ],
  },
  {
    id: 'brand-tagline',
    name: 'Brand + Tagline',
    description: 'Brand name with a supporting tagline beneath it.',
    Preview: () => (
      <div className={`${previewShell} flex flex-col items-center justify-center`}>
        <span className="text-xs font-bold">Brand</span>
        <span className="text-[9px] text-gray-500">Welcome to our site</span>
      </div>
    ),
    buildBlocks: () => [
      textBlock('Brand', {
        fontSize: '24px',
        fontWeight: 700,
        padding: '12px 24px 0 24px',
      }),
      textBlock('Welcome to our site', {
        fontSize: '14px',
        color: '#6b7280',
        padding: '0 24px 12px 24px',
      }),
    ],
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch in the editor.',
    Preview: () => (
      <div
        className={`${previewShell.replace('border-gray-200', 'border-dashed border-gray-300')} flex items-center justify-center`}
      >
        <span className="text-[10px] text-gray-400">Empty starter</span>
      </div>
    ),
    buildBlocks: () => [],
  },
];
