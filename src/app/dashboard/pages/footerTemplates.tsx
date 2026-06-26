import { v4 as uuidv4 } from 'uuid';
import type { ReactNode } from 'react';
import type { BlockData } from '@/types/index';

export interface FooterTemplate {
  id: string;
  name: string;
  description: string;
  Preview: () => ReactNode;
  buildBlocks: () => BlockData[];
}

const year = new Date().getFullYear();

const textBlock = (
  content: string,
  style: React.CSSProperties = {}
): BlockData => ({
  uniqueId: uuidv4(),
  type: 'text',
  content,
  style: {
    padding: '8px 24px',
    width: '100%',
    textAlign: 'center',
    ...style,
  },
});

const columnContainer = (
  children: BlockData[][],
  style: React.CSSProperties = {}
): BlockData => ({
  uniqueId: uuidv4(),
  type: 'column',
  content: '',
  children,
  style: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    gap: '32px',
    padding: '32px 24px',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    ...style,
  },
});

const previewShell =
  'border border-gray-200 rounded-md bg-white shadow-sm h-16 w-full overflow-hidden';

export const footerTemplates: FooterTemplate[] = [
  {
    id: 'simple-copyright',
    name: 'Simple Copyright',
    description: 'A single centered copyright line — minimal and clean.',
    Preview: () => (
      <div className={`${previewShell} flex items-center justify-center`}>
        <span className="text-[10px] text-gray-600">© {year} Brand. All rights reserved.</span>
      </div>
    ),
    buildBlocks: () => [
      textBlock(`© ${year} Brand. All rights reserved.`, {
        fontSize: '14px',
        color: '#6b7280',
        padding: '24px',
      }),
    ],
  },
  {
    id: 'brand-copyright',
    name: 'Brand + Copyright',
    description: 'Brand name on top, copyright line beneath it.',
    Preview: () => (
      <div className={`${previewShell} flex flex-col items-center justify-center`}>
        <span className="text-xs font-bold">Brand</span>
        <span className="text-[9px] text-gray-500">© {year} Brand. All rights reserved.</span>
      </div>
    ),
    buildBlocks: () => [
      textBlock('Brand', {
        fontSize: '20px',
        fontWeight: 700,
        padding: '20px 24px 0',
      }),
      textBlock(`© ${year} Brand. All rights reserved.`, {
        fontSize: '13px',
        color: '#6b7280',
        padding: '0 24px 20px',
      }),
    ],
  },
  {
    id: 'tagline-stack',
    name: 'Brand + Tagline + Copyright',
    description: 'Brand, supporting tagline, and a copyright line.',
    Preview: () => (
      <div className={`${previewShell} flex flex-col items-center justify-center`}>
        <span className="text-[11px] font-bold">Brand</span>
        <span className="text-[8px] text-gray-500">Building better experiences</span>
        <span className="text-[8px] text-gray-400">© {year} Brand</span>
      </div>
    ),
    buildBlocks: () => [
      textBlock('Brand', {
        fontSize: '20px',
        fontWeight: 700,
        padding: '20px 24px 0',
      }),
      textBlock('Building better experiences', {
        fontSize: '13px',
        color: '#6b7280',
        padding: '4px 24px',
      }),
      textBlock(`© ${year} Brand. All rights reserved.`, {
        fontSize: '12px',
        color: '#9ca3af',
        padding: '0 24px 20px',
      }),
    ],
  },
  {
    id: 'three-column',
    name: 'Three Column Links',
    description: 'Dark footer with three columns: company, resources, contact.',
    Preview: () => (
      <div
        className={`${previewShell} flex items-stretch gap-2 p-2`}
        style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}
      >
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="text-[8px] font-semibold">Company</span>
          <span className="text-[7px] opacity-70">About</span>
          <span className="text-[7px] opacity-70">Careers</span>
        </div>
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="text-[8px] font-semibold">Resources</span>
          <span className="text-[7px] opacity-70">Docs</span>
          <span className="text-[7px] opacity-70">Blog</span>
        </div>
        <div className="flex flex-1 flex-col gap-[2px]">
          <span className="text-[8px] font-semibold">Contact</span>
          <span className="text-[7px] opacity-70">hello@brand.com</span>
        </div>
      </div>
    ),
    buildBlocks: () => [
      columnContainer([
        [
          textBlock('Company', {
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'left',
            padding: '0 0 8px 0',
          }),
          textBlock('About', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
          textBlock('Careers', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
          textBlock('Press', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
        ],
        [
          textBlock('Resources', {
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'left',
            padding: '0 0 8px 0',
          }),
          textBlock('Docs', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
          textBlock('Blog', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
          textBlock('Support', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
        ],
        [
          textBlock('Contact', {
            fontSize: '14px',
            fontWeight: 600,
            textAlign: 'left',
            padding: '0 0 8px 0',
          }),
          textBlock('hello@brand.com', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
          textBlock('+1 (555) 010-1234', {
            fontSize: '13px',
            textAlign: 'left',
            padding: '2px 0',
            color: '#94a3b8',
          }),
        ],
      ]),
      textBlock(`© ${year} Brand. All rights reserved.`, {
        fontSize: '12px',
        color: '#94a3b8',
        padding: '16px 24px',
        backgroundColor: '#0b1220',
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
