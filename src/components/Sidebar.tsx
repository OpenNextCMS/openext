'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  ChevronDown,
  List,
  PlusCircle,
  Palette,
  User,
  Settings,
  Menu,
  ChevronLeft,
  Codesandbox,
  Wrench,
  ArrowUpToLine,
  ArrowDownToLine,
  BrainCircuit,
  Route,
  LayoutTemplate,
  BarChart3,
  History,
  FileInput,
  PlusSquare,
  Tag,
  Tags,
  Puzzle,
  Share2,
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { usePlugins, type PluginRecord } from '@/context/PluginContext';
import { runtimePluginPath } from '@/lib/plugins/adminNav';
import { extensionNavLinks, type ExtensionHostPage } from '@/lib/extensions/hostPages';
import { useExtensionHostPages } from '@/hooks/useExtensionHostPages';
import { resolveNavIcon } from '@/lib/plugins/navIcons';
import { useRbac } from '@/hooks/useRbac';
import type { NavSectionId } from '@/lib/rbac/capabilityDefinitions';

type NavSection = {
  label: string;
  icon: LucideIcon;
  path?: string;
  navSection?: NavSectionId;
  links: { label: string; icon: LucideIcon; path: string }[];
};
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import img from '../../public/img/openNext.png';
import dimg from '../../public/img/openNextWhite.png';
import { useTheme } from '@/context/ThemeContext';

const navItems: NavSection[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    navSection: 'dashboard',
    links: [],
  },
  {
    label: 'Blogs',
    icon: Codesandbox,
    navSection: 'blogs',
    links: [
      { label: 'All Blogs', icon: List, path: '/dashboard/blogs/allblogs' },
      { label: 'Add New Blog', icon: PlusCircle, path: '/dashboard/blogs/new' },
      { label: 'Categories', icon: Tag, path: '/dashboard/blogs/categories' },
      { label: 'Tags', icon: Tags, path: '/dashboard/blogs/tags' },
    ],
  },
  {
    label: 'Pages',
    icon: FileText,
    navSection: 'pages',
    links: [
      { label: 'Headers', icon: ArrowUpToLine, path: '/dashboard/pages/headers' },
      { label: 'Footers', icon: ArrowDownToLine, path: '/dashboard/pages/footers' },
      { label: 'All Pages', icon: List, path: '/dashboard/pages/allpages' },
    ],
  },
  {
    label: 'Themes',
    icon: Palette,
    path: '/dashboard/theme-engine',
    navSection: 'themes',
    links: [],
  },
  {
    label: 'Plugins',
    icon: Wrench,
    path: '/dashboard/plugins',
    navSection: 'plugins',
    links: [],
  },
  {
    label: 'Extensions',
    icon: Puzzle,
    path: '/dashboard/extensions',
    navSection: 'plugins',
    links: [],
  },
  {
    label: 'AI Settings',
    icon: BrainCircuit,
    path: '/dashboard/ai-settings',
    navSection: 'ai-settings',
    links: [],
  },
  {
    label: 'User',
    icon: User,
    path: '/dashboard/users',
    navSection: 'users',
    links: [],
  },
];

// Nav entry for the Menu Redirect *system* plugin. Only shown in the sidebar
// when the plugin is active (see PluginContext.activePlugins). It is NOT an
// add-blocks block — it is accessed entirely from the dashboard.
const menuRedirectNav: NavSection = {
  label: 'Menu Redirect',
  icon: Route,
  navSection: 'menu-redirect',
  links: [
    { label: 'Mappings', icon: List, path: '/dashboard/plugins/menu-redirect' },
    { label: 'Visual Editor', icon: LayoutTemplate, path: '/dashboard/plugins/menu-redirect/editor' },
    { label: 'Analytics', icon: BarChart3, path: '/dashboard/plugins/menu-redirect/analytics' },
    { label: 'History', icon: History, path: '/dashboard/plugins/menu-redirect/history' },
  ],
};

/** The active marketplace plugin matching the Menu Redirect system, if any. */
function findMenuRedirectPlugin<T extends { pluginId: string; name: string }>(
  plugins: T[]
): T | undefined {
  return plugins.find((p) => {
    const name = (p.name || '').toLowerCase();
    return p.pluginId === 'menu-redirect' || (name.includes('menu') && name.includes('redirect'));
  });
}

