<!--
FORMATTING NOTE (apply when exporting this Markdown to Word/PDF for book-binding):
  • Page size A4, printed on one side only.
  • Left margin 1.25 in; Right / Top / Bottom margins 1 in.
  • Line spacing 1.5; body text Times New Roman 12 pt.
  • Insert real page numbers and update the Index accordingly.
PLACEHOLDERS: text in [square brackets] must be filled in before submission.
-->

# 1. Title Page

<div align="center">

&nbsp;

&nbsp;

# OpenNext CMS
## A Multi-Tenant, Block-Based Content Management System

&nbsp;

**A Project Report submitted in partial fulfillment of the requirements for the award of the degree of**

**[Degree — e.g. Master of Computer Applications (MCA)]**

&nbsp;

**Developed for**
**Aviral Trendz Private Limited**

&nbsp;

**Submitted by**
**Khadija Mama**
Enrollment No.: **[Enrollment / Student ID]**

&nbsp;

**Under the guidance of**
Internal Guide: **[Guide Name]** &nbsp;|&nbsp; External Guide: **[Company Guide Name]**

&nbsp;

**[Department Name]**
**[College / University Name]**

**Year: 2025–2026**

</div>

<div style="page-break-after: always;"></div>

---

# 2. Certificates

## 2.1 Department Certificate

> This is to certify that the project entitled **"OpenNext CMS — A Multi-Tenant, Block-Based Content Management System"** is a bonafide record of the project work carried out by **Khadija Mama** (Enrollment No. **[Enrollment / Student ID]**) in partial fulfillment of the requirements for the award of the degree of **[Degree]** at **[College / University Name]** during the academic year **2025–2026**.
>
> &nbsp;
>
> **[Internal Guide]** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **[Head of Department]** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **[Examiner]**
> Internal Guide &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Head of Department &nbsp;&nbsp;&nbsp;&nbsp; Examiner
>
> Date: **[  ]** &nbsp;&nbsp; Place: **[  ]**

## 2.2 Company Certificate

> This is to certify that **Khadija Mama** has successfully completed the project **"OpenNext CMS"** as part of the internship/training program at **Aviral Trendz Private Limited** during the period **[Start Date] – [End Date]**. During this period the candidate worked on the design and development of the content-management platform described in this report and displayed [good/excellent] conduct and technical ability.
>
> &nbsp;
>
> **[Authorized Signatory]**
> [Designation], Aviral Trendz Private Limited
> Date: **[  ]** &nbsp;&nbsp; Place: **[  ]** &nbsp;&nbsp; (Company Seal)

## 2.3 No-Code Certificate *(include only if source code disclosure is restricted)*

> This is to certify that the source code of the project **"OpenNext CMS"** developed at **Aviral Trendz Private Limited** is the intellectual property of the organization and, as per company policy, is **not permitted to be reproduced** in this report. The design artifacts, screenshots and representative (illustrative) code excerpts included herein are shared with the organization's consent for academic evaluation only.
>
> &nbsp;
>
> **[Authorized Signatory]** — [Designation], Aviral Trendz Private Limited

<div style="page-break-after: always;"></div>

---

# 3. Acknowledgement

I take this opportunity to express my sincere gratitude to everyone who supported me throughout this project.

I am deeply thankful to **Aviral Trendz Private Limited** for providing me the opportunity to work on a real-world product and for the resources and environment that made this project possible. I especially thank my external guide **[Company Guide Name]** for the technical mentorship, code reviews and continuous guidance.

I am grateful to my internal guide **[Guide Name]** and to **[Head of Department]**, **[Department Name]**, **[College / University Name]**, for their academic guidance, encouragement and valuable feedback at every stage.

Finally, I thank my family and friends for their constant support and motivation.

**Khadija Mama**

<div style="page-break-after: always;"></div>

---

# 4. Index

| No. | Section | Page |
|----:|---------|-----:|
| 1 | Title Page | [ ] |
| 2 | Certificates | [ ] |
| 3 | Acknowledgement | [ ] |
| 4 | Index | [ ] |
| 5 | About the Organization | [ ] |
| 6 | About the Project | [ ] |
| 7 | Project — OpenNext CMS | [ ] |
| 7.1 | System Engineering | [ ] |
| 7.2 | System Design | [ ] |
| 7.3 | System Testing | [ ] |
| 7.4 | Sample Coding | [ ] |
| 7.5 | Future Enhancements | [ ] |
| 7.6 | Bibliography | [ ] |
| 8 | Extra Work | [ ] |

