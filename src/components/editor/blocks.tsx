'use client';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Grip, Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import DraggableBlock from './draggableblock';
import { blockCategories } from '@/components/editor/data/blockCategories';
import type { Block } from '@/types/index';
import { pluginRegistry } from '@/lib/pluginRegistry';
import { usePlugins } from '@/context/PluginContext';

interface BlockProps {
  toggleSidebar: () => void;
}

export default function Blocks({ toggleSidebar }: BlockProps) {
  const [searchTerm, setSearchTerm] = useState('');
  usePlugins(); // Triggers re-render when plugins finish loading

  const pluginBlocks: Block[] = pluginRegistry.getExtensionsByType('block').map((ext) => ({
    id: ext.id,
    type: ext.id as Block['type'],
    label: ext.name,
    icon: (ext.metadata?.icon as React.ReactNode) || <Grip className="h-4 w-4" />,
    description: (ext.metadata?.description as string) || 'Plugin provided block',
  }));

  const getFilteredBlocks = (blocks: Block[]): Block[] => {
    return blocks.filter(
      (block) =>
        (block.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (block.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredLayoutBlocks = getFilteredBlocks(blockCategories.layout || []);
  const filteredContentBlocks = getFilteredBlocks(blockCategories.content || []);
  const filteredContactBlocks = getFilteredBlocks(blockCategories.contact || []);
  const filteredFeaturesBlocks = getFilteredBlocks(blockCategories.features || []);
  const filteredTestimonialBlocks = getFilteredBlocks(blockCategories.testimonial || []);
  const filteredEcommerceBlocks = getFilteredBlocks(blockCategories.ecommerce || []);
  const filteredHeroBlocks = getFilteredBlocks(blockCategories.hero || []);
  const filteredPluginBlocks = getFilteredBlocks(pluginBlocks);

  const hasResults =
    filteredLayoutBlocks.length > 0 ||
    filteredContentBlocks.length > 0 ||
    filteredContactBlocks.length > 0 ||
    filteredFeaturesBlocks.length > 0 ||
    filteredTestimonialBlocks.length > 0 ||
    filteredEcommerceBlocks.length > 0 ||
    filteredHeroBlocks.length > 0 ||
    filteredPluginBlocks.length > 0;

  return (
    <div className="w-64 h-screen bg-background border-r shadow-lg flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium flex items-center">
          <Grip className="h-4 w-4 mr-2 text-primary" />
          Blocks Library
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted"
          onClick={toggleSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {searchTerm ? (
          <div className="p-4">
            {hasResults ? (
              <>
                {filteredLayoutBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Layout Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredLayoutBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredContentBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Content Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredContentBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredContactBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Contact Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredContactBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredFeaturesBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Feature Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredFeaturesBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredTestimonialBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Testimonial Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredTestimonialBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredEcommerceBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Ecommerce Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredEcommerceBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredHeroBlocks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Hero Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredHeroBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredPluginBlocks.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Plugin Blocks
                    </h4>
                    <div className="space-y-2">
                      {filteredPluginBlocks.map((block) => (
                        <BlockItem key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <p>No blocks match your search</p>
                <Button
                  variant="link"
                  className="mt-2 text-primary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="w-full grid grid-cols-4 h-auto flex-wrap">
                <TabsTrigger value="all" className="px-2 py-1 text-[10px]">All</TabsTrigger>
                <TabsTrigger value="layout" className="px-2 py-1 text-[10px]">Layout</TabsTrigger>
                <TabsTrigger value="content" className="px-2 py-1 text-[10px]">Content</TabsTrigger>
                <TabsTrigger value="contact" className="px-2 py-1 text-[10px]">Contact</TabsTrigger>
                <TabsTrigger value="features" className="px-2 py-1 text-[10px]">Feature</TabsTrigger>
                <TabsTrigger value="testimonial" className="px-2 py-1 text-[10px]">Testimonial</TabsTrigger>
                <TabsTrigger value="ecommerce" className="px-2 py-1 text-[10px]">Ecom</TabsTrigger>
                <TabsTrigger value="hero" className="px-2 py-1 text-[10px]">Hero</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="p-4 pt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Layout Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.layout || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Content Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.content || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Contact Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.contact || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Feature Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.features || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Testimonial Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.testimonial || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Ecommerce Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.ecommerce || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Hero Blocks</h4>
                <div className="space-y-2">
                  {(blockCategories.hero || []).map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              </div>

              {pluginBlocks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Plugin Blocks</h4>
                  <div className="space-y-2">
                    {pluginBlocks.map((block) => (
                      <BlockItem key={block.id} block={block} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="layout" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.layout || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="content" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.content || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.contact || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.features || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="testimonial" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.testimonial || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ecommerce" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.ecommerce || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hero" className="p-4 pt-6">
              <div className="space-y-2">
                {(blockCategories.hero || []).map((block) => (
                  <BlockItem key={block.id} block={block} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="plugins" className="p-4 pt-6">
              {pluginBlocks.length > 0 ? (
                <div className="space-y-2">
                  {pluginBlocks.map((block) => (
                    <BlockItem key={block.id} block={block} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No active plugins found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enable plugins in the dashboard to see them here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </ScrollArea>

      <div className="p-3 border-t text-xs text-muted-foreground">
        <p>Drag blocks onto the canvas to build your page</p>
      </div>
    </div>
  );
}

function BlockItem({ block }: { block: Block }) {
  const enhancedBlock = {
    ...block,
    uniqueId: uuidv4(),
    style: block.style || {},
  };

  return (
    <div className="group rounded-lg border hover:border-primary transition-colors p-2 flex items-center">
      {block.icon}
      <DraggableBlock block={enhancedBlock} />
    </div>
  );
}
