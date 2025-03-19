"use client"
import DraggableBlock from "./draggableblock"
import { v4 as uuidv4 } from "uuid"
import { X, Search, LayoutGrid, Type, Image, Heading2, Grip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

const blockCategories = {
    layout: [
        {
            id: "2-column",
            label: "2 Column Layout",
            type: "column",
            children: [[], []],
            icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
            description: "Two equal width columns",
        },
        {
            id: "3-column",
            label: "3 Column Layout",
            type: "column",
            children: [[], [], []],
            icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
            description: "Three equal width columns",
        },
    ],
    content: [
        {
            id: "text",
            label: "Text Block",
            type: "text",
            content: "Demo Data for Text Block",
            icon: <Type className="h-4 w-4 mr-2 text-primary" />,
            description: "Regular paragraph text",
        },
        {
            id: "heading",
            label: "Heading Block",
            type: "text",
            content: "Heading Block",
            icon: <Heading2 className="h-4 w-4 mr-2 text-primary" />,
            description: "Section heading",
        },
        {
            id: "image",
            label: "Image Block",
            type: "text",
            content: "Image Placeholder",
            icon: <Image className="h-4 w-4 mr-2 text-primary" />,
            description: "Image with caption",
        },
    ],
}

export default function Block() {
    const [searchTerm, setSearchTerm] = useState("")

    const getFilteredBlocks = (blocks) => {
        return blocks.filter(
            (block) =>
                block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                block.description.toLowerCase().includes(searchTerm.toLowerCase()),
        )
    }

    const filteredLayoutBlocks = getFilteredBlocks(blockCategories.layout)
    const filteredContentBlocks = getFilteredBlocks(blockCategories.content)

    const hasResults = filteredLayoutBlocks.length > 0 || filteredContentBlocks.length > 0

    return (
        <div className="w-64 h-screen bg-background border-r shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-medium flex items-center">
                    <Grip className="h-4 w-4 mr-2 text-primary" />
                    Blocks Library
                </h3>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
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
                                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Layout Blocks</h4>
                                        <div className="space-y-2">
                                            {filteredLayoutBlocks.map((block) => (
                                                <BlockItem key={block.id} block={block} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredContentBlocks.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Content Blocks</h4>
                                        <div className="space-y-2">
                                            {filteredContentBlocks.map((block) => (
                                                <BlockItem key={block.id} block={block} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center p-4 text-muted-foreground">
                                <p>No blocks match your search</p>
                                <Button variant="link" className="mt-2 text-primary" onClick={() => setSearchTerm("")}>
                                    Clear search
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <div className="px-4 pt-4">
                            <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="layout">Layout</TabsTrigger>
                                <TabsTrigger value="content">Content</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="all" className="p-4 pt-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Layout Blocks</h4>
                                <div className="space-y-2">
                                    {blockCategories.layout.map((block) => (
                                        <BlockItem key={block.id} block={block} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Content Blocks</h4>
                                <div className="space-y-2">
                                    {blockCategories.content.map((block) => (
                                        <BlockItem key={block.id} block={block} />
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="layout" className="p-4 pt-6">
                            <div className="space-y-2">
                                {blockCategories.layout.map((block) => (
                                    <BlockItem key={block.id} block={block} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="content" className="p-4 pt-6">
                            <div className="space-y-2">
                                {blockCategories.content.map((block) => (
                                    <BlockItem key={block.id} block={block} />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </ScrollArea>

            <div className="p-3 border-t text-xs text-muted-foreground">
                <p>Drag blocks onto the canvas to build your page</p>
            </div>
        </div>
    )
}

function BlockItem({ block }) {
    return (
        <div className="group rounded-lg border hover:border-primary transition-colors p-2">
            <div className="flex items-center mb-1">
                {block.icon}
                <DraggableBlock block={{ ...block, id: uuidv4() }} />
            </div>
            <p className="text-xs text-muted-foreground pl-8">{block.description}</p>
        </div>
    )
}

