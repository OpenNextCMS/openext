'use client';

import { SocialMediaGate } from '@/components/social-media/SocialMediaGate';
import { SocialMediaShareSettings } from '@/components/social-media/SocialMediaViews';

export default function SocialMediaSharePage() {
  return (
    <SocialMediaGate>
      <div className="p-6">
        <SocialMediaShareSettings />
      </div>
    </SocialMediaGate>
  );
}
