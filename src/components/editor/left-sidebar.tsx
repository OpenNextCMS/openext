"use client"

import { ChevronDown, ChevronRight, Layers, MoreVertical, Plus, Settings, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Page {
  id: string
  name: string
  preHeading: string
  description: string
  seoName: string
  seoMeta: string
}

export default function LeftSidebar() {
  const [pagesOpen, setPagesOpen] = useState(true)
  const [layersOpen, setLayersOpen] = useState(true)
  const [pages, setPages] = useState<Page[]>([{
    id: "home", name: "Home", preHeading: "Welcome to OpenNext",
    description: "This is a default page created during registration.",
    seoName: "OpenNext",
    seoMeta: "OpenNext is a React framework for the web.",
  }])
  const [pageId, setPageId] = useState<Page>({
    id: "home", name: "Home", preHeading: "Welcome to OpenNext",
    description: "This is a default page created during registration.",
    seoName: "OpenNext",
    seoMeta: "OpenNext is a React framework for the web.",
  })
  const [newPageName, setNewPageName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openPage, setOpenPage] = useState(false)

  const addNewPage = () => {
    if (newPageName.trim()) {
      const newPage: Page = {
        id: `page-${Date.now()}`,
        name: newPageName.trim(),
        preHeading: "",
        description: "",
        seoName: "",
        seoMeta: "",
      }
      setPages([...pages, newPage])
      setNewPageName("")
      setDialogOpen(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {openPage ? (
        <div>
          {/* <div className="flex flex-col-reverse items-center m-12">
            {pageId && (
              <div>This is {pageId.id} and name is {pageId.name}</div>
            )}
            <X className="h-4 w-4 m-5" onClick={() => (setOpenPage(false))} />
          </div> */}
          {pageId && (
            <div>
              <div className="flex flex-col gap-2 p-2 my-3">
                <Label htmlFor="name">
                  Name
                </Label>
                <Input type="text" value={pageId.name || ""} />
              </div>
              <div className="flex flex-col gap-2 p-2 my-3">
                <Label htmlFor="preHead">
                  Pre-Heading
                </Label>
                <Input type="text" value={pageId.preHeading || ""} />
              </div>
              <div className="flex flex-col gap-2 p-2 my-3">
                <Label htmlFor="description">
                  Description
                </Label>
                <textarea id="description" className="border rounded p-2" rows={2} value={pageId.description || ""} />
              </div>
              <div className="flex flex-col gap-2 p-2 my-3">
                <Label htmlFor="seoName">
                  Seo Name
                </Label>
                <Input type="text" value={pageId.seoName || ""} />
              </div>
              <div className="flex flex-col gap-2 p-2 my-3">
                <Label htmlFor="seoMeta">
                  Seo Meta
                </Label>
                <textarea id="seoMeta" className="border rounded p-2" rows={2} value={pageId.seoMeta || ""} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="mb-4">
            <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      {pagesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-2 w-4" />}
                    </Button>
                  </CollapsibleTrigger >
                  <span className="font-medium">Pages</span>
                </div >
                <div className="flex items-center gap-1">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Page</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Page Name
                          </Label>
                          <Input
                            id="name"
                            value={newPageName}
                            onChange={(e) => setNewPageName(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter page name"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={addNewPage}>
                          Add Page
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div >
              <CollapsibleContent>
                <div className="px-3 pb-2">
                  {pages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted">
                      <span>{page.name}</span>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setOpenPage(true); setPageId(page); }}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible >
          </div >

          <div className="border-b border-t my-5">
            <Collapsible open={layersOpen} onOpenChange={setLayersOpen}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      {layersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <Layers className="h-4 w-4" />
                  <span className="font-medium">Layers</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2 pl-4 py-1">
                    <ChevronRight className="h-4 w-4" />
                    <input type="checkbox" className="h-4 w-4" readOnly />
                    <span>Body</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="border-b border-t">
            <Collapsible open={layersOpen} onOpenChange={setLayersOpen}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    {layersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <Layers className="h-4 w-4" />
                  <span className="font-medium">My Design</span>
                </div>
              </div>
            </Collapsible>
          </div>
        </div >
      )
      }
    </div >
  )
}
