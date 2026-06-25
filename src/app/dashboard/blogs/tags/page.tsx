'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tags, PlusCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface TagItem {
  _id: string;
  name: string;
  slug: string;
}

export default function TagsPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const [tags, setTags] = useState<TagItem[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/tags`, { credentials: 'include' });
      const result = await res.json();
      setTags(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/tags`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.data) {
        toast.success('Tag created');
        setName('');
        setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        toast.error(result.error?.message || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${backendUrl}/api/tags/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Tag deleted');
        setTags((prev) => prev.filter((tag) => tag._id !== id));
      } else {
        toast.error(result.error?.message || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tags className="mr-2 h-5 w-5 text-primary" />
            Add Tag
          </CardTitle>
          <CardDescription>
            Tags created here are available when creating and editing blog posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Next.js"
                required
              />
            </div>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Tag
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
          <CardDescription>
            {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : tags.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tags yet. Create your first tag above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag._id}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-1 pl-3 pr-1 text-sm"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleDelete(tag._id)}
                    disabled={deletingId === tag._id}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete tag"
                  >
                    {deletingId === tag._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
