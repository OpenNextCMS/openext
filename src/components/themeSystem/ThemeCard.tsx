'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, Trash2, UploadCloud, Loader2, ImageOff } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { themeSystemApi } from './api';
import type { InstalledTheme } from './types';

interface Props {
  theme: InstalledTheme;
  onActivate: (slug: string) => Promise<void> | void;
  onDelete: (slug: string) => Promise<void> | void;
  onDetails: (theme: InstalledTheme) => void;
  onUpdate: (theme: InstalledTheme) => void;
}

export function ThemeCard({ theme, onActivate, onDelete, onDetails, onUpdate }: Props) {
  const [busy, setBusy] = useState<'activate' | 'delete' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const activate = async () => {
    setBusy('activate');
    try {
      await onActivate(theme.slug);
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    setBusy('delete');
    try {
      await onDelete(theme.slug);
      setConfirmOpen(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {!imgError ? (
            <Image
              src={themeSystemApi.assetUrl(theme.slug, theme.thumbnail)}
              alt={`${theme.name} screenshot`}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
          {theme.active && (
            <Badge className="absolute left-2 top-2 bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Active
            </Badge>
          )}
          {theme.status !== 'installed' && (
            <Badge variant="destructive" className="absolute right-2 top-2 capitalize">
              {theme.status}
            </Badge>
          )}
        </div>

        <CardContent className="space-y-1 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold">{theme.name}</h3>
            <span className="flex-shrink-0 text-xs text-muted-foreground">v{theme.version}</span>
          </div>
          <p className="text-xs text-muted-foreground">by {theme.author || 'Unknown'}</p>
          <p className="line-clamp-2 min-h-8 text-sm text-muted-foreground">{theme.description}</p>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
          {theme.active ? (
            <Button size="sm" variant="secondary" className="flex-1" disabled>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Active
            </Button>
          ) : (
            <Button size="sm" className="flex-1" onClick={activate} disabled={busy !== null}>
              {busy === 'activate' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Activate
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onDetails(theme)} title="Preview / details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onUpdate(theme)} title="Update to a newer version">
            <UploadCloud className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            disabled={theme.active}
            title={theme.active ? 'Activate another theme first' : 'Delete'}
            className="text-destructive hover:text-destructive disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Destructive-action confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{theme.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the theme files, database record, backups and cached assets. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy === 'delete'}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={del} disabled={busy === 'delete'}>
              {busy === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
