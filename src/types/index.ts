// src/types/index.ts
import { ReactNode } from 'react';
import { Document, Types } from 'mongoose';

export interface MongoDBConfig {
  username: string;
  password: string;
  host: string;
  clusterName: string;
}

export interface UserRegistrationData {
  siteTitle: string;
  username: string;
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LanguageConfig {
  code: string;
  name: string;
}

export interface DatabaseConfig {
  user: string;
  pages: string;
}

export interface RouteContext {
  params: {
    id: string;
  };
}

export interface NavigationItem {
  name: string;
  href: string;
}

export interface ApiReference {
  [key: string]: ApiEndpoint[];
}
export interface OverviewData {
  title: string;
  description: string;
  objectives: string[];
}

export interface Feature {
  title: string;
  content: string;
}

export interface ProjectFlowData {
  setup: string[];
  postLogin: string[];
}

export interface TechStackItem {
  category: string;
  tech: string;
}

export interface ApiCategory {
  title: string;
  color: string;
  endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  apiNumber: number;
  color: string;
  request?: object | string;
  response?: object;
}

export interface PackageData {
  lastUpdated: string;
  dependencies: PackageInfo[];
  devDependencies: PackageInfo[];
}

export interface PackageInfo {
  name: string;
  dateAdded: string;
}

export interface InstallationData {
  title: string;
  description: string;
  requirements: string[];
  steps: InstallationStep[];
  troubleshooting: TroubleshootingItem[];
}

export interface InstallationStep {
  step: number;
  title: string;
  content: string;
}

export interface TroubleshootingItem {
  issue: string;
  solution: string;
}

export interface ApiEndpointProps {
  apiNumber: number;
  color: string;
  method: string;
  path: string;
  description: string;
  request?: string | object;
  response?: object;
}
export type ColumnChild = Block[];
export interface Block {
  id: string;
  label: string;
  type: 'column' | 'text';
  children?: ColumnChild[]; // Updated type for children
  content?: string;
  icon: ReactNode;
  description: string;
  uniqueId?: string;
  style?: Record<string, string>;
}

export interface BlockDragData {
  id?: string;
  type?: string;
  content?: string;
  style?: Record<string, string> | string;
  // Add other properties that might be needed during drag operations
}

export interface BlockRendererProps {
  block: Block;
}

export interface Attribute {
  [key: string]: string;
}

export interface Element {
  tag: string;
  className?: string;
  text?: string;
  attributes?: Attribute;
  events?: { [key: string]: string };
  children?: Element[];
}

export interface Component {
  name: string; // This will store names like "header" or "body"
  data: Element; // This will store the actual JSON structure
}
export interface IModification {
  modifiedBy: Types.ObjectId;
  modifiedAt: Date;
}
export interface PageDocument extends Document {
  pageName: string;
  createdBy: Types.ObjectId;
  isPublished: boolean;
  lastModified: Date;
  preHeading: string;
  description: string;
  seoName: string;
  seoMeta: string;
  slug: string;
  component: Component[];
  modifications: IModification[];
}

export interface Page {
  id: string;
  pageName: string;
  preHeading: string;
  description: string;
  seoName: string;
  seoMeta: string;
}
export interface ITheme {
  name: string;
  isActive: boolean;
}
export interface ISettingsDocument extends Document {
  siteTitle: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  themes: ITheme[];
}

export interface BlockData {
  uniqueId: string;
  content: string;
  type: 'column' | 'text';
  children?: BlockData[][];
  style?: React.CSSProperties;
  icon?: string;
}

export interface CanvasState {
  blocks: BlockData[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
}