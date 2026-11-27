import {
  LayoutDashboard,
  List,
  LayoutTemplate,
  BarChart3,
  History,
  FileInput,
  PlusSquare,
  Settings,
  Users,
  User,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  puzzle: Puzzle,
  list: List,
  settings: Settings,
  users: Users,
  user: User,
  dashboard: LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  'layout-template': LayoutTemplate,
  template: LayoutTemplate,
  analytics: BarChart3,
  'bar-chart': BarChart3,
  'bar-chart-3': BarChart3,
  history: History,
  forms: FileInput,
  'file-input': FileInput,
  'plus-square': PlusSquare,
  add: PlusSquare,
};

export function resolveNavIcon(name?: string): LucideIcon {
  if (!name) return Puzzle;
  const normalized = name.trim().toLowerCase();
  return NAV_ICON_MAP[normalized] ?? Puzzle;
}