// Nav entry for the Form Builder plugin. Only shown in the sidebar when the
// plugin is installed AND enabled (PluginContext.activePlugins is already
// filtered to isActive). Accessed entirely from the dashboard.
const formBuilderNav: NavSection = {
  label: 'Form Builder',
  icon: FileInput,
  navSection: 'form-builder',
  links: [
    { label: 'All Forms', icon: List, path: '/dashboard/plugins/form-builder' },
    { label: 'New Form', icon: PlusSquare, path: '/dashboard/plugins/form-builder/new' },
  ],
};

/** The active marketplace plugin matching the Form Builder, if any. */
function findFormBuilderPlugin<T extends { pluginId: string; name: string; type?: string }>(
  plugins: T[]
): T | undefined {
  return plugins.find((p) => {
    const name = (p.name || '').toLowerCase();
    return (
      p.pluginId === 'form-builder' ||
      (name.includes('form') && name.includes('builder')) ||
      p.type === 'form'
    );
  });
}

const socialMediaNav: NavSection = {
  label: 'Social Media',
  icon: Share2,
  navSection: 'social-media',
  links: [
    { label: 'Overview', icon: Share2, path: '/dashboard/plugins/social-media' },
    { label: 'Connections', icon: Link2, path: '/dashboard/plugins/social-media/connections' },
    { label: 'Share settings', icon: Settings, path: '/dashboard/plugins/social-media/share' },
    { label: 'Post queue', icon: List, path: '/dashboard/plugins/social-media/posts' },
  ],
};

function findSocialMediaPlugin<T extends { pluginId: string; name: string; type?: string }>(
  plugins: T[]
): T | undefined {
  return plugins.find((p) => {
    const name = (p.name || '').toLowerCase();
    return (
      p.pluginId === 'social-media' ||
      p.pluginId === 'market-4' ||
      p.type === 'social' ||
      name.includes('social media')
    );
  });
}

const BUILTIN_SYSTEM_IDS = new Set(['menu-redirect', 'form-builder', 'social-media']);

/** Uploaded system plugins: single-page opens on name click; multi-page uses collapsible nav. */
function uploadedSystemNavSections(
  plugins: PluginRecord[],
  pageAccessByPlugin?: Map<string, Array<{ id: string; features: string[] | '*' }>>,
  extensionPages: ExtensionHostPage[] = []
): NavSection[] {
  return plugins
    .filter(
      (p) =>
        p.kind === 'system' &&
        p.source === 'uploaded' &&
        !BUILTIN_SYSTEM_IDS.has(p.pluginId)
    )
    .flatMap((p): NavSection[] => {
      let navPages = p.adminNav?.length ? p.adminNav : [];
      const access = pageAccessByPlugin?.get(p.pluginId);
      if (access && !access.some((item) => item.id === '*')) {
        const allowed = new Set(access.map((item) => item.id));
        navPages = navPages.filter((item) => allowed.has(item.id));
      }

      // No allowed pages for this plugin role → hide the section entirely.
      if (access && !access.some((item) => item.id === '*') && navPages.length === 0) {
        return [];
      }

      const pluginLinks = navPages.map((item) => ({
        label: item.label,
        icon: resolveNavIcon(item.icon),
        path: runtimePluginPath(p.pluginId, item.id),
      }));
      const extensionLinks = extensionNavLinks(p.pluginId, extensionPages).map((item) => ({
        label: item.label,
        icon: FileText,
        path: item.path,
      }));
      const links =
        pluginLinks.length === 0 && extensionLinks.length > 0
          ? [
              {
                label: 'Home',
                icon: LayoutDashboard,
                path: runtimePluginPath(p.pluginId),
              },
              ...extensionLinks,
            ]
          : [...pluginLinks, ...extensionLinks];

      if (links.length > 1) {
        return [
          {
            label: p.name || p.pluginId,
            icon: Puzzle,
            navSection: 'uploaded-plugins' as NavSectionId,
            links,
          },
        ];
      }

      const singlePath = links[0]?.path ?? runtimePluginPath(p.pluginId);

      return [
        {
          label: p.name || p.pluginId,
          icon: Puzzle,
          navSection: 'uploaded-plugins' as NavSectionId,
          path: singlePath,
          links: [],
        },
      ];
    });
}

