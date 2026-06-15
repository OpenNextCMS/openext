import React from 'react';
<<<<<<< HEAD
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
=======
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
>>>>>>> khadija
import { useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';
import { headerColorPresets, matchPreset } from '@/app/dashboard/pages/headerColors';
import type { BlockData } from '@/types/index';

<<<<<<< HEAD
=======
type NavbarLinkContent = {
  label: string;
  href: string;
  onClick: string;
  onClickValue: string;
};

>>>>>>> khadija
interface NavbarContent extends Record<string, unknown> {
  layout?: string;
  logo?: string;
  logoType?: string;
<<<<<<< HEAD
  logoSource?: string;
  logoImage?: string;
=======
  logoImage?: string;
  links: NavbarLinkContent[];
>>>>>>> khadija
}

interface NavbarPropertiesProps {
  selectedBlock: BlockData;
  navbarContent: NavbarContent;
<<<<<<< HEAD
=======
  availablePages: { slug: string; pageName: string }[];
>>>>>>> khadija
  handleJsonContentChange: <T extends Record<string, unknown>>(
    content: T,
    key: keyof T,
    value: unknown
  ) => void;
<<<<<<< HEAD
  handleImageUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (path: string) => void
  ) => void;
=======
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
>>>>>>> khadija
  isUploadingImage: boolean;
}

export const NavbarProperties: React.FC<NavbarPropertiesProps> = ({
  selectedBlock,
  navbarContent,
<<<<<<< HEAD
=======
  availablePages,
>>>>>>> khadija
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  const dispatch = useAppDispatch();
<<<<<<< HEAD
=======

  const handleNavbarLinkChange = (index: number, key: keyof NavbarLinkContent, value: string) => {
    const updatedLinks = [...navbarContent.links];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

  const addNavbarLink = () => {
    const updatedLinks = [
      ...navbarContent.links,
      { label: 'New Link', href: '#', onClick: 'none', onClickValue: '' },
    ];
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

  const removeNavbarLink = (index: number) => {
    const updatedLinks = navbarContent.links.filter(
      (_link: NavbarLinkContent, i: number) => i !== index
    );
    handleJsonContentChange(navbarContent, 'links', updatedLinks);
  };

>>>>>>> khadija
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
<<<<<<< HEAD
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
=======
            dispatch(updateSelectedBlockStyles({ backgroundColor: preset.backgroundColor, color: preset.color }));
          }}
        >
          {headerColorPresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
>>>>>>> khadija
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
<<<<<<< HEAD
              onChange={(e) =>
                dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))
              }
=======
              onChange={(e) => dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))}
>>>>>>> khadija
              className="h-8 w-10 cursor-pointer rounded border"
            />
            <Input
              className="h-8 text-xs"
              value={currentBg}
<<<<<<< HEAD
              onChange={(e) =>
                dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))
              }
=======
              onChange={(e) => dispatch(updateSelectedBlockStyles({ backgroundColor: e.target.value }))}
>>>>>>> khadija
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
<<<<<<< HEAD
          onChange={(e) => {
            const logoType = e.target.value;
            handleJsonContentChange(navbarContent, 'logoType', logoType);
            if (logoType !== 'image') {
              handleJsonContentChange({ ...navbarContent, logoType }, 'logoSource', 'custom');
            }
          }}
=======
          onChange={(e) => handleJsonContentChange(navbarContent, 'logoType', e.target.value)}
>>>>>>> khadija
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
        </select>
      </div>

      {navbarContent.logoType === 'image' ? (
        <div className="space-y-3">
<<<<<<< HEAD
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
=======
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
            onChange={(e) => handleImageUpload(e, (path) => handleJsonContentChange(navbarContent, 'logoImage', path))}
            disabled={isUploadingImage}
          />
>>>>>>> khadija
        </div>
      ) : (
        <Input
          className="h-8 text-sm"
          value={navbarContent.logo}
          onChange={(e) => handleJsonContentChange(navbarContent, 'logo', e.target.value)}
          placeholder="Brand Logo"
        />
      )}

<<<<<<< HEAD
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Menu links are managed from the Menu Redirect plugin.
        <Link
          href="/dashboard/plugins/menu-redirect/editor"
          className="ml-1 font-medium text-primary hover:underline"
        >
          Open visual editor
        </Link>
=======
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground uppercase">Nav Links</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={addNavbarLink}>Add Link</Button>
        </div>
        <div className="space-y-3">
          {navbarContent.links.map((link: NavbarLinkContent, index: number) => (
            <div key={index} className="space-y-2 p-2 border rounded bg-muted/10 relative">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 absolute top-1 right-1 text-muted-foreground hover:text-destructive" onClick={() => removeNavbarLink(index)}>
                <Trash2 className="h-3 w-3" />
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-7 text-[11px]" value={link.label} onChange={(e) => handleNavbarLinkChange(index, 'label', e.target.value)} placeholder="Label" />
                <Input className="h-7 text-[11px]" value={link.href} onChange={(e) => handleNavbarLinkChange(index, 'href', e.target.value)} placeholder="Href" />
              </div>
              <select
                className="h-7 w-full rounded border bg-background px-1 text-[10px]"
                value=""
                onChange={(e) => {
                  const slug = e.target.value;
                  if (!slug) return;
                  handleNavbarLinkChange(index, 'href', `/${slug}`);
                }}
              >
                <option value="">{availablePages.length === 0 ? 'No pages found' : 'Link to page…'}</option>
                {availablePages.map((p) => <option key={p.slug} value={p.slug}>{p.pageName}</option>)}
              </select>
            </div>
          ))}
        </div>
>>>>>>> khadija
      </div>
    </div>
  );
};
