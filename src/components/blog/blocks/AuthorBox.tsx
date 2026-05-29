'use client';

import { useEffect, useState } from 'react';
import type { IAuthor } from '@/types/index';
import type { AuthorBoxData } from './types';

/** Renders an author profile card by fetching the author referenced by id. */
export default function AuthorBox({ data }: { data: AuthorBoxData }) {
  const [author, setAuthor] = useState<IAuthor | null>(null);

  useEffect(() => {
    if (!data.authorId) return;
    let active = true;
    fetch(`/api/authors/${data.authorId}`)
      .then((r) => r.json())
      .then((res) => {
        if (active && res?.data) setAuthor(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [data.authorId]);

  if (!author) return null;

  return (
    <div className="my-8 flex items-start gap-4 rounded-2xl border bg-muted/30 p-6">
      {author.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatar}
          alt={author.name}
          className="h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-xl font-bold">
          {author.name?.charAt(0) ?? '?'}
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-lg font-bold">{author.name}</h4>
        {author.bio ? <p className="text-sm text-muted-foreground">{author.bio}</p> : null}
        {author.socialLinks ? (
          <div className="flex gap-3 pt-1 text-xs font-semibold text-primary">
            {Object.entries(author.socialLinks)
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <a key={k} href={v as string} target="_blank" rel="noopener noreferrer">
                  {k}
                </a>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