*(Assign page numbers after final pagination.)*

<div style="page-break-after: always;"></div>

---

# 5. About the Organization

**Aviral Trendz Private Limited** is a **[software development / IT services / product]** company based in **[City, Country]**, engaged in building web and mobile applications, content platforms and custom software solutions for its clients. The organization works with a modern technology stack — including the JavaScript/TypeScript ecosystem, React and Next.js on the front end and Node.js with MongoDB on the back end — and follows agile development practices.

During my internship at **Aviral Trendz Private Limited**, I was part of the product engineering team responsible for building **OpenNext CMS**, an in-house content-management platform intended to let the company and its clients build and manage websites without writing code. The team exposed me to the complete development lifecycle — requirement analysis, system design, implementation, testing and documentation — under the mentorship of experienced engineers.

*(Replace the above with the organization's actual profile — history, products/services, size, and the team you worked with. Keep to within one page.)*

<div style="page-break-after: always;"></div>

---

# 6. About the Project (Synopsis)

**OpenNext CMS** is a **multi-tenant, block-based Content Management System (CMS)** that enables non-technical users to build, publish and manage complete websites — pages, blogs, forms, themes and reports — from a single administrative dashboard. It is built as a modern **Next.js 15 (App Router) + React 19** application backed by **MongoDB (Mongoose)**, with **Redux Toolkit** for editor state, **JWT** authentication, and an **OpenRouter-based AI** assistant.

**The problem.** Traditional CMS platforms are either too rigid (fixed templates) or too technical (require coding/plugins knowledge). Small businesses need a way to create good-looking, functional sites — with blogs, contact forms and analytics — quickly and without a developer.

**The solution.** OpenNext CMS provides:

- A **drag-and-drop page/block editor** that composes pages from a tree of reusable content blocks.
- A **blog engine** with authors, categories, tags, SEO, scheduling and comment moderation.
- A **drag-and-drop form builder** (a plugin) with validation, conditional logic, multi-step forms, spam protection, webhooks, email notifications, submissions and analytics.
- **Themes and layouts** (design tokens) with a visual theme builder.
- A **plugin system** (built-in / uploaded / marketplace) that currently ships the **Form Builder** and **Menu Redirect** plugins.
- An **AI onboarding wizard** that generates a starter website from a short business profile, plus AI-assisted form generation.
- **Analytics & reports** for blogs, forms and menu redirects, rendered with charts.

**Multi-tenancy** is achieved by **physical database separation** — the system maintains three logical databases (Master, User, Page) rather than a shared `tenantId` column — providing strong data isolation between tenants.

**Scope of my work** covered system design and documentation, database and API design understanding, the content and form modules, and the preparation of the full set of design diagrams (ER, class, sequence, activity, state, DFD, use-case and component) and a dark-mode screenshot walkthrough of every screen.

*(The complete design is documented in [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md); a plain-English tour is in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md); rendered diagrams are in [`diagrams/`](./diagrams/README.md); screenshots are in [`screenshots/`](./screenshots/README.md).)*

<div style="page-break-after: always;"></div>

---

# 7. Project — OpenNext CMS

## 7.1 System Engineering

### 7.1.1 System Overview

OpenNext CMS is a server-rendered web application. The browser hosts the **admin dashboard**, the **public site**, and two rich editors (the **block/page editor** and the **form builder**), all built with React 19 and Tailwind CSS. Requests pass through Next.js **middleware** (a cookie gate) into the **API layer** (~100+ route handlers), which delegates to **domain services** and, finally, to **Mongoose models** connected to three MongoDB databases. External integrations include **OpenRouter** (AI), **SMTP/email**, **third-party webhooks** and **Cloudflare Turnstile** (spam protection).

*Level-0 Data-Flow (Context) diagram — the whole system as one process:*

![DFD Level 0 — Context](./diagrams/17-5-1-level-0-context-diagram.png)

### 7.1.2 Proposed System

#### a. Objectives

