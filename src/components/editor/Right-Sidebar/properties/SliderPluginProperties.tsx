import React from 'react';
<<<<<<< HEAD
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createSliderSlide,
  normalizeSliderContent,
  type SliderContent,
  type SliderPreset,
  type SliderSlide,
} from '@/components/plugins/sliderSchema';

interface SliderPluginPropertiesProps {
  content: Record<string, unknown>;
=======
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SliderContent extends Record<string, unknown> {
  accentColor?: string;
  slidesToShow?: number;
  slides?: unknown[];
}

interface SliderPluginPropertiesProps {
  content: SliderContent;
>>>>>>> khadija
  handleJsonContentChange: <T extends Record<string, unknown>>(
    content: T,
    key: keyof T,
    value: unknown
  ) => void;
}

<<<<<<< HEAD
const presets: { value: SliderPreset; label: string }[] = [
  { value: 'banner', label: 'Banner Slider' },
  { value: 'card', label: 'Card Slider' },
  { value: 'product', label: 'Product Slider' },
  { value: 'testimonial', label: 'Testimonial Slider' },
  { value: 'custom', label: 'Custom Slider' },
];

const sectionClass = 'space-y-3 rounded-md border bg-background p-3 shadow-sm';
const labelClass = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

=======
>>>>>>> khadija
export const SliderPluginProperties: React.FC<SliderPluginPropertiesProps> = ({
  content,
  handleJsonContentChange,
}) => {
<<<<<<< HEAD
  const slider = normalizeSliderContent(content);
  const [expandedSlideId, setExpandedSlideId] = React.useState(slider.slides[0]?.id || '');

  const update = <K extends keyof SliderContent>(key: K, value: SliderContent[K]) => {
    handleJsonContentChange(slider, key, value);
  };

  const updateLayout = (key: keyof SliderContent['layout'], value: string) => {
    update('layout', { ...slider.layout, [key]: value });
  };

  const updateNavigation = (key: keyof SliderContent['navigation'], value: boolean) => {
    update('navigation', { ...slider.navigation, [key]: value });
  };

  const updateStyling = <K extends keyof SliderContent['styling']>(
    key: K,
    value: SliderContent['styling'][K]
  ) => {
    update('styling', { ...slider.styling, [key]: value });
  };

  const updateSlide = (slideId: string, patch: Partial<SliderSlide>) => {
    update(
      'slides',
      slider.slides.map((slide) =>
        slide.id === slideId
          ? {
              ...slide,
              ...patch,
              content: { ...slide.content, ...(patch.content || {}) },
            }
          : slide
      )
    );
  };

  const addSlide = () => {
    const nextSlide = createSliderSlide(slider.preset, slider.slides.length + 1);
    update('slides', [...slider.slides, nextSlide]);
    setExpandedSlideId(nextSlide.id);
  };

  const duplicateSlide = (slide: SliderSlide) => {
    const duplicated = {
      ...slide,
      id: `slide_${Math.random().toString(36).slice(2, 9)}`,
      name: `${slide.name} Copy`,
      content: { ...slide.content },
    };
    update('slides', [...slider.slides, duplicated]);
    setExpandedSlideId(duplicated.id);
  };

  const deleteSlide = (slideId: string) => {
    update(
      'slides',
      slider.slides.filter((slide) => slide.id !== slideId)
    );
  };

  const moveSlide = (slideId: string, direction: -1 | 1) => {
    const index = slider.slides.findIndex((slide) => slide.id === slideId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= slider.slides.length) return;

    const nextSlides = [...slider.slides];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(nextIndex, 0, moved);
    update('slides', nextSlides);
  };

  const renderColorInput = (
    label: string,
    value: string,
    onChange: (value: string) => void
  ) => (
    <div className="space-y-1">
      <Label className={labelClass}>{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border"
        />
        <Input
          className="h-8 text-xs font-mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );

  const renderSlideFields = (slide: SliderSlide) => (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className={labelClass}>Name</Label>
          <Input
            className="h-8 text-xs"
            value={slide.name}
            onChange={(event) => updateSlide(slide.id, { name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Type</Label>
          <select
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            value={slide.type}
            onChange={(event) =>
              updateSlide(slide.id, { type: event.target.value as SliderPreset })
            }
          >
            {presets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>Image URL</Label>
        <Input
          className="h-8 text-xs"
          value={slide.content.image}
          onChange={(event) =>
            updateSlide(slide.id, { content: { ...slide.content, image: event.target.value } })
          }
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1">
        <Label className={labelClass}>
          {slide.type === 'testimonial' ? 'Review headline' : 'Title'}
        </Label>
        <Input
          className="h-8 text-xs"
          value={slide.content.title}
          onChange={(event) =>
            updateSlide(slide.id, { content: { ...slide.content, title: event.target.value } })
          }
        />
      </div>

      {slide.type === 'banner' && (
        <div className="space-y-1">
          <Label className={labelClass}>Subtitle</Label>
          <Input
            className="h-8 text-xs"
            value={slide.content.subtitle || ''}
            onChange={(event) =>
              updateSlide(slide.id, {
                content: { ...slide.content, subtitle: event.target.value },
              })
            }
          />
        </div>
      )}

      <div className="space-y-1">
        <Label className={labelClass}>
          {slide.type === 'testimonial' ? 'Review text' : 'Description'}
        </Label>
        <textarea
          className="min-h-20 w-full rounded-md border bg-background px-2 py-2 text-xs"
          value={slide.content.description}
          onChange={(event) =>
            updateSlide(slide.id, {
              content: { ...slide.content, description: event.target.value },
            })
          }
        />
      </div>

      {slide.type !== 'testimonial' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className={labelClass}>Button Text</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.buttonText}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, buttonText: event.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Button URL</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.buttonUrl}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, buttonUrl: event.target.value },
                })
              }
            />
          </div>
        </div>
      )}

      {slide.type === 'product' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className={labelClass}>Price</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.price || ''}
              onChange={(event) =>
                updateSlide(slide.id, { content: { ...slide.content, price: event.target.value } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Discount</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.discountPrice || ''}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, discountPrice: event.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Badge</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.badge || ''}
              onChange={(event) =>
                updateSlide(slide.id, { content: { ...slide.content, badge: event.target.value } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Rating</Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              className="h-8 text-xs"
              value={slide.content.rating || 5}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, rating: toNumber(event.target.value, 5) },
                })
              }
            />
          </div>
        </div>
      )}

      {slide.type === 'testimonial' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className={labelClass}>Customer</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.customerName || ''}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, customerName: event.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Company</Label>
            <Input
              className="h-8 text-xs"
              value={slide.content.company || ''}
              onChange={(event) =>
                updateSlide(slide.id, {
                  content: { ...slide.content, company: event.target.value },
                })
              }
            />
          </div>
        </div>
      )}

      {slide.type === 'custom' && (
        <p className="rounded-md bg-muted px-2 py-2 text-[11px] text-muted-foreground">
          Custom slides can render nested blocks. Drag blocks into the slide on the canvas.
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={sectionClass}>
        <Label className={labelClass}>Preset</Label>
        <select
          className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          value={slider.preset}
          onChange={(event) => update('preset', event.target.value as SliderPreset)}
        >
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>Layout</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['width', 'height', 'maxWidth', 'padding', 'margin'] as const).map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-[9px] capitalize">{key}</Label>
              <Input
                className="h-8 text-xs"
                value={slider.layout[key]}
                onChange={(event) => updateLayout(key, event.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-[9px]">Alignment</Label>
            <select
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={slider.layout.alignment}
              onChange={(event) => updateLayout('alignment', event.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>Navigation</Label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(['arrows', 'dots', 'swipe', 'infinite'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 capitalize">
              <input
                type="checkbox"
                checked={slider.navigation[key]}
                onChange={(event) => updateNavigation(key, event.target.checked)}
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>Behavior</Label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={slider.autoplay}
              onChange={(event) => update('autoplay', event.target.checked)}
            />
            Autoplay
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={slider.pauseOnHover}
              onChange={(event) => update('pauseOnHover', event.target.checked)}
            />
            Pause hover
          </label>
          <div className="space-y-1">
            <Label className="text-[9px]">Delay ms</Label>
            <Input
              type="number"
              min={500}
              className="h-8 text-xs"
              value={slider.interval}
              onChange={(event) => update('interval', toNumber(event.target.value, 3000))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px]">Speed ms</Label>
            <Input
              type="number"
              min={100}
              className="h-8 text-xs"
              value={slider.speed}
              onChange={(event) => update('speed', toNumber(event.target.value, 500))}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[9px]">Transition</Label>
            <select
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={slider.transition}
              onChange={(event) =>
                update('transition', event.target.value as SliderContent['transition'])
              }
            >
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
              <option value="scale">Scale</option>
              <option value="flip">Flip</option>
            </select>
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>Responsive</Label>
        <div className="space-y-3">
          {(['desktop', 'tablet', 'mobile'] as const).map((breakpoint) => (
            <div key={breakpoint} className="rounded-md border p-2">
              <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                {breakpoint}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['slidesPerView', 'gap', 'height', 'typographyScale'] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[9px]">{key}</Label>
                    <Input
                      type="number"
                      step={key === 'typographyScale' ? 0.05 : 1}
                      min={key === 'slidesPerView' ? 1 : 0}
                      className="h-8 text-xs"
                      value={slider.responsive[breakpoint][key]}
                      onChange={(event) =>
                        update('responsive', {
                          ...slider.responsive,
                          [breakpoint]: {
                            ...slider.responsive[breakpoint],
                            [key]: toNumber(event.target.value, slider.responsive[breakpoint][key]),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>Styling</Label>
        <div className="grid grid-cols-2 gap-2">
          {renderColorInput('Accent', slider.styling.accentColor, (value) =>
            updateStyling('accentColor', value)
          )}
          {renderColorInput('Background', slider.styling.backgroundColor, (value) =>
            updateStyling('backgroundColor', value)
          )}
          {renderColorInput('Text', slider.styling.textColor, (value) =>
            updateStyling('textColor', value)
          )}
          {renderColorInput('Card', slider.styling.cardBackground, (value) =>
            updateStyling('cardBackground', value)
          )}
          <div className="space-y-1">
            <Label className="text-[9px]">Radius</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              value={slider.styling.borderRadius}
              onChange={(event) => updateStyling('borderRadius', toNumber(event.target.value, 8))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px]">Overlay %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              className="h-8 text-xs"
              value={slider.styling.overlayOpacity}
              onChange={(event) => updateStyling('overlayOpacity', toNumber(event.target.value, 42))}
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={slider.styling.shadow}
              onChange={(event) => updateStyling('shadow', event.target.checked)}
            />
            Shadow
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={slider.styling.overlay}
              onChange={(event) => updateStyling('overlay', event.target.checked)}
            />
            Overlay
          </label>
        </div>
      </div>

      <div className={sectionClass}>
        <Label className={labelClass}>CMS/Data Binding</Label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={slider.dataBinding.enabled}
            onChange={(event) =>
              update('dataBinding', { ...slider.dataBinding, enabled: event.target.checked })
            }
          />
          Connect to collection
        </label>
        <Input
          className="h-8 text-xs"
          value={slider.dataBinding.collection}
          onChange={(event) =>
            update('dataBinding', { ...slider.dataBinding, collection: event.target.value })
          }
          placeholder="products"
        />
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between">
          <Label className={labelClass}>Slides</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addSlide}>
            <Plus className="mr-1 h-3 w-3" />
            Add Slide
          </Button>
        </div>

        {slider.slides.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="mb-2 text-sm text-muted-foreground">Add your first slide</p>
            <Button type="button" size="sm" onClick={addSlide}>
              Create Slide
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {slider.slides.map((slide, index) => {
              const isExpanded = expandedSlideId === slide.id;
              return (
                <div key={slide.id} className="rounded-md border bg-card transition-shadow hover:shadow-md">
                  <div 
                    className={`flex items-center gap-2 p-2 cursor-pointer rounded-t-md transition-colors ${isExpanded ? 'bg-primary/10 border-b' : 'hover:bg-muted'}`}
                    onClick={() => setExpandedSlideId(isExpanded ? '' : slide.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex min-w-0 flex-1 items-center justify-between">
                      <span className="truncate text-xs font-bold text-foreground">
                        {index + 1}. {slide.name || `Slide ${index + 1}`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => moveSlide(slide.id, -1)}
                        className="rounded p-1 hover:bg-background/80"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(slide.id, 1)}
                        className="rounded p-1 hover:bg-background/80"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateSlide(slide)}
                        className="rounded p-1 hover:bg-background/80"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSlide(slide.id)}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-3">
                      {renderSlideFields(slide)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
=======
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Accent Color</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={content.accentColor || '#eab308'}
              onChange={(e) => handleJsonContentChange(content, 'accentColor', e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border"
            />
            <Input
              className="h-7 text-[10px] font-mono"
              value={content.accentColor || '#eab308'}
              onChange={(e) => handleJsonContentChange(content, 'accentColor', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Slides To Show</Label>
          <Input
            type="number"
            min={1}
            max={5}
            className="h-7 text-xs"
            value={content.slidesToShow || 1}
            onChange={(e) =>
              handleJsonContentChange(content, 'slidesToShow', parseInt(e.target.value) || 1)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase">Slides Configuration</Label>
        <Textarea
          className="min-h-[150px] text-[10px] font-mono leading-tight"
          value={JSON.stringify(content.slides || [], null, 2)}
          onChange={(e) => {
            try {
              const slides = JSON.parse(e.target.value);
              handleJsonContentChange(content, 'slides', slides);
            } catch {}
          }}
          placeholder='[ { "title": "Title", "desc": "Description", "image": "..." } ]'
        />
        <p className="text-[9px] text-muted-foreground italic">
          Tip: Add an &quot;image&quot; field to each slide to display pictures.
        </p>
>>>>>>> khadija
      </div>
    </div>
  );
};
