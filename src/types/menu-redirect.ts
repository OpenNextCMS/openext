// Single source of truth for the Menu Redirect plugin's shared types.
// Adapted to this repo: tenancy is per-database (NO workspaceId/websiteId fields).
import type { Document, Types } from 'mongoose';

export type MenuRedirectTargetType =
  | 'page'
  | 'blog'
  | 'blog-category'
  | 'anchor'
  | 'external'
  | 'cms';

/** A header menu item → redirect target mapping. */
export interface MenuRedirectMapping {
  _id?: string;
  headerId: string;
  menuItemId: string;
  targetType: MenuRedirectTargetType;
  targetId?: string;
  targetSlug?: string;
  targetUrl?: string;
  openInNewTab: boolean;
  nofollow: boolean;
  trackClicks: boolean;
  enabled: boolean;
  customClass?: string;
  dataAttributes?: Record<string, string>;
  dynamicParams?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuRedirectAnalytics {
  _id?: string;
  mappingId: string;
  menuItemId: string;
  targetId?: string;
  clicks: number;
  lastClickedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuRedirectAction =
  | 'plugin-installed'
  | 'plugin-enabled'
  | 'plugin-disabled'
  | 'plugin-uninstalled'
  | 'mapping-created'
  | 'mapping-updated'
  | 'mapping-deleted'
  | 'bulk-auto-match';

export interface MenuRedirectHistory {
  _id?: string;
  action: MenuRedirectAction;
  menuItemId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
  createdAt?: string;
}

// ---- Lifecycle ----
export interface PluginState {
  installed: boolean;
  enabled: boolean;
  version?: string;
  settings?: Record<string, unknown>;
}

// ---- Header detection ----
export interface MenuItem {
  /** Synthesized stable id (nav-bar links have no native id). */
  id: string;
  label: string;
  href?: string;
  children?: MenuItem[];
}

export interface HeaderMenuLink {
  label: string;
  href: string;
  onClick?: string;
  onClickValue?: string;
  children?: HeaderMenuLink[];
}
export interface ResolvedHeader {
  headerId: string;
  headerName: string;
  menuItems: MenuItem[];
}
export interface HeaderResolutionFailure {
  header: null;
  reason: string;
}

// ---- Content sources (left panel) ----
export interface ContentItem {
  targetType: MenuRedirectTargetType;
  targetId?: string;
  label: string;
  slug?: string;
  targetUrl?: string;
}

// ---- Roles / permissions ----
export type MenuRedirectRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';
export type MenuRedirectWriteAction = 'create' | 'update' | 'delete' | 'bulk';
export type MenuRedirectReadAction = 'read';
export type MenuRedirectLifecycleAction = 'install' | 'enable' | 'disable' | 'uninstall';
export type MenuRedirectAccessAction =
  | MenuRedirectWriteAction
  | MenuRedirectReadAction
  | MenuRedirectLifecycleAction;

// ---- Mongoose document interfaces (page DB) ----
export interface MenuRedirectMappingDocument extends Document {
  headerId: string;
  menuItemId: string;
  targetType: MenuRedirectTargetType;
  targetId?: string;
  targetSlug?: string;
  targetUrl?: string;
  openInNewTab: boolean;
  nofollow: boolean;
  trackClicks: boolean;
  enabled: boolean;
  customClass?: string;
  dataAttributes?: Record<string, string>;
  dynamicParams?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuRedirectAnalyticsDocument extends Document {
  mappingId: Types.ObjectId;
  menuItemId: string;
  targetId?: string;
  clicks: number;
  lastClickedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuRedirectHistoryDocument extends Document {
  action: MenuRedirectAction;
  menuItemId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: Types.ObjectId;
  createdAt: Date;
}
