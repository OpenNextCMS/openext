'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Layout, Grid, List, Columns, Settings2, Eye, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BlogFeedContent extends Record<string, unknown> {
  layout?: 'editorial' | 'side-by-side' | 'grid' | 'minimal';
  postsPerPage?: number;
  showAuthor?: boolean;
  showDate?: boolean;
  showReadingTime?: boolean;
  showCategory?: boolean;
  showSearch?: boolean;
  showCategories?: boolean;
  showExcerpt?: boolean;
  showSocial?: boolean;
  imageAspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  cardsPerRow?: number;
  borderRadius?: string;
  paginationType?: 'pagination' | 'infinite-scroll';
}

interface BlogFeedPropertiesProps {
  content: BlogFeedContent;
  handleJsonContentChange: <T extends Record<string, unknown>>(content: T, key: keyof T, value: unknown) => void;
}

export const BlogFeedProperties: React.FC<BlogFeedPropertiesProps> = ({
  content,
  handleJsonContentChange,
}) => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="layout" className="text-xs">
            <Layout className="h-3.5 w-3.5 mr-1.5" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="display" className="text-xs">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4 pt-4">
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-3 w-3" />
              Layout Settings
            </Label>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Feed Layout Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'grid', label: 'Grid', icon: Grid },
                    { id: 'editorial', label: 'Editorial', icon: Layout },
                    { id: 'side-by-side', label: 'List (Side)', icon: Columns },
                    { id: 'minimal', label: 'Minimal', icon: List },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleJsonContentChange(content, 'layout', style.id)}
                      className={`flex items-center gap-2 p-2 text-xs rounded-md border transition-all ${
                        content.layout === style.id 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'hover:border-primary/40'
                      }`}
                    >
                      <style.icon className="h-3.5 w-3.5" />
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {content.layout === 'grid' && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase">Cards Per Row</Label>
                  <Select 
                    value={String(content.cardsPerRow || 3)} 
                    onValueChange={(v) => handleJsonContentChange(content, 'cardsPerRow', parseInt(v))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Column</SelectItem>
                      <SelectItem value="2">2 Columns</SelectItem>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Image Aspect Ratio</Label>
                <Select 
                  value={content.imageAspectRatio || '16/9'} 
                  onValueChange={(v) => handleJsonContentChange(content, 'imageAspectRatio', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16/9">16:9 (Cinematic)</SelectItem>
                    <SelectItem value="4/3">4:3 (Standard)</SelectItem>
                    <SelectItem value="1/1">1:1 (Square)</SelectItem>
                    <SelectItem value="auto">Auto (Original)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Pagination Style</Label>
                <Select 
                  value={content.paginationType || 'pagination'} 
                  onValueChange={(v) => handleJsonContentChange(content, 'paginationType', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagination">Classic Pagination</SelectItem>
                    <SelectItem value="infinite-scroll">Infinite Scroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Posts Per Load</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={content.postsPerPage || 6}
                  onChange={(e) => handleJsonContentChange(content, 'postsPerPage', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="display" className="space-y-4 pt-4">
          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <LayoutGrid className="h-3 w-3" />
              Content Visibility
            </Label>
            
            <div className="space-y-3">
              {[
                { key: 'showSearch', label: 'Search Bar' },
                { key: 'showCategories', label: 'Category Tabs' },
                { key: 'showCategory', label: 'Post Categories' },
                { key: 'showAuthor', label: 'Author Info' },
                { key: 'showDate', label: 'Publish Date' },
                { key: 'showReadingTime', label: 'Reading Time' },
                { key: 'showExcerpt', label: 'Post Excerpts' },
                { key: 'showSocial', label: 'Social Sharing' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label className="text-xs cursor-pointer" htmlFor={`toggle-${item.key}`}>{item.label}</Label>
                  <Switch 
                    id={`toggle-${item.key}`}
                    checked={content[item.key] !== false} 
                    onCheckedChange={(v) => handleJsonContentChange(content, item.key, v)} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-md bg-background border shadow-sm">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Style Details
            </Label>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase">Corner Style</Label>
              <Select 
                value={content.borderRadius || 'rounded-lg'} 
                onValueChange={(v) => handleJsonContentChange(content, 'borderRadius', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded-none">Sharp Corners</SelectItem>
                  <SelectItem value="rounded-md">Slightly Rounded</SelectItem>
                  <SelectItem value="rounded-lg">Modern Rounded</SelectItem>
                  <SelectItem value="rounded-2xl">Extra Rounded</SelectItem>
                  <SelectItem value="rounded-3xl">Premium Rounded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
