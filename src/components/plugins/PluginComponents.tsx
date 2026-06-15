import React from 'react';
import { Menu, X } from 'lucide-react';
import { resolveRedirectUrl, triggerBlockEvent } from '@/hooks/useBlockEvents';
import type { BlockRendererProps } from '@/types/index';
<<<<<<< HEAD
export { SliderPlugin } from './SliderPlugin';
=======
>>>>>>> khadija

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

// 4. Social Integration Component (for Social Media plugins)
export const SocialPlugin: React.FC<PluginBlockProps> = () => (
  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
    <div className="flex gap-4 justify-center py-2">
      {['Facebook', 'Twitter', 'LinkedIn', 'Instagram'].map((platform) => (
        <button
          key={platform}
          className="p-3 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
        >
          <span className="text-xl">
            {platform === 'Facebook'
              ? '📘'
              : platform === 'Twitter'
                ? '🐦'
                : platform === 'LinkedIn'
                  ? '💼'
                  : '📸'}
          </span>
        </button>
      ))}
    </div>
    <p className="text-center text-xs text-blue-600 mt-2 font-medium italic">
      Click to connect your accounts
    </p>
  </div>
);

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

<<<<<<< HEAD
=======
// 6. Carousel Slider Component (for Casarole Slider)
export const SliderPlugin = ({ block }: PluginBlockProps) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Parse content if it exists
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : block.data || {};
    } catch {
      return block.data || {};
    }
  }, [block.content, block.data]);

  const slides = content.slides || [
    { title: 'Premium Slider', desc: 'Swipe to explore our collection', image: '' },
    { title: 'Second Slide', desc: 'Explore more features here', image: '' },
    { title: 'Third Slide', desc: 'Ready for final content', image: '' },
  ];

  const slidesToShow = Math.max(1, content.slidesToShow || 1);
  const accentColor = content.accentColor || '#eab308';
  const showArrows = content.showArrows !== false;
  const showDots = content.showDots !== false;

  const next = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  // Calculate visible slides
  const visibleSlides = [];
  for (let i = 0; i < slidesToShow; i++) {
    const index = (currentIndex + i) % slides.length;
    visibleSlides.push({ ...slides[index], index });
  }

  return (
    <div
      className="p-6 border border-slate-700 rounded-2xl shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col"
      style={{
        backgroundColor: (block.style?.backgroundColor as string) || '#0f172a',
        ...block.style,
      }}
    >
      <div
        className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30"
        style={{ background: `linear-gradient(to right, ${accentColor}44, #3b82f644)` }}
      />
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <span style={{ color: accentColor }}>🎠</span> {block.label || 'Casarole Slider'}
          </h3>
          {showDots && (
            <div className="flex gap-1">
              {slides.map((_: unknown, i: number) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: i === currentIndex ? accentColor : 'rgba(255,255,255,0.2)',
                    transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          className={`grid gap-4 flex-1`}
          style={{ gridTemplateColumns: `repeat(${slidesToShow}, minmax(0, 1fr))` }}
        >
          {visibleSlides.map((slide, idx) => (
            <div
              key={`${slide.index}-${idx}`}
              className="relative rounded-xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-sm flex flex-col animate-in fade-in zoom-in duration-500"
            >
              {slide.image ? (
                <div className="h-40 w-full relative">
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="h-32 w-full bg-white/5 flex items-center justify-center">
                  <span className="text-white/20 text-4xl">🖼️</span>
                </div>
              )}
              <div className="p-4 text-center flex-1 flex flex-col justify-center">
                <div className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight mb-2">
                  {slide.title}
                </div>
                <p className="text-slate-400 text-xs line-clamp-2">{slide.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          {showArrows ? (
            <button
              onClick={prev}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              ←
            </button>
          ) : (
            <div />
          )}

          <button
            className="px-6 py-2 font-bold rounded-full text-sm hover:scale-105 active:scale-95 transition-all"
            style={{ backgroundColor: accentColor, color: '#0f172a' }}
          >
            VIEW DETAILS
          </button>

          {showArrows ? (
            <button
              onClick={next}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              →
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};

>>>>>>> khadija
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
