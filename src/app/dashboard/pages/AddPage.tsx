'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/redux/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddPage() {
  const [pageName, setPageName] = useState('');
  const [slug, setSlug] = useState('');
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

      // Step 1: Create the page
      const response = await fetch(`${backendUrl}/api/pages/add-page`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageName, slug, isPublished }),
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
        console.error('Page creation failed:', result.message);
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
              Add New Page
            </CardTitle>
            <CardDescription>Create a new page for your website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageName">Page Name</Label>
                <Input
                  id="pageName"
                  type="text"
                  name="pageName"
                  value={pageName}
                  onChange={handlePageNameChange}
                  placeholder="Home Page"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
              <div className="space-y-2">
                <Label htmlFor="createdBy">Slug</Label>
                <Input
                  id="createdBy"
                  type="text"
                  name="createdBy"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="home-page"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="isPublished">Publication Status</Label>
                <Select
                  name="isPublished"
                  value={isPublished ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setIsPublished(value === "true")
                  }
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

            <Button type="submit" className="w-full my-3" disabled={!pageName || !slug || isSubmitting} onClick={handleProceed}
            >
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
          </CardContent>
        </Card>
      </PersistGate>
    </Provider >
  );
}
