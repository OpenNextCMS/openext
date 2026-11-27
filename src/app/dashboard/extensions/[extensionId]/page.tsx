'use client';

import { useParams } from 'next/navigation';
import { ExtensionDetailView } from '@/components/extensions/ExtensionDetailView';

export default function ExtensionDetailPage() {
  const params = useParams<{ extensionId: string }>();
  const extensionId = Array.isArray(params.extensionId) ? params.extensionId[0] : params.extensionId;
  if (!extensionId) return null;
  return <ExtensionDetailView extensionId={extensionId} />;
}
