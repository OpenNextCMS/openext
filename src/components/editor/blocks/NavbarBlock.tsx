'use client';

import { Trash2, Menu, X, MousePointer2, ChevronDown } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedLabel,
  setSelectedBlock,
  updateBlockContent,
} from '@/redux/canvasSlice';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { resolveRedirectUrl, useBlockEvents } from '@/hooks/useBlockEvents';
import { useMergedMenu, type MenuDirective } from '@/components/menu-redirect/useMergedMenu';
import { trackMenuClick } from '@/lib/menu-redirect/track-client';
import { menuItemIdFor } from '@/lib/menu-redirect/menu-item-id';

type NavbarLayout = 'horizontal' | 'vertical' | 'hamburger' | 'two-line';

interface NavbarContent {
  logo?: string;
  logoType?: 'text' | 'image';
  logoSource?: 'website' | 'custom';
  logoImage?: string;
  layout?: NavbarLayout;
  links?: NavbarLink[];
}

type NavbarLink = {
    label: string;
    href: string;
    onClick?: string;
    onClickValue?: string;
    children?: NavbarLink[];
};

export const NavbarBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState('Brand');
  const [siteIcon, setSiteIcon] = useState<string | null>(null);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  
  const isPreview = pathname === '/preview';
  const mergedMenu = useMergedMenu();

  const navbarData: NavbarContent = (() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? { logoSource: 'custom', ...JSON.parse(block.content) }
        : { logo: block.content || 'Brand', links: [] };
    } catch {
      return { logo: 'Brand', links: [] };
    }
  })();

  useEffect(() => {
    let alive = true;
    fetch('/api/dashboard/settings')
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        const settings = json?.data?.settings;
        if (!settings) return;
        setSiteTitle(settings.siteTitle || 'Brand');
        setSiteIcon(settings.siteIcon ? `/siteicon/${settings.siteIcon}` : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);
    if (!isEditing) return;
    dispatch(setSelectedLabel('Navbar Block'));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const handleLogoBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    if (navbarData.logoSource === 'website') return;
    const newLogo = e.currentTarget.textContent || '';
    const updatedContent = JSON.stringify({ ...navbarData, logo: newLogo });
    dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: updatedContent }));
  };

  const handleNavClick = (
    e: React.MouseEvent,
    link: NonNullable<NavbarContent['links']>[number],
    directive: MenuDirective | null
  ) => {
    if (isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();

    if (directive && !directive.enabled) return;

    if (directive?.trackClicks && directive.mappingId) trackMenuClick(directive.mappingId);

    const rawHref = directive?.href || link.href;
    const href = resolveRedirectUrl(rawHref);

    if (directive?.openInNewTab) {
      window.open(href, '_blank', 'noopener');
      return;
    }

    if (isPreview) {
      // In preview mode, navigate by updating the pagename query param
      const targetPage = rawHref.startsWith('/') ? rawHref.slice(1) : rawHref;
      const params = new URLSearchParams(searchParams.toString());
      params.set('pagename', targetPage);
      router.push(`/preview?${params.toString()}`);
    } else {
      window.location.href = href;
    }
  };

  // Centralized link renderer so merged hrefs/attrs apply across every layout.
  const renderNavLink = (
    link: NavbarLink,
    index: number,
    className: string,
    parentId?: string
  ) => {
    const directive = !isEditing ? mergedMenu.getFor(link.label, index, parentId) : null;
    const effectiveHref = directive?.href || link.href;
    const disabled = directive ? !directive.enabled : false;
    const target = directive?.openInNewTab ? '_blank' : undefined;
    const rel =
      [target ? 'noopener' : '', directive?.nofollow ? 'nofollow' : ''].filter(Boolean).join(' ') ||
      undefined;
    const dataAttrs = directive?.dataAttributes
      ? Object.fromEntries(
          Object.entries(directive.dataAttributes).map(([k, v]) => [
            k.startsWith('data-') ? k : `data-${k}`,
            v,
          ])
        )
      : {};
    return (
      <a
        href={isEditing || disabled ? undefined : effectiveHref}
        target={target}
        rel={rel}
        onClick={(e) => handleNavClick(e, link, directive)}
        className={`${className} ${directive?.customClass ?? ''}`}
        style={{ color: block.style?.color || 'inherit', ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
        {...dataAttrs}
      >
        {link.label}
      </a>
    );
  };

  const renderNavItem = (
    link: NavbarLink,
    index: number,
    className: string,
    parentId?: string
  ) => {
    const itemId = menuItemIdFor(link.label, index, parentId);
    const pathKey = parentId ? `${parentId}>${itemId}` : itemId;
    const children = Array.isArray(link.children) ? link.children : [];
    if (children.length === 0) {
      return (
        <span key={itemId}>
          {renderNavLink(link, index, className, parentId)}
        </span>
      );
    }

    return (
      <div
        key={itemId}
        className="relative flex items-center"
        onMouseEnter={() => setOpenMenuPath(pathKey)}
        onMouseLeave={() => setOpenMenuPath((current) => (current?.startsWith(pathKey) ? null : current))}
      >
        <div className="flex items-center gap-1">
          {renderNavLink(link, index, className, parentId)}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </div>
        {openMenuPath?.startsWith(pathKey) ? (
          <div
            className="absolute left-0 top-full z-50 min-w-40 rounded-md border bg-background p-1 shadow-lg"
            style={{ color: block.style?.color || 'inherit' }}
          >
            {children.map((child, childIndex) =>
              renderNavItem(
                child,
                childIndex,
                'block rounded px-3 py-2 text-sm font-medium hover:bg-muted hover:opacity-80 transition-opacity cursor-pointer',
                pathKey
              )
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderNavStackItem = (
    link: NavbarLink,
    index: number,
    className: string,
    parentId?: string
  ) => {
    const itemId = menuItemIdFor(link.label, index, parentId);
    const children = Array.isArray(link.children) ? link.children : [];
    return (
      <div key={itemId} className="flex flex-col gap-2">
        {renderNavLink(link, index, className, parentId)}
        {children.length > 0 ? (
          <div className="ml-4 flex flex-col gap-2 border-l pl-3">
            {children.map((child, childIndex) =>
              renderNavStackItem(child, childIndex, className, itemId)
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const links = navbarData.links || [
    { label: 'Home', href: '#' },
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  const layout: NavbarLayout = navbarData.layout || 'horizontal';
  const useWebsiteLogo = navbarData.logoType === 'image' && navbarData.logoSource === 'website';

  const logoNode =
    navbarData.logoType === 'image' ? (
      useWebsiteLogo && siteIcon ? (
        <img
          src={siteIcon}
          alt={siteTitle}
          style={{ maxHeight: '40px', objectFit: 'contain' }}
        />
      ) : useWebsiteLogo ? (
        <div className="text-xl font-bold outline-none" style={{ color: block.style?.color || 'inherit' }}>
          {siteTitle}
        </div>
      ) : (
        <img
          src={navbarData.logoImage || 'https://via.placeholder.com/150x50?text=Logo'}
          alt={navbarData.logo || 'Brand'}
          style={{ maxHeight: '40px', objectFit: 'contain' }}
        />
      )
    ) : (
      <div
        contentEditable={isEditing && navbarData.logoSource !== 'website'}
        suppressContentEditableWarning={true}
        onBlur={handleLogoBlur}
        className="text-xl font-bold outline-none"
        style={{ color: block.style?.color || 'inherit' }}
      >
        {navbarData.logoSource === 'website' ? siteTitle : navbarData.logo || 'Brand'}
      </div>
    );

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full mb-4 group"
      style={{
        cursor: isEditing ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      {isEditing && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '0',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 20,
          }}
        >
          <MousePointer2 size={10} />
          <span>Navbar</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '6px',
            zIndex: 20,
          }}
        >
          <button
            onClick={handleRemove}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {layout === 'two-line' ? (
        <nav
          className="flex flex-col px-6 py-3 shadow-sm relative transition-all"
          style={{
            ...block.style,
            border: isHovered && isEditing ? '2px solid #3b82f6' : block.style?.border || 'none',
            backgroundColor:
              isHovered && block.hoverStyle?.backgroundColor
                ? block.hoverStyle.backgroundColor
                : block.style?.backgroundColor || '#ffffff',
          }}
        >
          <div
            className="flex items-center justify-center pb-3 mb-3 border-b"
            style={{ borderColor: 'currentColor', borderOpacity: 0.1 } as React.CSSProperties}
          >
            {logoNode}
          </div>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {links.map((link, index) =>
              renderNavItem(
                link,
                index,
                'text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer'
              )
            )}
          </div>
        </nav>
      ) : layout === 'vertical' ? (
        <nav
          className={`flex flex-col items-stretch px-6 py-4 shadow-sm relative transition-all gap-3 ${
            isEditing ? '' : 'h-full min-h-screen'
          }`}
          style={{
            ...block.style,
            border: isHovered && isEditing ? '2px solid #3b82f6' : block.style?.border || 'none',
            backgroundColor:
              isHovered && block.hoverStyle?.backgroundColor
                ? block.hoverStyle.backgroundColor
                : block.style?.backgroundColor || '#ffffff',
          }}
        >
          <div className="flex items-center">{logoNode}</div>
          <div className="flex flex-col gap-2">
            {links.map((link, index) =>
              renderNavStackItem(
                link,
                index,
                'text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer py-1'
              )
            )}
          </div>
        </nav>
      ) : layout === 'hamburger' ? (
        <nav
          className="flex items-center justify-between px-6 py-4 shadow-sm relative transition-all"
          style={{
            ...block.style,
            border: isHovered && isEditing ? '2px solid #3b82f6' : block.style?.border || 'none',
            backgroundColor:
              isHovered && block.hoverStyle?.backgroundColor
                ? block.hoverStyle.backgroundColor
                : block.style?.backgroundColor || '#ffffff',
          }}
        >
          <div className="flex items-center">{logoNode}</div>

          <button
            className="p-2 hover:opacity-80"
            style={{ color: block.style?.color || 'inherit' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {isMobileMenuOpen && (
            <div
              className="absolute top-full left-0 right-0 shadow-lg z-50 border-t"
              style={{
                backgroundColor: block.style?.backgroundColor || '#ffffff',
                borderColor: block.style?.borderColor || '#e5e7eb',
              }}
            >
              <div className="flex flex-col p-4 space-y-4">
                {links.map((link, index) =>
                  renderNavStackItem(link, index, 'text-base font-medium hover:opacity-80')
                )}
              </div>
            </div>
          )}
        </nav>
      ) : (
        <nav
          className="flex items-center justify-between px-6 py-4 shadow-sm relative transition-all"
          style={{
            ...block.style,
            border: isHovered && isEditing ? '2px solid #3b82f6' : block.style?.border || 'none',
            backgroundColor:
              isHovered && block.hoverStyle?.backgroundColor
                ? block.hoverStyle.backgroundColor
                : block.style?.backgroundColor || '#ffffff',
          }}
        >
          <div className="flex items-center">{logoNode}</div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link, index) =>
              renderNavItem(
                link,
                index,
                'text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer'
              )
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 hover:opacity-80"
            style={{ color: block.style?.color || 'inherit' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div
              className="absolute top-full left-0 right-0 shadow-lg md:hidden z-50 border-t"
              style={{
                backgroundColor: block.style?.backgroundColor || '#ffffff',
                borderColor: block.style?.borderColor || '#e5e7eb',
              }}
            >
              <div className="flex flex-col p-4 space-y-4">
                {links.map((link, index) =>
                  renderNavStackItem(link, index, 'text-base font-medium hover:opacity-80')
                )}
              </div>
            </div>
          )}
        </nav>
      )}
    </div>
  );
};
