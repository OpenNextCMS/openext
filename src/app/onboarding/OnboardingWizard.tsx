'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  ExternalLink,
  LayoutDashboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  EMPTY_WIZARD_DATA,
  BUSINESS_CATEGORIES,
  WEBSITE_TYPE_OPTIONS,
  HEADER_OPTIONS,
  FOOTER_OPTIONS,
  THEME_OPTIONS,
  type WizardData,
  type WebsiteType,
  type HeaderId,
  type FooterId,
  type WizardThemeId,
} from '@/templates/types';
import { getNavLinks } from '@/templates/pages';
import { SelectableCard } from './components/SelectableCard';
import { HeaderPreview, FooterPreview } from './components/TemplatePreviews';

interface GenerateResult {
  homepageSlug: string;
  pages: { name: string; slug: string }[];
  themeSlug: string;
  alreadyGenerated: boolean;
}

const STEPS = ['Business', 'Type', 'Header', 'Footer', 'Theme', 'Review'] as const;
type Phase = 'wizard' | 'generating' | 'success';

export default function OnboardingWizard({ initialDraft }: { initialDraft?: Partial<WizardData> | null }) {
  const [data, setData] = useState<WizardData>({ ...EMPTY_WIZARD_DATA, ...(initialDraft || {}) });
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('wizard');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const submittingRef = useRef(false);

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ----------------------------- Autosave ----------------------------- */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      fetch('/api/onboarding/draft', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [data]);

  /* --------------------------- Validation ----------------------------- */
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return (
          data.businessName.trim() !== '' &&
          data.businessCategory.trim() !== '' &&
          data.businessDescription.trim() !== ''
        );
      case 1:
        return data.websiteType !== '';
      case 2:
        return data.headerTemplate !== '';
      case 3:
        return data.footerTemplate !== '';
      case 4:
        return data.theme !== '';
      default:
        return true;
    }
  }, [step, data]);

  const next = () => {
    if (!canProceed) {
      toast.error('Please complete this step to continue.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* --------------------------- Generation ----------------------------- */
  const generate = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase('generating');
    try {
      const res = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Generation failed');
      }
      setResult(json.data as GenerateResult);
      setPhase('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('wizard');
      submittingRef.current = false;
    }
  };

  /* ------------------------- Preview helpers -------------------------- */
  const navLinks = useMemo(
    () => getNavLinks((data.websiteType || 'agency') as WebsiteType),
    [data.websiteType]
  );
  const previewName = data.businessName.trim() || 'Your Brand';

  if (phase === 'generating') return <GeneratingScreen name={previewName} />;
  if (phase === 'success' && result) return <SuccessScreen result={result} name={previewName} />;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Progress header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">Set up your website</span>
          <div className="ml-auto hidden items-center gap-1.5 sm:flex">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && <span className="h-px w-5 bg-border" />}
              </div>
            ))}
          </div>
          <span className="ml-auto text-sm text-muted-foreground sm:hidden">
            Step {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Step body */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepBusiness data={data} update={update} />}
            {step === 1 && (
              <StepWebsiteType
                value={data.websiteType}
                onSelect={(v) => update('websiteType', v)}
              />
            )}
            {step === 2 && (
              <StepHeader
                value={data.headerTemplate}
                onSelect={(v) => update('headerTemplate', v)}
                businessName={previewName}
                navLinks={navLinks}
              />
            )}
            {step === 3 && (
              <StepFooter
                value={data.footerTemplate}
                onSelect={(v) => update('footerTemplate', v)}
                businessName={previewName}
                navLinks={navLinks}
              />
            )}
            {step === 4 && (
              <StepTheme value={data.theme} onSelect={(v) => update('theme', v)} />
            )}
            {step === 5 && <StepReview data={data} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" /> Generate Website
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ============================== Steps ============================== */

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

function StepBusiness({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  // A category that isn't one of the presets means the user picked "Other" and
  // typed their own. Derive it so the custom box reappears when resuming a draft
  // or navigating back to this step.
  const isCustomCategory =
    data.businessCategory !== '' &&
    !(BUSINESS_CATEGORIES as readonly string[]).includes(data.businessCategory);
  const [otherSelected, setOtherSelected] = useState(isCustomCategory);

  const handleCategorySelect = (value: string) => {
    if (value === 'Other') {
      setOtherSelected(true);
      // Clear a previously-picked preset so the custom box starts empty.
      if (!isCustomCategory) update('businessCategory', '');
    } else {
      setOtherSelected(false);
      update('businessCategory', value);
    }
  };

  return (
    <div>
      <StepHeading title="Tell us about your business" subtitle="We'll personalize your site with these details." />
      <div className="grid gap-5">
        <Field label="Business Name" required>
          <input
            className={inputCls}
            placeholder="CloudFlow"
            value={data.businessName}
            onChange={(e) => update('businessName', e.target.value)}
          />
        </Field>
        <Field label="Business Category" required>
          <select
            className={inputCls}
            value={otherSelected ? 'Other' : data.businessCategory}
            onChange={(e) => handleCategorySelect(e.target.value)}
          >
            <option value="" disabled>
              Select a category…
            </option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {otherSelected && (
            <input
              className={`${inputCls} mt-2`}
              placeholder="Specify your business category"
              value={data.businessCategory}
              onChange={(e) => update('businessCategory', e.target.value)}
              autoFocus
            />
          )}
        </Field>
        <Field label="Business Description" required>
          <textarea
            className={`${inputCls} min-h-24 resize-y`}
            placeholder="We help small businesses automate workflows using AI."
            value={data.businessDescription}
            onChange={(e) => update('businessDescription', e.target.value)}
          />
        </Field>
        <Field label="Location (optional)">
          <input
            className={inputCls}
            placeholder="Ahmedabad, India"
            value={data.location}
            onChange={(e) => update('location', e.target.value)}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Shown in your footer when you choose a footer that displays your address.
          </span>
        </Field>
      </div>
    </div>
  );
}

function StepWebsiteType({
  value,
  onSelect,
}: {
  value: WizardData['websiteType'];
  onSelect: (v: WebsiteType) => void;
}) {
  return (
    <div>
      <StepHeading title="What type of website would you like to create?" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WEBSITE_TYPE_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={value === opt.id}
            onSelect={() => onSelect(opt.id)}
            title={opt.label}
            description={opt.description}
          >
            <img
              src={opt.preview}
              alt={opt.label}
              className="h-28 w-full rounded-lg object-cover"
              loading="lazy"
            />
          </SelectableCard>
        ))}
      </div>
    </div>
  );
}

