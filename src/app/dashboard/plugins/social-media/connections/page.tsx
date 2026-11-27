'use client';

import { SocialMediaGate } from '@/components/social-media/SocialMediaGate';
import { SocialMediaConnections } from '@/components/social-media/SocialMediaViews';

export default function SocialMediaConnectionsPage() {
  return (
    <SocialMediaGate>
      <div className="p-6">
        <SocialMediaConnections />
      </div>
    </SocialMediaGate>
  );
}
