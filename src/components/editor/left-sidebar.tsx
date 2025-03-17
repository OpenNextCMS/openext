"use client"

import { useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Layers, MoreVertical, Plus, Settings, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Page {
  id: string
  pageName: string
  preHeading: string
  description: string
  seoName: string
  seoMeta: string
}

export default function LeftSidebar() {
  const searchParams = useSearchParams()
  // const pageIdFromUrl = searchParams.get("pageId")
  const pageIdFromUrl = searchParams ? searchParams.get("pageId") : null
  const [pagesOpen, setPagesOpen] = useState(true)
  const [layersOpen, setLayersOpen] = useState(true)
  const [pages, setPages] = useState<Page[]>([
    {
      id: "home",
      pageName: "Home",
      preHeading: "Welcome",
      description: "This is a default page",
      seoName: "OpenNext",
      seoMeta: "OpenNext is a new CMS type Website.",
    },
  ])
  const [pageId, setPageId] = useState<Page>({
    id: "home",
    pageName: "Home",
    preHeading: "Welcome",
    description: "This is a default page",
    seoName: "OpenNext",
    seoMeta: "OpenNext is a new CMS type Website.",
  })
  const [newPageName, setNewPageName] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openPage, setOpenPage] = useState(false)

  const addNewPage = () => {
    if (newPageName.trim()) {
      const newPage: Page = {
        id: `page-${Date.now()}`,
        pageName: newPageName.trim(),
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

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

  const fetchPageById = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`)
      if (!response.ok) throw new Error("Failed to fetch pages")
      const data = await response.json()
      setPages(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages")
      toast.error("Failed to load pages")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (pageIdFromUrl) {
      fetchPageById(pageIdFromUrl)
    }
  }, [pageIdFromUrl])

  console.log("filtered pages:", pages)

  return (
    <div className="flex h-full flex-col bg-background text-foreground transition-colors duration-300">
      {openPage ? (
        <div>
          {pageId && (
            <div className="p-4">
              <Button variant="ghost" size="icon" className="mb-4" onClick={() => setOpenPage(false)}>
                <X className="h-4 w-4" />
              </Button>
              <div className="flex flex-col gap-2 my-3">
                <Label htmlFor="name">Name</Label>
                <Input type="text" value={pageId.pageName || ""} readOnly className="dark:bg-muted" />
              </div>
              <div className="flex flex-col gap-2 my-3">
                <Label htmlFor="preHead">Pre-Heading</Label>
                <Input type="text" value={pageId.preHeading || ""} readOnly className="dark:bg-muted" />
              </div>
              <div className="flex flex-col gap-2 my-3">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="border rounded p-2 w-full dark:bg-muted dark:border-border"
                  rows={2}
                  value={pageId.description || ""}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2 my-3">
                <Label htmlFor="seoName">Seo Name</Label>
                <Input type="text" value={pageId.seoName || ""} readOnly className="dark:bg-muted" />
              </div>
              <div className="flex flex-col gap-2 my-3">
                <Label htmlFor="seoMeta">Seo Meta</Label>
                <textarea
                  id="seoMeta"
                  className="border rounded p-2 w-full dark:bg-muted dark:border-border"
                  rows={2}
                  value={pageId.seoMeta || ""}
                  readOnly
                />
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
                  </CollapsibleTrigger>
                  <span className="font-medium">Pages</span>
                </div>
                <div className="flex items-center gap-1">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] dark:bg-background">
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
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted transition-colors duration-200"
                    >
                      <span>{page.pageName}</span>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setOpenPage(true)
                            setPageId(page)
                          }}
                        >
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
            </Collapsible>
          </div>

          <div className="border-b border-t border-border my-5">
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

          <div className="border-b border-t border-border">
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
        </div>
      )}
    </div>
  )
}