function StepHeader({
  value,
  onSelect,
  businessName,
  navLinks,
}: {
  value: WizardData['headerTemplate'];
  onSelect: (v: HeaderId) => void;
  businessName: string;
  navLinks: { label: string; href: string }[];
}) {
  return (
    <div>
      <StepHeading title="Choose a header style" subtitle="Live preview of each option." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {HEADER_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={value === opt.id}
            onSelect={() => onSelect(opt.id)}
            title={opt.label}
            description={opt.description}
          >
            <HeaderPreview id={opt.id} businessName={businessName} links={navLinks} />
          </SelectableCard>
        ))}
      </div>
    </div>
  );
}

function StepFooter({
  value,
  onSelect,
  businessName,
  navLinks,
}: {
  value: WizardData['footerTemplate'];
  onSelect: (v: FooterId) => void;
  businessName: string;
  navLinks: { label: string; href: string }[];
}) {
  return (
    <div>
      <StepHeading title="Choose a footer style" subtitle="Live preview of each option." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {FOOTER_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={value === opt.id}
            onSelect={() => onSelect(opt.id)}
            title={opt.label}
            description={opt.description}
          >
            <FooterPreview id={opt.id} businessName={businessName} links={navLinks} />
          </SelectableCard>
        ))}
      </div>
    </div>
  );
}

function StepTheme({
  value,
  onSelect,
}: {
  value: WizardData['theme'];
  onSelect: (v: WizardThemeId) => void;
}) {
  return (
    <div>
      <StepHeading title="Choose your design style" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={value === opt.id}
            onSelect={() => onSelect(opt.id)}
            title={opt.label}
          >
            <div
              className="rounded-lg p-4"
              style={{ background: opt.colors.background, border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <div
                className="mb-3 text-sm font-bold"
                style={{ color: opt.colors.text, fontFamily: opt.fontFamily }}
              >
                Aa Heading
              </div>
              <div className="mb-3 flex gap-1.5">
                {[opt.colors.primary, opt.colors.secondary, opt.colors.text].map((c, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-full"
                    style={{ background: c, border: '1px solid rgba(0,0,0,0.1)' }}
                  />
                ))}
              </div>
              <span
                className="inline-block px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: opt.colors.primary, borderRadius: opt.radius }}
              >
                Button
              </span>
            </div>
          </SelectableCard>
        ))}
      </div>
    </div>
  );
}

function StepReview({ data }: { data: WizardData }) {
  const rows: [string, string][] = [
    ['Business Name', data.businessName],
    ['Business Category', data.businessCategory],
    ['Website Type', label(WEBSITE_TYPE_OPTIONS, data.websiteType)],
    ['Header Style', label(HEADER_OPTIONS, data.headerTemplate)],
    ['Footer Style', label(FOOTER_OPTIONS, data.footerTemplate)],
    ['Theme', label(THEME_OPTIONS, data.theme)],
  ];
  return (
    <div>
      <StepHeading title="Review & generate" subtitle="We'll build a complete, editable website from these choices." />
      <div className="overflow-hidden rounded-xl border border-border">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-center justify-between px-5 py-3.5 ${i % 2 ? 'bg-muted/40' : 'bg-card'}`}
          >
            <span className="text-sm text-muted-foreground">{k}</span>
            <span className="text-sm font-medium">{v || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function label(opts: { id: string; label: string }[], id: string): string {
  return opts.find((o) => o.id === id)?.label ?? id;
}

/* ========================= Generating / Success ========================= */

function GeneratingScreen({ name }: { name: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h1 className="text-2xl font-bold">Building {name}&apos;s website…</h1>
      <p className="max-w-md text-muted-foreground">
        Assembling pages, applying your theme, and personalizing content. This takes just a moment.
      </p>
    </div>
  );
}

function SuccessScreen({ result, name }: { result: GenerateResult; name: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Your website has been created!</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          {name}&apos;s site is ready with {result.pages.length} pages. Everything is fully editable in the
          visual editor.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="/default_home"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" /> View Website
        </a>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