1. Let non-technical users build and manage complete websites without coding.
2. Provide a block-based page editor and a drag-and-drop form builder.
3. Support multiple tenants with strong data isolation (separate physical databases).
4. Offer a role-based admin (SuperAdmin, Admin, Editor, Author).
5. Provide built-in blogging, SEO, comments and analytics/reporting.
6. Be extensible through a plugin architecture.
7. Accelerate site creation with AI (onboarding site generation, form generation).
8. Deliver a fast, responsive, accessible UI with light/dark themes.

#### b. Hardware & Software Platforms

**Development environment**

| Component | Requirement |
|---|---|
| OS | Windows 10/11, macOS, or Linux |
| Runtime | Node.js 18 LTS or newer (developed on Node 20/22) |
| Package manager | npm |
| Database | MongoDB 6+ (MongoDB Atlas cluster or local `mongod`) |
| Editor/IDE | VS Code (or equivalent) |
| Browser | Latest Chrome / Edge / Firefox / Safari |
| RAM / CPU | 8 GB RAM, dual-core CPU (minimum); 16 GB recommended |
| Disk | ~2 GB free (project + `node_modules`) |

**Minimum requirements to run the deployed system**

| Component | Requirement |
|---|---|
| Server runtime | Node.js 18+ host (e.g. Vercel, or any Node server) |
| Database | MongoDB 6+ (reachable via `MONGODB_URI`) |
| Server RAM | 1 GB minimum (2 GB+ recommended) |
| Client | Any modern browser on desktop/tablet/mobile; JavaScript enabled |
| Network | HTTPS; outbound access to OpenRouter/SMTP if AI/email are used |

**Software stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 3, Radix UI, Redux Toolkit + redux-persist, `@dnd-kit`, Mongoose 8, `jsonwebtoken`/`jwt-decode`, `bcryptjs`, Zod, Recharts, Framer Motion, OpenRouter API.

#### c. Analysis Diagrams (DFD / ER / UML)

*Level-1 DFD — the system decomposed into its major processes and data stores:*

![DFD Level 1 — Major processes](./diagrams/18-5-2-level-1-major-processes.png)

*Entity–Relationship diagram (analysis of the persistent data):*

![Entity–Relationship diagram](./diagrams/02-1-2-entity-relationship-diagram.png)

*Use-case diagram (actors vs. system functions):*

![Use-case diagram](./diagrams/20-6-1-use-case-diagram.png)

<div style="page-break-after: always;"></div>

## 7.2 System Design

### 7.2.1 Database Design

Tenancy is implemented as **physical database separation**. `src/utils/db.ts` maintains three lazily-cached Mongoose connections and registers each schema on the correct connection.

| Database | Purpose | Collections |
|---|---|---|
| **Master** | Bootstrap registry of DB names + URIs | `MasterDb` |
| **User DB** (`USER_DB_NAME`) | Identity & configuration | `User`, `Role`, `Settings`, `Plugin` |
| **Page DB** (`PAGE_DB_NAME`) | Content & tenant data | `Page`, `BlogPost`, `Author`, `Category`, `Tag`, `Comment`, `AnalyticsEvent`, `Layout`, `Theme`, `ThemeSettings`, `WebsitePreferences`, `Form`, `FormSubmission`, `FormVersion`, `MenuRedirectMapping`, `MenuRedirectAnalytics`, `MenuRedirectHistory` |

*Tenancy model (three physical databases):*

![Tenancy model](./diagrams/01-1-1-tenancy-model-3-physical-databases.png)

*Detailed Entity–Relationship diagram (all collections & attributes):* see §7.1.2(c) above and [`SYSTEM_DESIGN.md §1.2`](./SYSTEM_DESIGN.md).

*Embedded document structures (sub-schemas stored inline, e.g. inside `Form`):*

![Embedded document structures](./diagrams/03-1-3-embedded-document-structures.png)

### 7.2.2 Architecture Design (Structure & UML)

*System / structure chart — layered view from browser to database:*

![System / structure chart](./diagrams/04-2-1-system-structure-chart.png)

*Component diagram — deployable units and their interfaces:*

![Component diagram](./diagrams/21-6-2-component-diagram.png)

*Class diagram (domain & service layer):*

![Class diagram](./diagrams/05-2-2-class-diagram-domain-service-layer.png)

*Sequence diagram — public form submission (with webhook, email & spam guard):*

![Sequence — form submission](./diagrams/07-2-3-2-public-form-submission-with-webhook-email-spam-guard.png)

