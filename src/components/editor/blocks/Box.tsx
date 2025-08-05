import { Button } from '@/components/ui/button'
import { CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible } from '@radix-ui/react-collapsible'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { ChevronDown } from 'lucide-react'
import React, { useState } from 'react'
import { cn } from '@/lib/utils';


interface BoxProps {
    content: string
}

const Box = ({ content }: BoxProps) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);


    return (
        <div>
            <div className='bg-background dark:bg-background w-full h-auto shadow-md p-4 rounded-lg border transition-all my-2 mx-auto' style={{ transform: `scale(${100 / 100})`, transformOrigin: 'top left' }}>
                <TooltipProvider delayDuration={0}>
                    <Collapsible                      >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CollapsibleTrigger asChild>
                                    <Button className={'w-full justify-start'} variant={'ghost'} onClick={() => setOpenDropdown(content)}>
                                        <>
                                            <span className="flex-1 text-left">{content}</span>
                                            <ChevronDown
                                                className={cn(
                                                    'h-4 w-4 transition-transform text-muted-foreground',
                                                    openDropdown === content && 'transform rotate-180'
                                                )}
                                            />
                                        </>
                                    </Button>
                                </CollapsibleTrigger>
                            </TooltipTrigger>
                        </Tooltip>

                        <CollapsibleContent className="pl-9 pr-2 py-1 space-y-1">
                            <span className='w-full'> No {content} Fixed</span>
                        </CollapsibleContent>
                    </Collapsible>
                </TooltipProvider>
            </div>
        </div>
    )
}

export default Box