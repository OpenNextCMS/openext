'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { setSelectedBlock, setSelectedLabel, updateBlockContent } from '@/redux/canvasSlice';
import RenderBlock from '@/components/editor/renderblock';
import {
  createSliderSlide,
  normalizeSliderContent,
  type SliderContent,
  type SliderPreset,
  type SliderSlide,
} from './sliderSchema';

interface SliderPluginProps {
  block: BlockRendererProps['block'] & { data?: Record<string, unknown> };
  isEditing?: boolean;
}

const parseContent = (block: SliderPluginProps['block']): SliderContent => {
  try {
    if (typeof block.content === 'string' && block.content.startsWith('{')) {
      return normalizeSliderContent(JSON.parse(block.content));
    }
  } catch {
    return normalizeSliderContent(block.data || {});
  }

  return normalizeSliderContent(block.data || {});
};

const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  React.useEffect(() => {
    const update = () => {
      if (window.innerWidth < 640) setBreakpoint('mobile');
      else if (window.innerWidth < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return breakpoint;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const EditableText = ({
  value,
  className,
  style,
  isEditing,
  onChange,
  as = 'div',
}: {
  value: string;
  className?: string;
  style?: React.CSSProperties;
  isEditing: boolean;
  onChange: (value: string) => void;
  as?: 'div' | 'h2' | 'p' | 'span';
}) => {
  const Element = as;

  return (
    <Element
      contentEditable={isEditing}
      suppressContentEditableWarning
      className={className}
      style={{ outline: 'none', ...style }}
      onBlur={(event) => {
        if (isEditing) onChange(event.currentTarget.innerText.trim());
      }}
      onClick={(event) => {
        if (isEditing) event.stopPropagation();
      }}
    >
      {value}
    </Element>
  );
};

function SliderSlideDropZone({
  block,
  slide,
  isEditing,
  children,
}: {
  block: SliderPluginProps['block'];
  slide: SliderSlide;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${block.uniqueId}-slider-slide-${slide.id}`,
    data: {
      type: 'slider-slide',
      blockId: block.uniqueId,
      slideId: slide.id,
    },
    disabled: !isEditing || !block.uniqueId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative h-full w-full ${isOver ? 'outline outline-2 outline-primary' : ''}`}
    >
      {children}
      {isEditing && slide.type === 'custom' && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md border border-dashed border-white/70 bg-black/30 px-3 py-2 text-center text-xs text-white">
          Drop blocks into this slide
        </div>
      )}
    </div>
  );
}

export const SliderPlugin = ({ block, isEditing = true }: SliderPluginProps) => {
  const dispatch = useAppDispatch();
  const slider = React.useMemo(() => parseContent(block), [block]);
  const breakpoint = useBreakpoint();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [uploadingSlideId, setUploadingSlideId] = React.useState<string | null>(null);
  const imageInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const slides = slider.slides;
  const currentResponsive = slider.responsive[breakpoint];
  const slidesPerView = clamp(currentResponsive.slidesPerView || 1, 1, Math.max(slides.length, 1));
  const maxIndex = slider.navigation.infinite
    ? Math.max(slides.length - 1, 0)
    : Math.max(slides.length - slidesPerView, 0);
  const activeIndex = clamp(currentIndex, 0, maxIndex);
  const activeSlide = slides[activeIndex] || slides[0];
  const gap = currentResponsive.gap || slider.styling.cardGap || 16;
  const height = `${currentResponsive.height || Number.parseInt(slider.layout.height, 10) || 360}px`;

  React.useEffect(() => {
    setCurrentIndex((value) => clamp(value, 0, maxIndex));
  }, [maxIndex]);

  React.useEffect(() => {
    if (!slider.autoplay || slides.length <= slidesPerView) return;
    if (slider.pauseOnHover && isHovered) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((value) =>
        value >= maxIndex ? (slider.navigation.infinite ? 0 : maxIndex) : value + 1
      );
    }, slider.interval);

    return () => window.clearInterval(timer);
  }, [
    isHovered,
    maxIndex,
    slider.autoplay,
    slider.interval,
    slider.navigation.infinite,
    slider.pauseOnHover,
    slides.length,
    slidesPerView,
  ]);

  const commit = React.useCallback(
    (next: SliderContent) => {
      if (!block.uniqueId) return;
      dispatch(updateBlockContent({ id: block.uniqueId, content: JSON.stringify(next) }));
    },
    [block.uniqueId, dispatch]
  );

  const updateSlide = (slideId: string, patch: Partial<SliderSlide['content']>) => {
    const next = {
      ...slider,
      slides: slider.slides.map((slide) =>
        slide.id === slideId
          ? { ...slide, content: { ...slide.content, ...patch } }
          : slide
      ),
    };
    commit(next);
  };

  const addFirstSlide = () => {
    const next = {
      ...slider,
      slides: [createSliderSlide(slider.preset, 1)],
    };
    commit(next);
    setCurrentIndex(0);
  };

  const selectSlider = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Slider'));
  };

  const goTo = (index: number) => {
    if (slides.length === 0) return;
    if (slider.navigation.infinite) {
      setCurrentIndex((index + slides.length) % slides.length);
      return;
    }
    setCurrentIndex(clamp(index, 0, maxIndex));
  };

  const next = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    goTo(activeIndex + 1);
  };

  const previous = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    goTo(activeIndex - 1);
  };

  const uploadSlideImage = async (slide: SliderSlide, file: File) => {
    if (!isEditing) return;
    try {
      setUploadingSlideId(slide.id);
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/editor/background-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.filePath) {
        throw new Error(data.message || 'Upload failed');
      }
      updateSlide(slide.id, { image: data.filePath });
    } catch (error) {
      console.error('Slide image upload failed:', error);
      const nextImage = window.prompt('Image upload failed. Enter an image URL instead.', slide.content.image);
      if (nextImage !== null) updateSlide(slide.id, { image: nextImage });
    } finally {
      setUploadingSlideId(null);
    }
  };

  const changeImage = (slide: SliderSlide, event: React.MouseEvent) => {
    if (!isEditing) return;
    event.stopPropagation();
    imageInputRefs.current[slide.id]?.click();
  };

  const renderImageUploadInput = (slide: SliderSlide) =>
    isEditing ? (
      <input
        ref={(node) => {
          imageInputRefs.current[slide.id] = node;
        }}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadSlideImage(slide, file);
          event.target.value = '';
        }}
      />
    ) : null;

  const renderMedia = (slide: SliderSlide, mode: 'background' | 'card' = 'card') => {
    if (!slide.content.image) {
      return (
        <>
          <button
            type="button"
            onClick={(event) => changeImage(slide, event)}
            className="flex h-full min-h-[180px] w-full items-center justify-center bg-slate-100 text-sm text-slate-500"
          >
            {uploadingSlideId === slide.id ? 'Uploading...' : isEditing ? 'Add image' : 'Image'}
          </button>
          {renderImageUploadInput(slide)}
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={(event) => changeImage(slide, event)}
          className={mode === 'background' ? 'absolute inset-0 h-full w-full' : 'block h-full w-full'}
          aria-label={isEditing ? 'Change slide image' : slide.content.title}
        >
          <img
            src={slide.content.image}
            alt={slide.content.title}
            loading="lazy"
            className={`h-full w-full object-cover ${uploadingSlideId === slide.id ? 'opacity-50' : ''}`}
            draggable={false}
          />
        </button>
        {renderImageUploadInput(slide)}
      </>
    );
  };

  const renderButton = (slide: SliderSlide, dark = false) => {
    if (!slide.content.buttonText && !isEditing) return null;

    return (
      <a
        href={isEditing ? undefined : slide.content.buttonUrl || '#'}
        onClick={(event) => {
          if (isEditing) event.preventDefault();
        }}
        className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: slider.styling.accentColor,
          color: dark ? '#ffffff' : '#ffffff',
        }}
      >
        <EditableText
          value={slide.content.buttonText || 'Button'}
          isEditing={isEditing}
          as="span"
          onChange={(buttonText) => updateSlide(slide.id, { buttonText })}
        />
      </a>
    );
  };

  const renderRating = (rating = 5) => (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4"
          style={{
            color: index < Math.round(rating) ? '#f59e0b' : '#d1d5db',
            fill: index < Math.round(rating) ? '#f59e0b' : 'transparent',
          }}
        />
      ))}
    </div>
  );

  const renderSlide = (slide: SliderSlide) => {
    const slideType: SliderPreset = slide.type || slider.preset;
    const typographyScale = currentResponsive.typographyScale || 1;
    const cardStyle: React.CSSProperties = {
      backgroundColor: slider.styling.cardBackground,
      color: slider.styling.textColor,
      borderRadius: slider.styling.borderRadius,
      boxShadow: slider.styling.shadow ? '0 18px 45px rgba(15, 23, 42, 0.14)' : 'none',
      overflow: 'hidden',
      height: '100%',
      transform: slider.styling.hoverEffect === 'lift' ? undefined : 'translateZ(0)',
    };

    if (slideType === 'banner') {
      return (
        <SliderSlideDropZone block={block} slide={slide} isEditing={isEditing}>
          <div className="relative h-full w-full overflow-hidden" style={cardStyle}>
            {renderMedia(slide, 'background')}
            {slider.styling.overlay && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: slider.styling.overlayColor,
                  opacity: slider.styling.overlayOpacity / 100,
                }}
              />
            )}
            <div className="relative z-10 flex h-full max-w-3xl flex-col justify-center gap-4 p-8 text-white sm:p-12">
              <EditableText
                value={slide.content.subtitle || ''}
                isEditing={isEditing}
                as="span"
                className="text-sm font-semibold uppercase"
                style={{ color: slider.styling.accentColor }}
                onChange={(subtitle) => updateSlide(slide.id, { subtitle })}
              />
              <EditableText
                value={slide.content.title}
                isEditing={isEditing}
                as="h2"
                className="font-bold leading-tight"
                style={{ fontSize: `${42 * typographyScale}px` }}
                onChange={(title) => updateSlide(slide.id, { title })}
              />
              <EditableText
                value={slide.content.description}
                isEditing={isEditing}
                as="p"
                className="max-w-xl text-base leading-7 text-white/90"
                onChange={(description) => updateSlide(slide.id, { description })}
              />
              <div>{renderButton(slide, true)}</div>
            </div>
          </div>
        </SliderSlideDropZone>
      );
    }

    if (slideType === 'product') {
      return (
        <SliderSlideDropZone block={block} slide={slide} isEditing={isEditing}>
          <article className="flex h-full flex-col" style={cardStyle}>
            <div className="relative h-52 overflow-hidden">
              {slide.content.badge && (
                <span
                  className="absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: slider.styling.accentColor }}
                >
                  {slide.content.badge}
                </span>
              )}
              {renderMedia(slide)}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              {renderRating(slide.content.rating)}
              <EditableText
                value={slide.content.title}
                isEditing={isEditing}
                as="h2"
                className="text-xl font-semibold"
                onChange={(title) => updateSlide(slide.id, { title })}
              />
              <EditableText
                value={slide.content.description}
                isEditing={isEditing}
                as="p"
                className="text-sm leading-6 text-slate-600"
                onChange={(description) => updateSlide(slide.id, { description })}
              />
              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <EditableText
                    value={slide.content.discountPrice || ''}
                    isEditing={isEditing}
                    as="span"
                    className="text-lg font-bold"
                    onChange={(discountPrice) => updateSlide(slide.id, { discountPrice })}
                  />
                  <EditableText
                    value={slide.content.price || ''}
                    isEditing={isEditing}
                    as="span"
                    className="text-sm text-slate-500 line-through"
                    onChange={(price) => updateSlide(slide.id, { price })}
                  />
                </div>
                {renderButton(slide)}
              </div>
            </div>
          </article>
        </SliderSlideDropZone>
      );
    }

    if (slideType === 'testimonial') {
      return (
        <SliderSlideDropZone block={block} slide={slide} isEditing={isEditing}>
          <article className="flex h-full flex-col justify-between gap-5 p-7" style={cardStyle}>
            {renderRating(slide.content.rating)}
            <EditableText
              value={slide.content.description}
              isEditing={isEditing}
              as="p"
              className="text-lg leading-8"
              onChange={(description) => updateSlide(slide.id, { description })}
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={(event) => changeImage(slide, event)}
                className="h-14 w-14 overflow-hidden rounded-full bg-slate-100"
              >
                {slide.content.image ? (
                  <img
                    src={slide.content.image}
                    alt={slide.content.customerName || slide.content.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </button>
              {renderImageUploadInput(slide)}
              <div>
                <EditableText
                  value={slide.content.customerName || slide.content.title}
                  isEditing={isEditing}
                  as="div"
                  className="font-semibold"
                  onChange={(customerName) => updateSlide(slide.id, { customerName })}
                />
                <EditableText
                  value={slide.content.company || ''}
                  isEditing={isEditing}
                  as="div"
                  className="text-sm text-slate-500"
                  onChange={(company) => updateSlide(slide.id, { company })}
                />
              </div>
            </div>
          </article>
        </SliderSlideDropZone>
      );
    }

    if (slideType === 'custom' && slide.content.blocks?.length) {
      return (
        <SliderSlideDropZone block={block} slide={slide} isEditing={isEditing}>
          <div className="h-full overflow-auto p-5" style={cardStyle}>
            {slide.content.blocks.map((child) => (
              <RenderBlock key={child.uniqueId} block={child} isEditing={isEditing} />
            ))}
          </div>
        </SliderSlideDropZone>
      );
    }

    return (
      <SliderSlideDropZone block={block} slide={slide} isEditing={isEditing}>
        <article
          className={`flex h-full flex-col transition ${
            slider.styling.hoverEffect === 'lift' ? 'hover:-translate-y-1' : ''
          }`}
          style={cardStyle}
        >
          <div className="h-48 overflow-hidden">{renderMedia(slide)}</div>
          <div className="flex flex-1 flex-col gap-3 p-5">
            <EditableText
              value={slide.content.title}
              isEditing={isEditing}
              as="h2"
              className="text-xl font-semibold"
              onChange={(title) => updateSlide(slide.id, { title })}
            />
            <EditableText
              value={slide.content.description}
              isEditing={isEditing}
              as="p"
              className="text-sm leading-6 text-slate-600"
              onChange={(description) => updateSlide(slide.id, { description })}
            />
            <div className="mt-auto">{renderButton(slide)}</div>
          </div>
        </article>
      </SliderSlideDropZone>
    );
  };

  const renderTrack = () => {
    if (slides.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500">
          <p className="text-sm font-medium">Add your first slide</p>
          {isEditing && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                addFirstSlide();
              }}
              className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Slide
            </button>
          )}
        </div>
      );
    }

    if (slider.transition !== 'slide') {
      return (
        <div
          className={`h-full transition-all ${
            slider.transition === 'fade'
              ? 'animate-in fade-in'
              : slider.transition === 'scale'
                ? 'animate-in zoom-in'
                : 'animate-in spin-in-6'
          }`}
          style={{ transitionDuration: `${slider.speed}ms`, transform: 'translateZ(0)' }}
          key={activeSlide.id}
        >
          {renderSlide(activeSlide)}
        </div>
      );
    }

    const translate = (activeIndex * 100) / slidesPerView;
    return (
      <div className="h-full overflow-hidden">
        <div
          className="flex h-full will-change-transform"
          style={{
            gap,
            transform: `translate3d(-${translate}%, 0, 0)`,
            transition: `transform ${slider.speed}ms ease`,
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="h-full min-w-0 shrink-0"
              style={{
                flexBasis: `calc((100% - ${gap * (slidesPerView - 1)}px) / ${slidesPerView})`,
              }}
              aria-hidden={index < activeIndex || index >= activeIndex + slidesPerView}
            >
              {renderSlide(slide)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={block.label || 'Slider'}
      tabIndex={0}
      onClick={selectSlider}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') previous();
        if (event.key === 'ArrowRight') next();
      }}
      onTouchStart={(event) => {
        if (!slider.navigation.swipe) return;
        setTouchStart(event.touches[0]?.clientX ?? null);
      }}
      onTouchEnd={(event) => {
        if (!slider.navigation.swipe || touchStart === null) return;
        const distance = touchStart - (event.changedTouches[0]?.clientX ?? touchStart);
        if (Math.abs(distance) > 35) {
          if (distance > 0) next();
          else previous();
        }
        setTouchStart(null);
      }}
      className="group relative overflow-hidden"
      style={{
        width: slider.layout.width,
        maxWidth: slider.layout.maxWidth,
        minHeight: height,
        height: slider.layout.height || height,
        padding: slider.layout.padding,
        margin: slider.layout.margin,
        backgroundColor: slider.styling.backgroundColor,
        borderRadius: slider.styling.borderRadius,
        ...block.style,
      }}
    >
      {isEditing && (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground opacity-0 transition group-hover:opacity-100">
          Slider
        </div>
      )}

      <div className="h-full" style={{ minHeight: height }}>
        {renderTrack()}
      </div>

      {slider.navigation.arrows && slides.length > slidesPerView && (
        <>
          <button
            type="button"
            onClick={previous}
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white focus:outline-none focus:ring-2"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white focus:outline-none focus:ring-2"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {slider.navigation.dots && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              onClick={(event) => {
                event.stopPropagation();
                goTo(index);
              }}
              className="h-2.5 rounded-full transition-all focus:outline-none focus:ring-2"
              style={{
                width: index === activeIndex ? 24 : 10,
                backgroundColor:
                  index === activeIndex ? slider.styling.accentColor : 'rgba(255,255,255,0.72)',
              }}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex}
            />
          ))}
        </div>
      )}

      {isEditing && slider.dataBinding.enabled && (
        <div className="absolute right-3 top-3 z-20 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 shadow">
          CMS: {slider.dataBinding.collection}
        </div>
      )}
    </section>
  );
};
