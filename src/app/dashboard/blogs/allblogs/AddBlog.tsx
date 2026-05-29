'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, PlusCircle, Image as ImageIcon, User, Tag } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddBlog() {
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('General');
  const [authorName, setAuthorName] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

      // Step 1: Create the blog post
      const response = await fetch(`${backendUrl}/api/pages/add-page`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            pageName, 
            slug, 
            isPublished, 
            pageType: 'blog',
            category,
            authorName,
            featuredImage,
            publishDate: isPublished ? new Date() : null
        }),
      });

      const result = await response.json();

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
                <ImageIcon className="h-3 w-3" /> Featured Image URL
              </Label>
              <Input
                id="featuredImage"
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
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
