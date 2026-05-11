'use client';

import {
  ArrowRight,
  Check,
  Circle,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  Heart,
  Mail,
  PenTool,
  Phone,
  Play,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  MdAndroid,
  MdArrowForward,
  MdCheck,
  MdDownload,
  MdEmail,
  MdFavorite,
  MdHome,
  MdOpenInNew,
  MdPhone,
  MdPublic,
  MdPlayArrow,
  MdSettings,
  MdShoppingCart,
  MdStar,
} from 'react-icons/md';
import { FaMicrochip, FaPencilRuler, FaUserShield } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { ComponentType } from 'react';

type IconComponent = ComponentType<{ className?: string }> | IconType;
export type IconLibrary = 'Lucide' | 'Google' | 'Font Awesome';

export const iconOptions: Array<{
  label: string;
  value: string;
  icon: IconComponent;
  library: IconLibrary;
}> = [
  { label: 'None', value: 'none', icon: Circle, library: 'Lucide' },
  { label: 'Arrow Right', value: 'arrow-right', icon: ArrowRight, library: 'Lucide' },
  { label: 'Check', value: 'check', icon: Check, library: 'Lucide' },
  { label: 'CPU', value: 'cpu', icon: Cpu, library: 'Lucide' },
  { label: 'Download', value: 'download', icon: Download, library: 'Lucide' },
  { label: 'External Link', value: 'external-link', icon: ExternalLink, library: 'Lucide' },
  { label: 'Globe', value: 'globe', icon: Globe, library: 'Lucide' },
  { label: 'Heart', value: 'heart', icon: Heart, library: 'Lucide' },
  { label: 'Mail', value: 'mail', icon: Mail, library: 'Lucide' },
  { label: 'Pen Tool', value: 'pen-tool', icon: PenTool, library: 'Lucide' },
  { label: 'Phone', value: 'phone', icon: Phone, library: 'Lucide' },
  { label: 'Play', value: 'play', icon: Play, library: 'Lucide' },
  { label: 'Shield Check', value: 'shield-check', icon: ShieldCheck, library: 'Lucide' },
  { label: 'Shopping Cart', value: 'shopping-cart', icon: ShoppingCart, library: 'Lucide' },
  { label: 'Sparkles', value: 'sparkles', icon: Sparkles, library: 'Lucide' },
  { label: 'Star', value: 'star', icon: Star, library: 'Lucide' },
  { label: 'Android', value: 'android', icon: MdAndroid, library: 'Google' },
  { label: 'Arrow Forward', value: 'md-arrow-forward', icon: MdArrowForward, library: 'Google' },
  { label: 'Check', value: 'md-check', icon: MdCheck, library: 'Google' },
  { label: 'Download', value: 'md-download', icon: MdDownload, library: 'Google' },
  { label: 'Email', value: 'md-email', icon: MdEmail, library: 'Google' },
  { label: 'Favorite', value: 'md-favorite', icon: MdFavorite, library: 'Google' },
  { label: 'Home', value: 'md-home', icon: MdHome, library: 'Google' },
  { label: 'Open In New', value: 'md-open-in-new', icon: MdOpenInNew, library: 'Google' },
  { label: 'Phone', value: 'md-phone', icon: MdPhone, library: 'Google' },
  { label: 'Public', value: 'md-public', icon: MdPublic, library: 'Google' },
  { label: 'Play', value: 'md-play', icon: MdPlayArrow, library: 'Google' },
  { label: 'Settings', value: 'md-settings', icon: MdSettings, library: 'Google' },
  { label: 'Shopping Cart', value: 'md-shopping-cart', icon: MdShoppingCart, library: 'Google' },
  { label: 'Star', value: 'md-star', icon: MdStar, library: 'Google' },
  { label: 'Pencil Ruler', value: 'fa-pencil-ruler', icon: FaPencilRuler, library: 'Font Awesome' },
  { label: 'Microchip', value: 'fa-microchip', icon: FaMicrochip, library: 'Font Awesome' },
  { label: 'User Shield', value: 'fa-user-shield', icon: FaUserShield, library: 'Font Awesome' },
] as const;

export const iconOptionMap: Record<string, IconComponent> = iconOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.icon;
    return acc;
  },
  {} as Record<string, IconComponent>
);

export const renderSelectedIcon = (iconName?: string, className = 'h-4 w-4') => {
  if (!iconName || iconName === 'none') {
    return null;
  }

  const IconComponent = iconOptionMap[iconName];
  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} />;
};
