'use client';

import { SocialMediaGate } from '@/components/social-media/SocialMediaGate';
import { SocialMediaOverview } from '@/components/social-media/SocialMediaViews';

export default function SocialMediaPluginPage() {
  return (
    <SocialMediaGate>
      <div className="p-6">
        <SocialMediaOverview />
      </div>
    </SocialMediaGate>
  );
}