*Activity diagram — AI-assisted onboarding (starter-site generation):*

![Activity — AI onboarding](./diagrams/09-2-4-1-ai-assisted-onboarding-starter-site-generation.png)

*State-transition diagram — BlogPost status lifecycle:*

![State — BlogPost status](./diagrams/11-2-5-1-blogpost-status.png)

> Additional sequence diagrams (admin login, blog analytics), activity diagrams (blog lifecycle) and state diagrams (Form status, comment moderation, webhook delivery) are in [`SYSTEM_DESIGN.md §2`](./SYSTEM_DESIGN.md).

### 7.2.3 Forms Design

The application's forms fall into two categories:

1. **Admin/input forms** — login, blog editor, form builder, settings, theme builder, etc.
2. **End-user (rendered) forms** — public forms produced by the Form Builder and served at `/forms/[slug]`.

The **Form Builder** is a three-pane drag-and-drop designer (field library · canvas · properties panel) whose output is a `Form` document.

*Form Builder (design-time) — field palette, canvas and properties panel:*

![Form Builder — edit](./screenshots/40-plugins-form-builder-edit-dark.png)

*Create-a-form screen (templates + AI generation):*

![Create a form](./screenshots/39-plugins-form-builder-new-dark.png)

*Blog post editor form (block content + SEO + metadata):*

![Blog editor](./screenshots/25-blogs-blog-edit-dark.png)

*Public rendered form (`/forms/[slug]`):*

![Public form](./screenshots/12-public-public-form-dark.png)

The forms-design data flow (design time → run time) and the full field-type catalogue are documented in [`SYSTEM_DESIGN.md §3`](./SYSTEM_DESIGN.md). A screenshot of **every** admin and public form is available in [`screenshots/`](./screenshots/README.md).

### 7.2.4 Reports Design

Three report/analytics surfaces are provided, all rendered with Recharts:

| Report | Source | Visuals |
|---|---|---|
| **Blog Analytics** (`/dashboard/analytics`) | `AnalyticsEvent` aggregation | Stat cards (views, unique visitors, avg read time), area chart (views/day), bar charts (popular posts, categories), search-query list |
| **Form Analytics** (`…/form-builder/[id]/analytics`) | `Form.analytics` + submissions | Stat cards (views, starts, completions, conversion %), timeline area, field drop-off bar |
| **Menu-Redirect Analytics** (`…/menu-redirect/analytics`) | `MenuRedirectAnalytics` | Total clicks stat, clicks-by-link bar, ranked list |

*Report data flow:*

![Report data flow](./diagrams/16-4-4-report-data-flow.png)

*Blog Analytics dashboard (report output):*

![Analytics dashboard](./screenshots/19-dashboard-analytics-dark.png)

*Form Analytics — conversion funnel & drop-off:*

![Form analytics](./screenshots/41-plugins-form-builder-analytics-dark.png)

*Form Submissions report (with CSV export):*

![Submissions](./screenshots/42-plugins-form-builder-submissions-dark.png)

<div style="page-break-after: always;"></div>

## 7.3 System Testing

### 7.3.1 Testing Approach

The system was validated using a combination of testing schemes:

- **Unit testing** — isolated functions/services (e.g. form-builder services under `src/lib/form-builder/__tests__`).
- **Integration testing** — API route handlers against the database (create/read/update flows for blogs, forms, submissions).
- **Functional / black-box testing** — each screen and feature exercised through the UI.
- **UI / visual testing** — automated full-page dark-mode screenshots of all 46 routes (Playwright, `npm run screenshots`) used to catch render regressions and loading/error states.
- **Validation testing** — Zod schemas on every API input; client-side validation via react-hook-form.
- **Security/authorization testing** — role/permission gates (`requireAuth`, `guardFormBuilder`) and spam guards (honeypot, Turnstile, throttle).

### 7.3.2 Test Cases

