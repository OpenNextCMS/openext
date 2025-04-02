// src/types/index.ts
import { ReactNode } from 'react';

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

export interface Block {
  id: string;
  label: string;
  type: 'column' | 'text';
  children?: unknown[];
  content?: string;
  icon: ReactNode;
  description: string;
  uniqueId?: string;
  style?: Record<string, string>;
}

export interface BlockRendererProps {
  block: Block;
}
