"use client"

import { Button } from "@/components/ui/button"
import {
  RedoIcon as ArrowRedo,
  UndoIcon as ArrowUndo,
  Code,
  Download,
  Eye,
  Fullscreen,
  RotateCcw,
  Settings,
  Trash,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Toolbar() {
  return (
    <div className="relative border-b p-2 flex items-center justify-end">
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <Select defaultValue="desktop">
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="mobile">Mobile Landscape</SelectItem>
            <SelectItem value="mobile">Mobile Potrait</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <ArrowUndo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <ArrowRedo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Fullscreen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Trash className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

