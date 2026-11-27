'use client';

import { SocialMediaGate } from '@/components/social-media/SocialMediaGate';
import { SocialMediaPosts } from '@/components/social-media/SocialMediaViews';

export default function SocialMediaPostsPage() {
  return (
    <SocialMediaGate>
      <div className="p-6">
        <SocialMediaPosts />
      </div>
    </SocialMediaGate>
  );
}
