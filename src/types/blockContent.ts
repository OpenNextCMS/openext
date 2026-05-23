import type { CSSProperties } from 'react';

export interface BlockContentItem {
  image?: string;
  url?: string;
  href?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  category?: string;
  text?: string;
  icon?: string;
  value?: string;
  label?: string;
  name?: string;
  role?: string;
  price?: string;
  buttonText?: string;
  link?: string;
  links?: BlockContentItem[];
  style?: CSSProperties;
  [key: string]: unknown;
}
