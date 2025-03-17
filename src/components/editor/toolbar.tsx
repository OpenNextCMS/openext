"use client"

import { Button } from "@/components/ui/button"
import {
  RedoIcon as ArrowRedo,
  UndoIcon as ArrowUndo,
  Code,
  Download,
  Eye,
  Fullscreen,
  PlusSquare,
  RotateCcw,
  Settings,
  Trash,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { ThemeToggle } from "./theme-toggle"

export default function Toolbar({ toggleSidebar, onViewChange }) {
  return (
    <div className="relative border-b border-border p-2 flex items-center justify-between mx-9 bg-background text-foreground transition-colors duration-300">
      <div className="flex flex-row-reverse items-center gap-1">
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <ArrowUndo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <ArrowRedo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Fullscreen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Trash className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-muted transition-colors duration-200">
          <Settings className="h-4 w-4" />
        </Button>
        {/* <ThemeToggle /> */}
      </div>
      <div>
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="hover:bg-muted transition-colors duration-200"
        >
          <PlusSquare className="h-6 w-6" />
        </Button>
      </div>
      <div className="mr-3">
        <Select
          defaultValue="desktop"
          onValueChange={(value) => onViewChange(value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