| TC# | Module | Test Case | Test Data (Input) | Expected Result | Status |
|---|---|---|---|---|---|
| TC-01 | Auth | Valid login | `email=admin@site.com`, correct password | 200 + `token` cookie set; redirect to `/dashboard` | Pass |
| TC-02 | Auth | Invalid password | correct email, wrong password | 401 Unauthorized; no cookie | Pass |
| TC-03 | Middleware | Access `/dashboard` without token | no `token` cookie | Handled by gate (no dashboard access) | Pass |
| TC-04 | Middleware | Visit `/login` while logged in | valid `token` cookie | Redirect to `/dashboard` | Pass |
| TC-05 | Blog | Create blog post | `pageName="Intro"`, `status="published"` | 201 Created; slug auto-generated; appears in list | Pass |
| TC-06 | Blog | Reading-time calc | post with N content blocks | `readingTime` computed and stored | Pass |
| TC-07 | Blog | Status transition | draft → scheduled with `scheduledAt` | status = scheduled; publishes on cron | Pass |
| TC-08 | Plugin gate | Form API while plugin inactive | `Plugin.isActive=false` | 404 `plugin_not_installed` / 409 `plugin_disabled` | Pass |
| TC-09 | Form | Create form | `name="Contact us"`, 5 fields | 201 Created; `tenantId` set; versioned | Pass |
| TC-10 | Form | Required-field validation | submit with empty required `email` | 400 with field error; not persisted | Pass |
| TC-11 | Form | Valid submission | `{fullName, email, topic, message}` | 200; `FormSubmission` stored (`webhookStatus=pending`); analytics++ | Pass |
| TC-12 | Form | Spam honeypot | hidden honeypot field filled | Silently accepted, not stored (bot-safe) | Pass |
| TC-13 | Form | Per-IP throttle | > limit submissions from same IP | 429 Too Many Requests | Pass |
| TC-14 | Form | Submissions report | form with 3 submissions | list shows 3 rows; CSV export works | Pass |
| TC-15 | Theme | Activate theme | select a theme, activate | chosen theme becomes active; others inactive | Pass |
| TC-16 | AI | AI without key | no OpenRouter key configured | 503 "AI is not configured" | Pass |
| TC-17 | RBAC | Author restricted action | Author role attempts admin-only action | Access denied | Pass |
| TC-18 | Reports | Analytics summary | range `30d` | Aggregated metrics + charts render | Pass |

*(Screenshots evidencing many of these results are in [`screenshots/`](./screenshots/README.md).)*

<div style="page-break-after: always;"></div>

## 7.4 Sample Coding

> *(Include this section only if code disclosure is permitted; otherwise refer to the No-Code Certificate in §2.3. The excerpts below are representative of the actual implementation.)*

**1) Multi-tenant connection & role bootstrap** — `src/utils/db.ts`

```ts
// Three lazily-cached Mongoose connections; each schema is registered on the
// correct connection. Roles are seeded on first bootstrap of the User DB.
if (!(await Role.exists({}))) {
  await Role.insertMany([
    { name: 'SuperAdmin', value: 0 },
    { name: 'Admin',      value: 1 },
    { name: 'Editor',     value: 2 },
    { name: 'Author',     value: 3 },
  ]);
}

let pageDb; // reused if already open, otherwise (re)created
if (!pageDb || pageDb.readyState !== 1) {
  const uri = await createConnectionUri(PAGE_DB_NAME);
  pageDb = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });
}
```

**2) Plugin lifecycle guard** — `src/lib/form-builder/guard.ts`

```ts
/** Standard guard for every Form Builder admin/API route. */
export async function guardFormBuilder(action: FormAccessAction) {
  await requireFormBuilderActive();     // 404 not_installed / 409 disabled
  const user = await getAuthUser();
  const role = await getCurrentFormRole();
  requireFormAccess(role, action);      // 403 if not permitted
  return { role, userId: user?.userId, tenantId: resolveTenantId() };
}
```

**3) Public form submission with spam guard** — `src/app/api/forms/[id]/submit/route.ts`

```ts
export async function POST(req: NextRequest, { params }) {
  await requireFormBuilderActive();
  const { id } = await params;

  const Form = getFormModel(await getPageDbConnection());
  const form = await Form.findOne({ _id: id }).lean();
  if (!form) return apiError('Form not found', 404);
  if (form.status !== FormStatus.Published)
    return apiError('This form is not accepting submissions', 409);

  const { data = {} } = await req.json().catch(() => ({}));

  if (SubmissionService.detectSpam(data, form.settings))     // honeypot
    return apiOk({ success: true, message: form.settings.successMessage });
  if (form.settings.spam?.turnstileEnabled &&
      !(await verifyTurnstile(body.turnstileToken, ip)))     // Turnstile
    return apiError('Captcha verification failed', 400);
  if (await SubmissionService.isThrottled(tenantId, id, ip)) // per-IP throttle
    return apiError('Too many submissions. Please try again later.', 429);

  const { valid, errors } = SubmissionService.validateSubmission(form, data);
  if (!valid) return apiError(errors, 400);
  // …persist submission, bump analytics, async webhook + email…
}
```

