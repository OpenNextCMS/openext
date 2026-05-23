import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

type NavbarLinkContent = {
  label: string;
  href: string;
  onClick: string;
  onClickValue: string;
};

interface MenuPluginPropertiesProps {
  selectedBlock: any;
  content: any;
  availablePages: { slug: string; pageName: string }[];
  availableBlogs: { slug: string; pageName: string }[];
  handleJsonContentChange: (content: any, key: string, value: any) => void;
}

export const MenuPluginProperties: React.FC<MenuPluginPropertiesProps> = ({
  selectedBlock,
  content,
  availablePages,
  availableBlogs,
  handleJsonContentChange,
}) => {
  const menuLinks: NavbarLinkContent[] = Array.isArray(content.links)
    ? content.links
    : [
        { label: 'Home', href: '/', onClick: 'redirect', onClickValue: '/' },
        { label: 'About', href: '/about-us', onClick: 'redirect', onClickValue: '/about-us' },
        { label: 'Contact', href: '/contact', onClick: 'redirect', onClickValue: '/contact' },
      ];

  const updateMenuLink = (index: number, key: keyof NavbarLinkContent, value: string) => {
    const updatedLinks = [...menuLinks];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    handleJsonContentChange(content, 'links', updatedLinks);
  };

  const updateMenuLinkFields = (index: number, values: Partial<NavbarLinkContent>) => {
    const updatedLinks = [...menuLinks];
    updatedLinks[index] = { ...updatedLinks[index], ...values };
    handleJsonContentChange(content, 'links', updatedLinks);
  };

  const addMenuLink = () => {
    handleJsonContentChange(content, 'links', [
      ...menuLinks,
      { label: 'New Link', href: '#', onClick: 'redirect', onClickValue: '#' },
    ]);
  };

  const removeMenuLink = (index: number) => {
    handleJsonContentChange(
      content,
      'links',
      menuLinks.filter((_link, linkIndex) => linkIndex !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase">Menu Logo</Label>
        <Input
          className="h-8 text-sm"
          value={content.logo || 'Menu'}
          onChange={(e) => handleJsonContentChange(content, 'logo', e.target.value)}
          placeholder="Menu"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground uppercase">Redirect Links</Label>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={addMenuLink}>
          Add Link
        </Button>
      </div>

      <div className="space-y-3">
        {menuLinks.map((link, index) => (
          <div key={index} className="space-y-2 rounded border bg-muted/10 p-2">
            <div className="flex items-center justify-between gap-2">
              <Input
                className="h-7 text-[11px]"
                value={link.label}
                onChange={(e) => updateMenuLink(index, 'label', e.target.value)}
                placeholder="Label"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeMenuLink(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <Input
              className="h-7 text-[11px]"
              value={link.href}
              onChange={(e) => {
                updateMenuLinkFields(index, { href: e.target.value, onClickValue: e.target.value });
              }}
              placeholder="/about or https://example.com"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-7 rounded border bg-background px-1 text-[10px]"
                value=""
                onChange={(e) => {
                  const slug = e.target.value;
                  if (!slug) return;
                  const href = `/${slug}`;
                  updateMenuLinkFields(index, { href, onClickValue: href });
                }}
              >
                <option value="">
                  {availablePages.length === 0 ? 'No pages found' : 'Pick a page...'}
                </option>
                {availablePages.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.pageName} (/{p.slug})</option>
                ))}
              </select>

              <select
                className="h-7 rounded border bg-background px-1 text-[10px]"
                value=""
                onChange={(e) => {
                  const slug = e.target.value;
                  if (!slug) return;
                  const href = `/blog/${slug}`;
                  updateMenuLinkFields(index, { href, onClickValue: href });
                }}
              >
                <option value="">
                  {availableBlogs.length === 0 ? 'No blogs found' : 'Pick a blog...'}
                </option>
                {availableBlogs.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.pageName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-7 rounded border bg-background px-1 text-[10px]"
                value={link.onClick || 'redirect'}
                onChange={(e) => updateMenuLink(index, 'onClick', e.target.value)}
              >
                <option value="redirect">Redirect</option>
                <option value="alert">Alert</option>
                <option value="none">None</option>
              </select>
              <Input
                className="h-7 text-[11px]"
                value={link.onClickValue || link.href || ''}
                onChange={(e) => updateMenuLink(index, 'onClickValue', e.target.value)}
                placeholder="Redirect URL"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
