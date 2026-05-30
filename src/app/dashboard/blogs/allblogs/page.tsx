'use client';

import { useState, useEffect } from 'react';
import type React from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  PlusCircle,
  FileQuestion,
  Eye,
  Tag,
  Calendar,
  MoreVertical,
  Trash2,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import AddBlog from './AddBlog';
import Link from 'next/link';

interface BlogPage {
  _id: string;
  pageName: string;
  slug: string;
  pageType: string;
  isPublished: boolean;
  category?: string;
  authorName?: string;
  publishDate?: string;
  updatedAt: string;
}

export default function AllBlogs() {
  const [blogs, setBlogs] = useState<BlogPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/pages/get-pages`);
      if (response.ok) {
        const data = await response.json();
        const blogPages = (data.pages || []).filter(
          (p: { pageType?: string }) => p.pageType === 'blog'
        );
        setBlogs(blogPages);
      } else {
        toast.error('Failed to fetch blogs');
      }
    } catch (err) {
      console.error('Error fetching blogs:', err);
      toast.error('An error occurred while fetching blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/pages/update-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId: id, 
          isPublished: !currentStatus,
          publishDate: !currentStatus ? new Date() : null
        }),
      });

      if (response.ok) {
        toast.success(`Blog ${!currentStatus ? 'published' : 'moved to drafts'}`);
        fetchBlogs();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePostDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/pages/delete-page?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Blog post deleted successfully');
        fetchBlogs();
      } else {
        toast.error('Failed to delete post');
      }
    } catch {
      toast.error('An error occurred during deletion');
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'published') return matchesSearch && blog.isPublished;
    if (activeTab === 'drafts') return matchesSearch && !blog.isPublished;
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Editorial Hub</h1>
          <p className="text-muted-foreground">Manage your publication&apos;s content and premium blog posts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchBlogs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/blogs" target="_blank">
              <Eye className="h-4 w-4 mr-2" />
              View Live Blog
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="px-6">All Posts</TabsTrigger>
            <TabsTrigger value="published" className="px-6 text-green-600 data-[state=active]:bg-green-50">Published</TabsTrigger>
            <TabsTrigger value="drafts" className="px-6 text-orange-600 data-[state=active]:bg-orange-50">Drafts</TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or slug..."
              className="pl-10 h-10 bg-background border-muted-foreground/20 focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <BlogTable
            blogs={filteredBlogs}
            loading={loading}
            onTogglePublish={handleTogglePublish}
            onPostDelete={handlePostDelete}
          />
        </TabsContent>
        <TabsContent value="published" className="mt-0">
          <BlogTable
            blogs={filteredBlogs}
            loading={loading}
            onTogglePublish={handleTogglePublish}
            onPostDelete={handlePostDelete}
          />
        </TabsContent>
        <TabsContent value="drafts" className="mt-0">
          <BlogTable
            blogs={filteredBlogs}
            loading={loading}
            onTogglePublish={handleTogglePublish}
            onPostDelete={handlePostDelete}
          />
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-primary/5 rounded-3xl p-8 space-y-6 border border-primary/10">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <PlusCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">New Editorial Post</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create a high-end blog post with custom layouts, rich media, and premium metadata.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
              <CheckCircle className="h-4 w-4" /> SEO Ready
              <CheckCircle className="h-4 w-4 ml-2" /> Rich Metadata
            </div>
          </div>

          <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Quick Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Technology', 'Design', 'Business', 'Marketing'].map(cat => (
                <div key={cat} className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium opacity-80 group-hover:opacity-100 transition-all">{cat}</span>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <AddBlog />
        </div>
      </div>
    </div>
  );
}

function BlogTable({
  blogs,
  loading,
  onTogglePublish,
  onPostDelete,
}: {
  blogs: BlogPage[];
  loading: boolean;
  onTogglePublish: (id: string, currentStatus: boolean) => void;
  onPostDelete: (id: string) => void;
}) {
  if (loading && blogs.length === 0) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <Card className="border-dashed py-20 text-center flex flex-col items-center justify-center space-y-4 bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-xl">No articles found</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Get started by creating your first premium editorial post using the form below.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-bold py-4">Title & Details</TableHead>
            <TableHead className="font-bold">Category</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="font-bold">Last Updated</TableHead>
            <TableHead className="text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blogs.map((blog: BlogPage) => (
            <TableRow key={blog._id} className="group hover:bg-muted/10 transition-colors">
              <TableCell className="py-5">
                <div className="flex flex-col">
                  <span className="font-bold text-base group-hover:text-primary transition-colors">{blog.pageName}</span>
                  <span className="text-xs text-muted-foreground font-mono">/{blog.slug}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[10px]">
                  {blog.category || 'General'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {blog.isPublished ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3">
                      <CheckCircle className="h-3 w-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-3">
                      <XCircle className="h-3 w-3 mr-1" /> Draft
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {new Date(blog.updatedAt).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                    <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-border/50">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1.5">Editorial Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-2.5" asChild>
                        <Link href={`/dashboard/blogs/${blog._id}/edit`}>
                          <Edit className="h-4 w-4 text-blue-500" /> Edit Content
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-lg gap-2 cursor-pointer py-2.5"
                        onClick={() => onTogglePublish(blog._id, blog.isPublished)}
                      >
                        {blog.isPublished ? (
                          <><XCircle className="h-4 w-4 text-orange-500" /> Unpublish</>
                        ) : (
                          <><CheckCircle className="h-4 w-4 text-green-500" /> Publish Now</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 opacity-50" />
                      <DropdownMenuItem 
                        className="rounded-lg gap-2 cursor-pointer py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => onPostDelete(blog._id)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