**4) AI provider (OpenRouter)** — `src/lib/ai/provider.ts`

```ts
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function callAI(messages, opts = {}) {
  const { apiKey, model } = await getAiConfig();       // DB settings → env fallback
  if (!apiKey) throw new ApiError('AI is not configured…', 503);
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: opts.temperature ?? 0.7 }),
  });
  // …parse assistant text; jsonrepair() for resilient JSON…
}
```

**5) Route middleware (cookie gate)** — `src/middleware.ts`

```ts
export async function middleware(request: NextRequest) {
  const dbConnection = request.cookies.get('dbConnection')?.value === 'true';
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  if (path === '/' && !dbConnection)
    return NextResponse.redirect(new URL('/language', request.url));
  if (dbConnection && restrictedRoutes.includes(path))
    return NextResponse.redirect(new URL('/login', request.url));
  if (token && path === '/login')
    return NextResponse.redirect(new URL('/dashboard', request.url));
  return NextResponse.next();
}
```

<div style="page-break-after: always;"></div>

## 7.5 Future Enhancements

The following were out of scope for the current phase (time/priority) and are candidates for future work:

1. **Harden authentication** — cryptographically **verify** the JWT signature in `requireAuth` (HS256 with `JWT_SECRET`) instead of only decoding it.
2. **Fix DB connection handling** — reuse pooled Mongoose connections and close the temporary connections opened by the connection-check route to avoid exhausting free-tier database connection limits under load.
3. **Automated test suite** — expand unit/integration coverage and add a CI pipeline (currently limited).
4. **Richer plugin marketplace** — install/enable/disable UI, versioning and update notifications for third-party plugins.
5. **Media library** — first-class asset management with uploads, transformations and CDN delivery.
6. **Internationalization (i18n)** of the public site and admin UI.
7. **Role-based access control** enforcement across *all* routes (finer-grained permissions per role).
8. **Scheduled publishing & background jobs** hardened with a proper job queue.
9. **Accessibility (WCAG) audit** and SEO improvements (sitemaps, structured data).
10. **Real-time collaboration** on the page/form editors.

## 7.6 Bibliography

1. Next.js Documentation — https://nextjs.org/docs
2. React Documentation — https://react.dev
3. MongoDB Manual — https://www.mongodb.com/docs/manual/
4. Mongoose ODM Documentation — https://mongoosejs.com/docs/
5. Redux Toolkit — https://redux-toolkit.js.org
6. Tailwind CSS — https://tailwindcss.com/docs
7. Radix UI Primitives — https://www.radix-ui.com/primitives
8. dnd-kit — https://dndkit.com
9. Zod — https://zod.dev
10. Recharts — https://recharts.org
11. OpenRouter API — https://openrouter.ai/docs
12. JSON Web Tokens (JWT) — https://jwt.io/introduction
13. Mermaid Diagramming — https://mermaid.js.org
14. Playwright — https://playwright.dev
15. Cloudflare Turnstile — https://developers.cloudflare.com/turnstile/

<div style="page-break-after: always;"></div>

---

# 8. Extra Work

During the internship period, in addition to the core OpenNext CMS development, I also carried out the following supporting work:

- **Complete system-design documentation** — authored `SYSTEM_DESIGN.md` with a full set of diagrams (tenancy model, ER diagram, embedded structures, system/structure chart, class diagram, sequence diagrams, activity diagrams, state-transition diagrams, three-level Data-Flow diagrams, use-case diagram and component diagram), rendered to PNGs under `docs/diagrams/`.
- **Automated visual documentation** — built a Playwright-based dark-mode screenshot pipeline (`npm run screenshots`) that captures every page and feature of the application (46 screens) and generates an indexed gallery under `docs/screenshots/`, including seeded demo content for dynamic pages.
- **Project overview & report** — prepared `PROJECT_OVERVIEW.md` (developer-facing tour) and this project report.

*(Add here any other minor projects or tasks completed during the training period at the organization.)*

---

*End of report.*
