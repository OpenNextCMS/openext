import React from 'react';
import { Menu, X } from 'lucide-react';
import { resolveRedirectUrl, triggerBlockEvent } from '@/hooks/useBlockEvents';
import type { BlockRendererProps } from '@/types/index';
import { buildShareUrls } from '@/lib/social-media/shareUrls';
import { SOCIAL_PLATFORM_LABELS } from '@/lib/social-media/constants';
import type { SocialPlatformId } from '@/types/social-media';
import { apiUrl } from '@/lib/apiClient';
import { SocialPlatformIcon } from '@/components/social-media/SocialPlatformIcon';
export { SliderPlugin } from './SliderPlugin';

interface PluginBlockProps {
  block: BlockRendererProps['block'] & { data?: Record<string, unknown> };
  isEditing?: boolean;
}

// 1. Chart Component (for Data Visualizer, Analytics)
export const ChartPlugin = ({ block }: PluginBlockProps) => (
  <div className="p-4 bg-white border-2 border-primary/10 rounded-xl shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <span className="p-2 bg-primary/10 rounded-lg">📊</span>
      <h3 className="font-bold text-primary">{block.label || 'Data Analytics'}</h3>
    </div>
    <div className="flex items-end justify-between h-32 gap-1 px-2">
      {[60, 80, 45, 90, 55, 70, 85].map((h, i) => (
        <div
          key={i}
          className="w-full bg-primary/60 rounded-t-sm hover:bg-primary transition-all cursor-pointer"
          style={{ height: `${h}%` }}
          title={`Value: ${h}`}
        />
      ))}
    </div>
    <div className="mt-2 text-[10px] text-muted-foreground flex justify-between uppercase tracking-wider">
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>
      <span>Sun</span>
    </div>
  </div>
);

// 2. Video Player Component (for Video Player, Content Pro)
export const VideoPlugin = ({ block }: PluginBlockProps) => {
  const videoUrl = (block.data?.url as string) || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border-4 border-black">
      <iframe
        width="100%"
        height="100%"
        src={videoUrl}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

// 3. SEO / Checklist Component (for SEO Optimizer)
export const SeoPlugin: React.FC<PluginBlockProps> = () => (
  <div className="p-6 bg-slate-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <span className="text-green-500">🔍</span> SEO Health Score
      </h3>
      <span className="text-2xl font-black text-green-600">88/100</span>
    </div>
    <div className="space-y-2">
      {[
        { t: 'Meta Tags Optimized', s: true },
        { t: 'Image Alt Texts Found', s: true },
        { t: 'Mobile Responsive Load', s: true },
        { t: 'Missing H1 Heading', s: false },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span>{item.s ? '✅' : '❌'}</span>
          <span className={item.s ? 'text-slate-600' : 'text-red-500 font-medium'}>{item.t}</span>
        </div>
      ))}
    </div>
  </div>
);

