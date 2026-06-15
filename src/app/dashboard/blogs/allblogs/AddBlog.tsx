'use client';

<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
=======
import { useState } from 'react';
>>>>>>> khadija
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, PlusCircle, Image as ImageIcon, User, Tag } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
<<<<<<< HEAD
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  _id: string;
  name: string;
}

export default function AddBlog() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
=======
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddBlog() {
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('General');
>>>>>>> khadija
  const [authorName, setAuthorName] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
<<<<<<< HEAD
  const [uploadingImage, setUploadingImage] = useState(false);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);

  const handleFeaturedImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${backendUrl}/api/blogs/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Upload failed');
      }
      setFeaturedImage(data.filePath);
    } catch (error) {
      console.error('Featured image upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Load categories created in the Categories option (no hard-coded list).
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/categories`, { credentials: 'include' });
        const result = await res.json();
        if (Array.isArray(result.data)) setCategories(result.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, [backendUrl]);

  // Default the author to the current user's profile display name (falls back
  // to the email's local part). The author remains editable.
  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/dashboard/profile`, { credentials: 'include' });
        const result = await res.json();
        if (result.success && result.data) {
          const displayName = (result.data.displayName || '').trim();
          const email = (result.data.email || '').trim();
          const fallback = email.includes('@') ? email.split('@')[0] : '';
          setAuthorName((prev) => prev || displayName || fallback);
        }
      } catch (error) {
        console.error('Error fetching author from profile:', error);
      }
    };
    fetchAuthor();
  }, [backendUrl]);
=======
>>>>>>> khadija

  const handlePageNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPageName(value);
    setSlug(value.toLowerCase().replace(/\s+/g, '-'));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
  };

  const handleProceed = async () => {
    if (!pageName || !slug) return;
    setIsSubmitting(true);
    try {
<<<<<<< HEAD
      const selectedCategory = categories.find((c) => c._id === categoryId);

      // Step 1: Create the blog post
      const response = await fetch(`${backendUrl}/api/blogs`, {
=======
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      // Step 1: Create the blog post
      const response = await fetch(`${backendUrl}/api/pages/add-page`, {
>>>>>>> khadija
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
<<<<<<< HEAD
        body: JSON.stringify({
            pageName,
            slug,
            status: isPublished ? 'published' : 'draft',
            category: selectedCategory?.name,
            categories: categoryId ? [categoryId] : [],
            authorName,
            featuredImage,
=======
        body: JSON.stringify({ 
            pageName, 
            slug, 
            isPublished, 
            pageType: 'blog',
            category,
            authorName,
            featuredImage,
            publishDate: isPublished ? new Date() : null
>>>>>>> khadija
        }),
      });

      const result = await response.json();

<<<<<<< HEAD
      if (response.ok && result.data) {
        // Open the new block-based blog editor for the freshly created post.
        window.location.assign(`/dashboard/blogs/${result.data._id}/edit`);
      } else {
        console.error('Blog post creation failed:', result.message || 'Unknown error');
=======
      if (response.ok && result.success) {
        // Step 2: Get pages and userId
        const getResponse = await fetch(`${backendUrl}/api/pages/get-pages`, {
          method: 'GET',
          credentials: 'include',
        });

        const getData = await getResponse.json();

        if (getResponse.ok && getData.userId) {
          const userId = getData.userId;
          // Step 3: Redirect with page info
          window.open(
            `/Editor?pagename=${encodeURIComponent(slug)}&userId=${userId}&pageId=${result.data._id}`
          );
        } else {
          console.error('Failed to fetch user/pages:', getData.message || getData.error);
        }
      } else {
        console.error('Blog post creation failed:', result.message);
>>>>>>> khadija
      }
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 text-primary mr-2" />
              Add New Blog Post
            </CardTitle>
            <CardDescription>Create a premium editorial post for your blog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageName">Post Title</Label>
                <Input
                  id="pageName"
                  type="text"
                  value={pageName}
                  onChange={handlePageNameChange}
                  placeholder="The Future of Web Design"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="future-of-web-design"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Category
                </Label>
<<<<<<< HEAD
                {categories.length > 0 ? (
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No categories yet.{' '}
                    <Link href="/dashboard/blogs/categories" className="text-primary underline">
                      Add a category
                    </Link>
                  </p>
                )}
=======
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Tutorials">Tutorials</SelectItem>
                    <SelectItem value="Case Studies">Case Studies</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
>>>>>>> khadija
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorName" className="flex items-center gap-1">
                  <User className="h-3 w-3" /> Author Name
                </Label>
                <Input
                  id="authorName"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPublished">Status</Label>
                <Select
                  value={isPublished ? 'true' : 'false'}
                  onValueChange={(value) => setIsPublished(value === "true")}
                >
                  <SelectTrigger id="isPublished">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featuredImage" className="flex items-center gap-1">
<<<<<<< HEAD
                <ImageIcon className="h-3 w-3" /> Featured Image
=======
                <ImageIcon className="h-3 w-3" /> Featured Image URL
>>>>>>> khadija
              </Label>
              <Input
                id="featuredImage"
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
<<<<<<< HEAD
                placeholder="Paste an image URL or upload from your device"
              />
              <div className="flex items-center gap-2">
                <input
                  ref={featuredImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFeaturedImageUpload(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => featuredImageInputRef.current?.click()}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Uploading…
                    </>
                  ) : (
                    'Upload from device'
                  )}
                </Button>
                {featuredImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeaturedImage('')}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {featuredImage ? (
                <img
                  src={featuredImage}
                  alt="Featured preview"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              ) : null}
=======
                placeholder="https://images.unsplash.com/..."
              />
>>>>>>> khadija
            </div>

            <Button type="submit" className="w-full mt-2" disabled={!pageName || !slug || isSubmitting} onClick={handleProceed}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Post...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Blog Post
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </PersistGate>
    </Provider >
  );
}
