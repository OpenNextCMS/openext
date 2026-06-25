'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Comment {
  _id: string;
  name: string;
  comment: string;
  createdAt: string;
}

export default function CommentsSection({ blogId }: { blogId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [form, setForm] = useState({ name: '', email: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?blogId=${blogId}`)
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setComments(res.data))
      .catch(() => {});
  }, [blogId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.comment) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, blogId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to submit');
      toast.success('Comment submitted — it will appear after moderation.');
      setForm({ name: '', email: '', comment: '' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="mb-6 text-2xl font-bold">Comments ({comments.length})</h2>

      <ul className="mb-8 space-y-4">
        {comments.map((c) => (
          <li key={c._id} className="rounded-xl border p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{c.comment}</p>
          </li>
        ))}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Be the first to comment.</p>
        ) : null}
      </ul>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border p-6">
        <h3 className="font-bold">Leave a comment</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Comment</Label>
          <Textarea
            rows={4}
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Post comment'}
        </Button>
      </form>
    </section>
  );
}