function withExtensionPageLinks(section: NavSection, extra: Array<{ label: string; path: string }>): NavSection {
  if (extra.length === 0) return section;
  const base =
    section.links.length > 0
      ? section.links
      : section.path
        ? [{ label: 'Home', icon: section.icon, path: section.path }]
        : [];
  return {
    ...section,
    path: undefined,
    links: [
      ...base,
      ...extra.map((item) => ({
        label: item.label,
        icon: FileText,
        path: item.path,
      })),
    ],
  };
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const { theme } = useTheme();
  const { activePlugins } = usePlugins();
  const { pages: extensionPages } = useExtensionHostPages();
  const { canNav, can, canUsePlugin, access, loading: rbacLoading } = useRbac();

  // Append plugin system navs only while their plugin is active (installed + enabled)
  // AND the current role's per-plugin allowlist permits it.
  const sections = useMemo(() => {
    const showSection = (section: NavSection) => {
      if (rbacLoading || !section.navSection) return true;
      return canNav(section.navSection);
    };

    let s = navItems.filter(showSection).map((item) => {
      if (item.label !== 'Blogs' || rbacLoading || can('taxonomies.manage')) return item;
      return {
        ...item,
        links: item.links.filter(
          (link) =>
            !link.path.includes('/categories') && !link.path.includes('/tags')
        ),
      };
    });

    const menuRedirectPlugin = findMenuRedirectPlugin(activePlugins);
    if (
      menuRedirectPlugin &&
      canNav('menu-redirect') &&
      (rbacLoading || canUsePlugin(menuRedirectPlugin.pluginId))
    ) {
      s = [
        ...s,
        withExtensionPageLinks(menuRedirectNav, extensionNavLinks(menuRedirectPlugin.pluginId, extensionPages)),
      ];
    }

    const formBuilderPlugin = findFormBuilderPlugin(activePlugins);
    if (
      formBuilderPlugin &&
      canNav('form-builder') &&
      (rbacLoading || canUsePlugin(formBuilderPlugin.pluginId))
    ) {
      s = [
        ...s,
        withExtensionPageLinks(formBuilderNav, extensionNavLinks(formBuilderPlugin.pluginId, extensionPages)),
      ];
    }

    const socialMediaPlugin = findSocialMediaPlugin(activePlugins);
    if (
      socialMediaPlugin &&
      canNav('social-media') &&
      (rbacLoading || canUsePlugin(socialMediaPlugin.pluginId))
    ) {
      s = [
        ...s,
        withExtensionPageLinks(socialMediaNav, extensionNavLinks(socialMediaPlugin.pluginId, extensionPages)),
      ];
    }

    const scopedPlugins = access?.pluginUserType?.pluginId
      ? activePlugins.filter((p) => p.pluginId === access.pluginUserType?.pluginId)
      : activePlugins;
    const allowedPlugins = rbacLoading
      ? scopedPlugins
      : scopedPlugins.filter((p) => canUsePlugin(p.pluginId));

    const pageAccessByPlugin = new Map<string, Array<{ id: string; features: string[] | '*' }>>();
    const accessMap = access?.pluginAccessByPlugin;
    if (accessMap) {
      for (const [pluginId, entry] of Object.entries(accessMap)) {
        if (entry?.pages) pageAccessByPlugin.set(pluginId, entry.pages);
      }
    } else if (access?.pluginUserType?.pluginId && access.pluginUserType.pageAccess) {
      pageAccessByPlugin.set(access.pluginUserType.pluginId, access.pluginUserType.pageAccess);
    }

    const uploadedSystem = uploadedSystemNavSections(allowedPlugins, pageAccessByPlugin, extensionPages);
    if (uploadedSystem.length && canNav('uploaded-plugins')) s = [...s, ...uploadedSystem];
    return s;
  }, [
    activePlugins,
    canNav,
    can,
    canUsePlugin,
    rbacLoading,
    access?.pluginUserType?.pluginId,
    access?.pluginUserType?.pageAccess,
    access?.pluginAccessByPlugin,
    extensionPages,
  ]);

  useEffect(() => {
    // Check if we're on mobile and set initial state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initialize open dropdown based on current path
    const currentSection = sections.find(
      (item) => item.links.some((link) => pathname === link.path) || pathname === item.path
    );
    if (currentSection) {
      setOpenDropdown(currentSection.label);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [pathname, sections]);

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const isActive = (path: string) => pathname === path;
  const isSectionActive = (label: string) => {
    const section = sections.find((item) => item.label === label);
    return section?.path === pathname || section?.links.some((link) => link.path === pathname);
  };

  // Mobile overlay for the sidebar
  const MobileOverlay = () => (
    <>
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          'relative shrink-0 transition-all duration-300 ease-in-out',
          isMobile ? 'w-0' : isCollapsed ? 'w-[70px]' : 'w-64'
        )}
      >
      <MobileOverlay />

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <div
        className={cn(
          'h-screen border-r bg-card fixed top-0 left-0 z-50 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[70px]' : 'w-64',
          isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b">
            {!isCollapsed && (
              <Link href="/dashboard" prefetch>
                <Image
                  src={theme === 'dark' ? dimg : img}
                  alt="Theme Image"
                  width={150}
                  className="mx-5"
                />
              </Link>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              <TooltipProvider delayDuration={0}>
                {sections.map((item) => (
                  <div key={item.label} className="mb-1">
                    {item.links.length > 0 ? (
                      <Collapsible
                        open={openDropdown === item.label && !isCollapsed}
                        onOpenChange={() => !isCollapsed && toggleDropdown(item.label)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant={isSectionActive(item.label) ? 'secondary' : 'ghost'}
                                className={cn(
                                  'w-full justify-start',
                                  isCollapsed ? 'px-2' : 'px-3',
                                  isSectionActive(item.label) && 'font-medium'
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    'h-5 w-5',
                                    isCollapsed ? 'mx-auto' : 'mr-2',
                                    isSectionActive(item.label)
                                      ? 'text-primary'
                                      : 'text-muted-foreground'
                                  )}
                                />
                                {!isCollapsed && (
                                  <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    <ChevronDown
                                      className={cn(
                                        'h-4 w-4 transition-transform text-muted-foreground',
                                        openDropdown === item.label && 'transform rotate-180'
                                      )}
                                    />
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right">{item.label}</TooltipContent>
                          )}
                        </Tooltip>

                        <CollapsibleContent className="pl-9 pr-2 py-1 space-y-1">
                          {item.links.map((link) => (
                            <Button
                              key={link.label}
                              variant={isActive(link.path) ? 'secondary' : 'ghost'}
                              size="sm"
                              className={cn(
                                'w-full justify-start h-9',
                                isActive(link.path) && 'font-medium'
                              )}
                              asChild
                            >
                              <Link href={link.path} prefetch>
                                <link.icon
                                  className={cn(
                                    'h-4 w-4 mr-2',
                                    isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                                  )}
                                />
                                <span>{link.label}</span>
                              </Link>
                            </Button>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive(item.path!) ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start',
                              isCollapsed ? 'px-2' : 'px-3',
                              isActive(item.path!) && 'font-medium'
                            )}
                            asChild
                          >
                            <Link href={item.path!} prefetch>
                              <item.icon
                                className={cn(
                                  'h-5 w-5',
                                  isCollapsed ? 'mx-auto' : 'mr-2',
                                  isActive(item.path!) ? 'text-primary' : 'text-muted-foreground'
                                )}
                              />
                              {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                      </Tooltip>
                    )}
                  </div>
                ))}

                {/* Settings — admin only */}
                {(rbacLoading || canNav('settings')) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive('/dashboard/settings') ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        isCollapsed ? 'px-2' : 'px-3',
                        isActive('/dashboard/settings') && 'font-medium'
                      )}
                      asChild
                    >
                      <Link href="/dashboard/settings" prefetch>
                        <Settings
                          className={cn(
                            'h-5 w-5',
                            isCollapsed ? 'mx-auto' : 'mr-2',
                            isActive('/dashboard/settings')
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                        {!isCollapsed && <span>Settings</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
                </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </nav>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
}