// 4. Social Integration — share / connected profile buttons
export const SocialPlugin: React.FC<PluginBlockProps> = ({ block, isEditing = true }) => {
  const content = React.useMemo(() => {
    try {
      const raw = typeof block.content === 'string' ? block.content : '';
      if (raw.startsWith('{')) {
        return JSON.parse(raw) as {
          url?: string;
          title?: string;
          platforms?: SocialPlatformId[];
          style?: 'icon' | 'icon-label' | 'label';
          useConnectedPlatforms?: boolean;
          /** When true (default), follow dashboard Share settings button style. */
          useGlobalButtonStyle?: boolean;
        };
      }
    } catch {
      /* ignore */
    }
    return {};
  }, [block.content]);

  const [connected, setConnected] = React.useState<
    Array<{ id: SocialPlatformId; label: string; profileUrl: string; shareEnabled: boolean }>
  >([]);
  const [globalStyle, setGlobalStyle] = React.useState<'icon' | 'icon-label' | 'label'>(
    'icon-label'
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    fetch(apiUrl('/api/social-media/public-config'), { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message || 'unavailable');
        return json.data as {
          platforms: Array<{
            id: SocialPlatformId;
            label: string;
            profileUrl: string;
            shareEnabled: boolean;
          }>;
          buttonStyle?: 'icon' | 'icon-label' | 'label';
        };
      })
      .then((data) => {
        if (!active) return;
        setConnected(Array.isArray(data.platforms) ? data.platforms : []);
        if (
          data.buttonStyle === 'icon' ||
          data.buttonStyle === 'icon-label' ||
          data.buttonStyle === 'label'
        ) {
          setGlobalStyle(data.buttonStyle);
        }
      })
      .catch(() => {
        if (active) setConnected([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const url =
    (typeof content.url === 'string' && content.url) ||
    (typeof window !== 'undefined' ? window.location.href : 'https://example.com');
  const title =
    (typeof content.title === 'string' && content.title) ||
    block.label ||
    'Share this page';

  const useConnected = content.useConnectedPlatforms !== false;
  const platforms: SocialPlatformId[] = (() => {
    if (useConnected) return connected.map((p) => p.id);
    if (Array.isArray(content.platforms) && content.platforms.length) {
      return content.platforms;
    }
    return connected.map((p) => p.id);
  })();

  // Prefer an explicit block style when the user set one (useGlobalButtonStyle: false).
  // New drops set useGlobalButtonStyle: true so Share settings buttonStyle applies.
  const explicitStyle =
    content.style === 'icon' || content.style === 'icon-label' || content.style === 'label'
      ? content.style
      : null;
  const useGlobal =
    content.useGlobalButtonStyle === true
      ? true
      : content.useGlobalButtonStyle === false
        ? false
        : explicitStyle === null;
  const style: 'icon' | 'icon-label' | 'label' = useGlobal
    ? globalStyle
    : explicitStyle || globalStyle;

  const items = platforms
    .map((platform) => {
      const profile = connected.find((p) => p.id === platform);
      const share = buildShareUrls({
        url,
        title,
        platforms: [platform],
      })[0];
      const href = profile?.profileUrl?.trim() || share?.href || '';
      if (!href) return null;
      return {
        platform,
        label: SOCIAL_PLATFORM_LABELS[platform] || profile?.label || platform,
        href,
      };
    })
    .filter(Boolean) as Array<{ platform: SocialPlatformId; label: string; href: string }>;

  const showIcon = style === 'icon' || style === 'icon-label';
  const showLabel = style === 'label' || style === 'icon-label';

  const buttonClass =
    style === 'icon'
      ? 'inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-sm transition-transform hover:scale-110 hover:opacity-80'
      : 'inline-flex items-center gap-2 rounded-full bg-transparent px-2 py-1.5 text-sm transition-transform hover:scale-105 hover:opacity-80';

  return (
    <div className="rounded-2xl border border-transparent bg-transparent p-2">
      {style !== 'icon' && (
        <div className="mb-2 text-center text-sm font-medium text-blue-800">
          {isEditing ? 'Social Media' : title}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3 py-1">
        {loading && isEditing ? (
          <p className="text-xs text-blue-600">Loading connected platforms…</p>
        ) : (
          items.map((item) => (
            <a
              key={item.platform}
              href={isEditing ? undefined : item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (isEditing) e.preventDefault();
              }}
              className={buttonClass}
              title={item.label}
              aria-label={item.label}
            >
              {showIcon && (
                <SocialPlatformIcon platform={item.platform} size={style === 'icon' ? 22 : 18} />
              )}
              {showLabel && (
                <span className="font-medium text-slate-700">{item.label}</span>
              )}
            </a>
          ))
        )}
        {!loading && items.length === 0 && (
          <p className="text-xs text-blue-600">
            {isEditing
              ? 'Connect platforms in Social Media settings, or pick them in the right sidebar'
              : 'No social links available'}
          </p>
        )}
      </div>
      {isEditing && !loading && (
        <p className="mt-2 text-center text-[10px] text-blue-600/80">
          Display: {style === 'icon' ? 'Icons only' : style === 'label' ? 'Labels only' : 'Icons + labels'}
          {useGlobal ? ' (from Share settings)' : ''}
        </p>
      )}
    </div>
  );
};

// 5. Form Builder Component (for Form plugins)
export const FormPlugin: React.FC<PluginBlockProps> = () => (
  <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
    <h3 className="font-bold text-slate-700 border-b pb-2">Contact Us</h3>
    <div className="space-y-3">
      <div className="h-10 bg-slate-50 border border-slate-200 rounded px-3 flex items-center text-slate-400 text-sm italic">
        Enter your name...
      </div>
      <div className="h-10 bg-slate-50 border border-slate-200 rounded px-3 flex items-center text-slate-400 text-sm italic">
        Enter your email...
      </div>
      <div className="h-24 bg-slate-50 border border-slate-200 rounded p-3 text-slate-400 text-sm italic">
        Your message here...
      </div>
      <button className="w-full py-3 bg-primary text-white font-bold rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all">
        SUBMIT FORM
      </button>
    </div>
  </div>
);

type MenuPluginLink = {
  label: string;
  href: string;
  onClick?: string;
  onClickValue?: string;
};

// 7. Menu Redirect Component
export const MenuPlugin = ({ block, isEditing = true }: PluginBlockProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

  const links: MenuPluginLink[] = Array.isArray(content.links)
    ? content.links
    : [
        { label: 'Home', href: '/', onClick: 'redirect', onClickValue: '/' },
        { label: 'About', href: '/about-us', onClick: 'redirect', onClickValue: '/about-us' },
        { label: 'Contact', href: '/contact', onClick: 'redirect', onClickValue: '/contact' },
      ];

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, link: MenuPluginLink) => {
    if (isEditing) return;

    event.preventDefault();
    event.stopPropagation();

    if (link.onClick && link.onClick !== 'none') {
      triggerBlockEvent({
        onClick: link.onClick,
        onClickValue: link.onClickValue || link.href,
      });
      return;
    }

    if (link.href) {
      window.location.href = resolveRedirectUrl(link.href);
    }
  };

  return (
    <nav
      className="w-full border border-slate-200 bg-white px-5 py-3 shadow-sm"
      style={{
        backgroundColor: block.style?.backgroundColor || '#ffffff',
        color: block.style?.color || '#111827',
        borderRadius: block.style?.borderRadius || '0px',
        ...block.style,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="text-base font-semibold leading-none">{content.logo || 'Menu'}</div>
        <div className="hidden items-center gap-2 md:flex">
          {links.map((link, index) => (
            <a
              key={`${link.label}-${index}`}
              href={isEditing ? undefined : link.href}
              onClick={(event) => handleLinkClick(event, link)}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
              style={{ color: block.style?.color || '#111827' }}
            >
              {link.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 md:hidden"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 md:hidden">
          {links.map((link, index) => (
            <a
              key={`${link.label}-mobile-${index}`}
              href={isEditing ? undefined : link.href}
              onClick={(event) => handleLinkClick(event, link)}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100"
              style={{ color: block.style?.color || '#111827' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

// 8. Generic Plugin Component (Fallback)
export const GenericPlugin = ({ plugin }: { block?: unknown; plugin?: { icon?: string; name?: string } }) => (
  <div className="p-8 bg-muted/20 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center text-center">
    <span className="text-5xl mb-4">{plugin?.icon || '🧩'}</span>
    <h3 className="text-xl font-bold">{plugin?.name || 'Plugin Block'}</h3>
    <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
      Successfully implemented! Drag and configure from the sidebar.
    </p>
    <div className="mt-4 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-tighter">
      Module Ready
    </div>
  </div>
);
