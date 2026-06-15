import React from 'react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';
import { headerColorPresets, matchPreset } from '@/app/dashboard/pages/headerColors';
import type { BlockData } from '@/types/index';

interface NavbarContent extends Record<string, unknown> {
  layout?: string;
  logo?: string;
  logoType?: string;
  logoSource?: string;
  logoImage?: string;
}

interface NavbarPropertiesProps {
  selectedBlock: BlockData;
  navbarContent: NavbarContent;
  handleJsonContentChange: <T extends Record<string, unknown>>(
    content: T,
    key: keyof T,
    value: unknown
  ) => void;
  handleImageUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (path: string) => void
  ) => void;
  isUploadingImage: boolean;
}

export const NavbarProperties: React.FC<NavbarPropertiesProps> = ({
  selectedBlock,
  navbarContent,
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  const dispatch = useAppDispatch();
  const currentBg = (selectedBlock?.style?.backgroundColor as string) || '#ffffff';
  const currentFg = (selectedBlock?.style?.color as string) || '#111111';
  const currentPreset = matchPreset(currentBg, currentFg);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Layout</Label>
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={navbarContent.layout || 'horizontal'}
          onChange={(e) => handleJsonContentChange(navbarContent, 'layout', e.target.value)}
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
          <option value="hamburger">Hamburger</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Color Preset</Label>
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={currentPreset?.id || 'custom'}
          onChange={(e) => {
            const id = e.target.value;
            if (id === 'custom') return;
            const preset = headerColorPresets.find((p) => p.id === id);
            if (!preset) return;
            dispatch(
              updateSelectedBlockStyles({
                backgroundColor: preset.backgroundColor,
                color: preset.color,
              })
            );
          }}
        >
          {headerColorPresets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Background</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={currentBg.startsWith('#') ? currentBg : '#ffffff'}
              onChange={(e) =>
                dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))
              }
              className="h-8 w-10 cursor-pointer rounded border"
            />
            <Input
              className="h-8 text-xs"
              value={currentBg}
              onChange={(e) =>
                dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))
              }
              placeholder="#ffffff"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Text</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={currentFg.startsWith('#') ? currentFg : '#111111'}
              onChange={(e) => dispatch(updateSelectedBlockStyles({ color: e.target.value }))}
              className="h-8 w-10 cursor-pointer rounded border"
            />
            <Input
              className="h-8 text-xs"
              value={currentFg}
              onChange={(e) => dispatch(updateSelectedBlockStyles({ color: e.target.value }))}
              placeholder="#111111"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Logo Type</Label>
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={navbarContent.logoType || 'text'}
          onChange={(e) => {
            const logoType = e.target.value;
            handleJsonContentChange(navbarContent, 'logoType', logoType);
            if (logoType !== 'image') {
              handleJsonContentChange({ ...navbarContent, logoType }, 'logoSource', 'custom');
            }
          }}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>
      </div>

      {navbarContent.logoType === 'image' ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Logo Source</Label>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={navbarContent.logoSource || 'custom'}
              onChange={(e) => handleJsonContentChange(navbarContent, 'logoSource', e.target.value)}
            >
              <option value="website">Website logo</option>
              <option value="custom">Custom logo</option>
            </select>
          </div>

          {navbarContent.logoSource === 'website' ? (
            <p className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              The header will use the logo from Settings.
            </p>
          ) : (
            <>
              <Input
                className="h-8 text-sm"
                value={navbarContent.logoImage || ''}
                onChange={(e) => handleJsonContentChange(navbarContent, 'logoImage', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <Input
                type="file"
                accept="image/*"
                className="h-8 text-xs"
                onChange={(e) =>
                  handleImageUpload(e, (path) =>
                    handleJsonContentChange(navbarContent, 'logoImage', path)
                  )
                }
                disabled={isUploadingImage}
              />
            </>
          )}
        </div>
      ) : (
        <Input
          className="h-8 text-sm"
          value={navbarContent.logo}
          onChange={(e) => handleJsonContentChange(navbarContent, 'logo', e.target.value)}
          placeholder="Brand Logo"
        />
      )}

      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Menu links are managed from the Menu Redirect plugin.
        <Link
          href="/dashboard/plugins/menu-redirect/editor"
          className="ml-1 font-medium text-primary hover:underline"
        >
          Open visual editor
        </Link>
      </div>
    </div>
  );
};
