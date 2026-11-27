'use client';

import type { IconType } from 'react-icons';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaWhatsapp,
  FaYoutube,
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import type { SocialPlatformId } from '@/types/social-media';

const PLATFORM_ICONS: Record<SocialPlatformId, IconType> = {
  facebook: FaFacebook,
  twitter: FaXTwitter,
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  whatsapp: FaWhatsapp,
};

/** Official-ish brand colors commonly used on public share buttons. */
export const SOCIAL_PLATFORM_COLORS: Record<SocialPlatformId, string> = {
  facebook: '#1877F2',
  twitter: '#000000',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  tiktok: '#000000',
  whatsapp: '#25D366',
};

interface SocialPlatformIconProps {
  platform: SocialPlatformId;
  className?: string;
  size?: number;
  /** When true, use brand color; otherwise inherit currentColor. */
  branded?: boolean;
}

export function SocialPlatformIcon({
  platform,
  className,
  size = 18,
  branded = true,
}: SocialPlatformIconProps) {
  const Icon = PLATFORM_ICONS[platform];
  if (!Icon) return null;
  return (
    <Icon
      className={className}
      size={size}
      style={branded ? { color: SOCIAL_PLATFORM_COLORS[platform] } : undefined}
      aria-hidden
    />
  );
}
