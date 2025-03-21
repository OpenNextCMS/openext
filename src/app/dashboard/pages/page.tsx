"use client"

import { useState, useEffect } from "react"
import type React from "react"
import {
  PlusCircle,
  Loader2,
  FileText,
  Files,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  FileQuestion,
} from "lucide-react"
import { toast } from "sonner"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Page {
  _id: string
  pageName: string
  createdBy: string
  isPublished: boolean
  lastModified: string
}
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

export default function PageManagement() {
  const [pageData, setPageData] = useState<Omit<Page, "_id" | "lastModified">>({
    pageName: "",
    createdBy: "",
    isPublished: false,
  })

  const [pages, setPages] = useState<Page[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    pageName: "",
    isPublished: false,
  })
  const [activeTab, setActiveTab] = useState("page-list")
  const [filteredPages, setFilteredPages] = useState<Page[]>([])


  const fetchPages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${backendUrl}/api/pages/get-pages`)
      if (!response.ok) throw new Error("Failed to fetch pages")
      const data = await response.json()
      setPages(data || [])
      setFilteredPages(data.pages || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages")
      toast.error("Failed to load pages")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPages(pages)
    } else {
      const filtered = pages.filter(
        (page) =>
          page.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          page.createdBy.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPages(filtered)
    }
  }, [searchTerm, pages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPageData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`${backendUrl}/api/pages/add-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pageData),
      })
      if (res.ok) {
        await res.json()
        setPageData({
          pageName: "",
          createdBy: "",
          isPublished: false,
        })
        toast.success("Page added successfully")
        setActiveTab("page-list")
        fetchPages()
      } else {
        console.error("Failed to add page")
        toast.error("Failed to add page")
      }
    } catch (error) {
      console.error("Error adding page:", error)
      toast.error("Error adding page")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePageUpdate = async (pageId: string, updates: { isPublished?: boolean }) => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/update-page/${pageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error("Failed to update page")

      toast.success("Page updated successfully")
      fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update page")
      toast.error("Failed to update page")
    }
  }

  const openEditModal = (page: Page) => {
    setSelectedPage(page)
    setEditForm({
      pageName: page.pageName,
      isPublished: page.isPublished,
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPage) return

    try {
      const response = await fetch(`${backendUrl}/api/pages/update-page/${selectedPage._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) throw new Error("Failed to update page")

      setIsEditModalOpen(false)
      toast.success("Page updated successfully")
      fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update page")
      toast.error("Failed to update page")
    }
  }

  const handleEditPage = (pageId: string) => {
    window.open(`/Editor?pageId=${pageId}`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page Management</h1>
          <p className="text-muted-foreground mt-1">Create, view, and manage website pages</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant={activeTab === "add-page" ? "default" : "outline"}
            onClick={() => setActiveTab("add-page")}
            className="mr-2"
          >
            <FileText className="mr-2 h-4 w-4" />
            Add Page
          </Button>
          <Button variant={activeTab === "page-list" ? "default" : "outline"} onClick={() => setActiveTab("page-list")}>
            <Files className="mr-2 h-4 w-4" />
            Page List
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="add-page" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 text-primary mr-2" />
                Add New Page
              </CardTitle>
              <CardDescription>Create a new page for your website</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <Label htmlFor="pageName">Page Name</Label>
                    <Input
                      id="pageName"
                      type="text"
                      name="pageName"
                      value={pageData.pageName}
                      onChange={handleInputChange}
                      placeholder="Home Page"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="createdBy">Created By</Label>
                    <Input
                      id="createdBy"
                      type="text"
                      name="createdBy"
                      value={pageData.createdBy}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="isPublished">Publication Status</Label>
                    <Select
                      name="isPublished"
                      value={pageData.isPublished ? "true" : "false"}
                      onValueChange={(value) => setPageData((prev) => ({ ...prev, isPublished: value === "true" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Published</SelectItem>
                        <SelectItem value="false">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Page...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Page
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page-list" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <CardTitle className="flex items-center">
                    <Files className="h-5 w-5 text-primary mr-2" />
                    Page List
                  </CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {filteredPages.length} pages
                  </Badge>
                </div>
                <div className="flex items-center mt-4 md:mt-0 space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search pages..."
                      className="pl-8 w-full md:w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={fetchPages} title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading pages...</span>
                </div>
              ) : error ? (
                <div className="bg-destructive/10 p-4 rounded-lg text-center">
                  <h3 className="text-destructive font-medium text-lg mb-2">Error loading pages</h3>
                  <p className="text-destructive/90 mb-4">{error}</p>
                  <Button onClick={fetchPages} variant="destructive">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SNo</TableHead>
                        <TableHead>Page Name</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPages.length > 0 ? (
                        filteredPages.map((page, index) => (
                          <TableRow key={page._id}>
                            <TableCell>
                              <div className="font-medium">{index + 1}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="font-medium">{page.pageName}</div>
                              </div>
                            </TableCell>
                            <TableCell>{page.createdBy}</TableCell>
                            <TableCell>
                              <Badge variant={page.isPublished ? "default" : "secondary"}>
                                {page.isPublished ? (
                                  <span className="flex items-center">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Published
                                  </span>
                                ) : (
                                  <span className="flex items-center">
                                    <XCircle className="mr-1 h-3 w-3" />
                                    Draft
                                  </span>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(page.lastModified).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button onClick={() => handleEditPage(page._id)} variant="outline" size="sm">
                                  <Edit className="h-3.5 w-3.5 mr-1" />
                                  Edit Content
                                </Button>
                                <Button onClick={() => openEditModal(page)} variant="outline" size="sm">
                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                  Edit Details
                                </Button>
                                <Button
                                  onClick={() => handlePageUpdate(page._id, { isPublished: !page.isPublished })}
                                  variant={page.isPublished ? "secondary" : "default"}
                                  size="sm"
                                >
                                  {page.isPublished ? (
                                    <>
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      Publish
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <FileQuestion className="h-8 w-8 mb-2" />
                              {searchTerm ? (
                                <>
                                  <p>No pages match your search</p>
                                  <Button variant="link" onClick={() => setSearchTerm("")} className="h-auto p-0 mt-1">
                                    Clear search
                                  </Button>
                                </>
                              ) : (
                                <p>No pages found</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2 text-primary" />
              Edit Page Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                {/* <Label htmlFor="edit-siteName">Site Name</Label>
                <Input
                  id="edit-siteName"
                  value={editForm.siteName}
                  onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                /> */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pageName">Page Name</Label>
                <Input
                  id="edit-pageName"
                  value={editForm.pageName}
                  onChange={(e) => setEditForm({ ...editForm, pageName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Publication Status</Label>
                <Select
                  value={editForm.isPublished ? "true" : "false"}
                  onValueChange={(value) => setEditForm({ ...editForm, isPublished: value === "true" })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

