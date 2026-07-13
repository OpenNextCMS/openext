# OpenExtCMS — System Design

> A multi-tenant, block-based Content Management System built on **Next.js 15 (App Router) · React 19 · MongoDB/Mongoose · Redux Toolkit · JWT auth · OpenRouter AI**.
> All diagrams below are authored in [Mermaid](https://mermaid.js.org/) and render natively on GitHub/GitLab and most Markdown viewers.

## Table of contents

1. [Database Design](#1-database-design)
   - [1.1 Tenancy model (3 physical databases)](#11-tenancy-model-3-physical-databases)
   - [1.2 Entity–Relationship diagram](#12-entityrelationship-diagram)
   - [1.3 Embedded document structures](#13-embedded-document-structures)
2. [Architecture & UML](#2-architecture--uml)
   - [2.1 System / structure chart](#21-system--structure-chart)
   - [2.2 Class diagram (domain & service layer)](#22-class-diagram-domain--service-layer)
   - [2.3 Sequence diagrams](#23-sequence-diagrams)
   - [2.4 Activity diagrams](#24-activity-diagrams)
   - [2.5 State-transition diagrams](#25-state-transition-diagrams)
3. [Forms Design](#3-forms-design)
4. [Reports Design](#4-reports-design)
5. [Data Flow Diagrams (DFD)](#5-data-flow-diagrams-dfd)
   - [5.1 Level 0 — Context diagram](#51-level-0--context-diagram)
   - [5.2 Level 1 — Major processes](#52-level-1--major-processes)
   - [5.3 Level 2 — Form submission processing](#53-level-2--form-submission-processing)
6. [Use-Case & Component Views](#6-use-case--component-views)
   - [6.1 Use-case diagram](#61-use-case-diagram)
   - [6.2 Component diagram](#62-component-diagram)

---

# 1. Database Design

## 1.1 Tenancy model (3 physical databases)

Tenancy is **not** a `tenantId` column — it is **physical database separation**. `src/utils/db.ts` maintains three lazily-cached Mongoose connections and registers each schema onto the correct connection. Cross-database references (e.g. `Page.createdBy → User`) are **logical only** (dashed in the ER diagram), because the two collections live in different databases.

```mermaid
flowchart LR
    subgraph MASTER["🗄️ Master DB — 'master'"]
        MDB["MasterDb<br/>(bootstrap registry:<br/>db names + URIs)"]
    end
    subgraph USER["🗄️ User DB — env: USER_DB_NAME"]
        U[User]
        R[Role]
        S[Settings]
        P[Plugin]
    end
    subgraph PAGE["🗄️ Page DB (per-tenant) — env: PAGE_DB_NAME"]
        PG[Page]
        BP[BlogPost]
        CAT[Category]
        TG[Tag]
        AU[Author]
        CM[Comment]
        AE[AnalyticsEvent]
        LY[Layout]
        TH[Theme]
        TS[ThemeSettings]
        FM[Form]
        FS[FormSubmission]
        FV[FormVersion]
        WP[WebsitePreferences]
        MRM[MenuRedirectMapping]
        MRA[MenuRedirectAnalytics]
        MRH[MenuRedirectHistory]
    end

    MDB -. "resolves connection URIs" .-> USER
    MDB -. "resolves connection URIs" .-> PAGE
    PG -. "createdBy (logical FK)" .-> U
    FM -. "createdBy (logical FK)" .-> U
```

## 1.2 Entity–Relationship diagram

Solid lines = referential integrity within a single database. Dashed relationships in §1.1 are cross-DB logical links.

```mermaid
erDiagram
    %% ============ USER DB ============
    User {
        ObjectId _id PK
        string   username UK
        string   email UK
        string   password  "bcrypt hash"
        number   role      "FK->Role.value"
        string   firstName
        string   lastName
        string   displayName
        boolean  active
        boolean  onboardingCompleted
        date     createdAt
    }
    Role {
        ObjectId _id PK
        string   name UK  "SuperAdmin|Admin|Editor|Author"
        number   value UK "0|1|2|3"
    }
    Settings {
        ObjectId _id PK
        string   siteTitle
        string   language
        string   timeZone
        array    themes    "[{name,isActive}]"
        object   aiConfig  "openrouter keys + model"
    }
    Plugin {
        ObjectId _id PK
        string   pluginId UK
        string   name
        string   version
        string   source "uploaded|marketplace|builtin"
        boolean  isActive
        boolean  hasUpdate
    }

    %% ============ PAGE DB — content ============
    Page {
        ObjectId _id PK
        string   pageName
        ObjectId createdBy FK "->User (logical)"
        string   pageType "page|header|footer"
        string   slug UK
        boolean  isPublished
        boolean  isHome
        array    component "block-tree JSON"
    }
    BlogPost {
        ObjectId _id PK
        string   pageName
        ObjectId createdBy FK "->User (logical)"
        string   slug UK
        string   status "draft|published|scheduled|archived"
        ObjectId authorId FK "->Author"
        array    categories FK "->Category[]"
        array    tags FK "->Tag[]"
        object   seo
        number   views
        date     publishedAt
    }
    Author {
        ObjectId _id PK
        string   name
        string   email
        string   bio
        object   socialLinks
    }
    Category {
        ObjectId _id PK
        string   name
        string   slug UK
        ObjectId parentCategory FK "->Category (self)"
    }
    Tag {
        ObjectId _id PK
        string   name
        string   slug UK
    }
    Comment {
        ObjectId _id PK
        ObjectId blogId FK "->Page"
        string   name
        string   email
        string   comment
        string   status "pending|approved|spam"
    }
    AnalyticsEvent {
        ObjectId _id PK
        ObjectId blogId FK "->Page"
        string   type "view|read|search"
        string   visitorId
        number   durationSec
        string   query
        date     createdAt
    }
    Layout {
        ObjectId _id PK
        string   name
        boolean  isActive
        array    sections "[{type,visible,responsive}]"
    }
    Theme {
        ObjectId _id PK
        string   name
        string   slug UK
        boolean  isActive
        object   theme "design tokens"
    }
    ThemeSettings {
        ObjectId _id PK
        object   typography
        object   colors
        object   layout
        string   darkMode "light|dark|auto"
    }
    WebsitePreferences {
        ObjectId _id PK
        ObjectId userId UK "->User (logical)"
        string   businessName
        boolean  onboardingCompleted
        boolean  draft
        array    generatedPageSlugs
    }

    %% ============ PAGE DB — forms ============
    Form {
        ObjectId _id PK
        string   name
        string   slug UK
        string   status "draft|published|archived"
        array    fields "embedded FormField[]"
        object   settings
        object   analytics
        ObjectId createdBy FK "->User (logical)"
    }
    FormSubmission {
        ObjectId _id PK
        ObjectId formId FK "->Form"
        map      submissionData
        string   ipAddress
        string   webhookStatus "pending|sent|failed"
        date     createdAt
    }
    FormVersion {
        ObjectId _id PK
        ObjectId formId FK "->Form"
        number   version
        object   snapshot "full Form copy"
    }

    %% ============ PAGE DB — menu redirect plugin ============
    MenuRedirectMapping {
        ObjectId _id PK
        string   headerId
        string   menuItemId
        string   targetType "page|blog|anchor|external|cms"
        boolean  enabled
    }
    MenuRedirectAnalytics {
        ObjectId _id PK
        ObjectId mappingId FK "->MenuRedirectMapping"
        number   clicks
        date     lastClickedAt
    }
    MenuRedirectHistory {
        ObjectId _id PK
        string   action
        ObjectId userId FK "->User (logical)"
        date     createdAt
    }

    %% ============ RELATIONSHIPS ============
    User               ||--o{ Page                 : creates
    User               ||--o{ BlogPost             : authors
    User               ||--o{ Form                 : owns
    User               ||--o{ WebsitePreferences   : configures
    User               }o--|| Role                 : "has (by value)"
    BlogPost           }o--|| Author               : "written by"
    BlogPost           }o--o{ Category             : categorized
    BlogPost           }o--o{ Tag                   : tagged
    Category           ||--o{ Category             : "parent of"
    Page               ||--o{ Comment              : receives
    Page               ||--o{ AnalyticsEvent       : generates
    Form               ||--o{ FormSubmission       : collects
    Form               ||--o{ FormVersion          : snapshots
    MenuRedirectMapping ||--|| MenuRedirectAnalytics : "tracked by"
```

> **Design notes**
> - Both `Page` (with `pageType`) **and** `BlogPost` model content; blog comments and analytics reference **`Page`**, not `BlogPost`.
> - `User.role` is a *soft* foreign key: it stores `Role.value` (a number), not an `ObjectId`.
> - `BlogPost ⇄ Category` and `BlogPost ⇄ Tag` are many-to-many via `ObjectId[]` arrays embedded on `BlogPost`.

## 1.3 Embedded document structures

These sub-schemas are stored **inline** (`_id: false`) inside their parent document rather than as separate collections.

```mermaid
classDiagram
    class Form {
        +String name
        +String slug
        +FormStatus status
        +FormField[] fields
        +FormSettings settings
        +FormAnalytics analytics
        +VersionEntry[] versions
    }
    class FormField {
        +String id
        +FormFieldType type
        +String label
        +Boolean required
        +Validation validation
        +String width
        +Number order
        +Mixed[] conditionalRules
        +Option[] options
        +Number step
    }
    class FormSettings {
        +MultiStep multiStep
        +Notifications notifications
        +Webhook webhook
        +Spam spam
        +FileUpload fileUpload
    }
    class FormAnalytics {
        +Number views
        +Number starts
        +Number completions
        +Number conversionRate
        +Mixed dropOffByField
        +TimelinePoint[] timeline
    }
    Form "1" *-- "many" FormField : embeds
    Form "1" *-- "1" FormSettings : embeds
    Form "1" *-- "1" FormAnalytics : embeds
    FormField "1" *-- "0..1" Validation
    FormField "1" *-- "many" Option
    FormSettings *-- Webhook
    FormSettings *-- Spam
    FormAnalytics *-- TimelinePoint
```

---

# 2. Architecture & UML

## 2.1 System / structure chart

Layered view of the running system, from browser to database.

```mermaid
flowchart TB
    subgraph CLIENT["🌐 Client (Browser)"]
        UIadmin["Admin Dashboard<br/>(blogs, pages, forms,<br/>themes, plugins, analytics)"]
        UIpublic["Public Site<br/>([slug] pages, blog,<br/>public forms)"]
        EDITOR["Block/Page Editor<br/>(dnd-kit canvas)"]
        FB["Form Builder<br/>(dnd-kit canvas)"]
    end

    subgraph NEXT["▲ Next.js 15 App Router (server)"]
        MW["middleware.ts<br/>cookie gate (dbConnection, token)"]
        subgraph API["API layer — ~106 route.ts handlers"]
            A_AUTH["/api/auth/*"]
            A_CONTENT["/api/pages · blogs · authors<br/>categories · tags · comments"]
            A_FORMS["/api/forms/*"]
            A_THEMES["/api/themes/*"]
            A_ANALYTICS["/api/analytics/*"]
            A_AI["/api/ai/* · forms/ai/*"]
            A_MENU["/api/menu-redirect/*"]
        end
        HELP["src/lib/api/*<br/>(requireAuth, apiOk, pagination)"]
    end

    subgraph STATE["🔁 Client State — Redux Toolkit + persist"]
        SL_CANVAS[canvasSlice]
        SL_FORM[formBuilderSlice]
        SL_THEME[themeBuilderSlice]
        SL_MENU[menuRedirectSlice]
    end

    subgraph DOMAIN["⚙️ Services / Domain logic"]
        SVC_AUTH["authService<br/>(bcrypt + JWT)"]
        SVC_FORM["form-builder services<br/>(form, submission,<br/>analytics, email, webhook)"]
        SVC_THEME["theme services<br/>(loader, validator, cache)"]
        SVC_GEN["generateStarterWebsite<br/>(AI onboarding)"]
    end

    subgraph AIEXT["🤖 OpenRouter"]
        AI["callAI()<br/>gemini-2.5-flash"]
    end

    subgraph DB["🗄️ MongoDB (Mongoose — 3 DBs)"]
        DBM[(Master DB)]
        DBU[(User DB)]
        DBP[(Page DB)]
    end

    UIadmin & UIpublic & EDITOR & FB --> MW
    MW --> API
    EDITOR <--> SL_CANVAS
    FB <--> SL_FORM
    API --> HELP
    A_AUTH --> SVC_AUTH
    A_FORMS --> SVC_FORM
    A_THEMES --> SVC_THEME
    A_AI & A_FORMS --> AI
    SVC_GEN --> AI
    SVC_AUTH --> DBU
    A_CONTENT & A_FORMS & A_ANALYTICS & A_MENU --> DBP
    SVC_AUTH -. bootstrap .-> DBM
```

## 2.2 Class diagram (domain & service layer)

Key server-side classes/modules and how they collaborate.

```mermaid
classDiagram
    class AuthService {
        +register(dto) User
        +login(email, password) token
        +getUserByEmail(email) User
    }
    class JwtUtil {
        +signJwt(payload) string
        +verify(token) payload
    }
    class RequireAuth {
        +getAuthUser(req) AuthUser
        +requireAuth(req) AuthUser
    }
    class FormService {
        +create(dto) Form
        +update(id, dto) Form
        +duplicate(id) Form
        +listVersions(id) FormVersion[]
        +restore(id, version) Form
    }
    class SubmissionService {
        +submit(formId, data) FormSubmission
        +list(formId) FormSubmission[]
    }
    class AnalyticsService {
        +track(formId, event) void
        +summary(formId) FormAnalytics
    }
    class WebhookService {
        +dispatch(submission) WebhookAttempt
    }
    class EmailService {
        +notifyAdmin(sub) void
        +notifyUser(sub) void
    }
    class AIProvider {
        +callAI(prompt, opts) string
        +safeParseJson(raw) object
    }
    class ThemeService {
        +load(slug) Theme
        +validate(theme) Result
        +activate(id) void
    }

    AuthService ..> JwtUtil : signs
    RequireAuth ..> JwtUtil : decodes
    AuthService ..> UserModel : persists
    FormService ..> FormModel
    FormService ..> FormVersionModel
    SubmissionService ..> FormSubmissionModel
    SubmissionService ..> WebhookService : on submit
    SubmissionService ..> EmailService : on submit
    AnalyticsService ..> FormModel : reads analytics
    FormService ..> AIProvider : ai/generate
    ThemeService ..> ThemeModel
```

## 2.3 Sequence diagrams

### 2.3.1 Admin login (JWT issuance)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant B as Browser
    participant MW as middleware.ts
    participant API as POST /api/auth/login
    participant AS as AuthService
    participant DB as User DB (Mongoose)

    Admin->>B: submit email + password
    B->>MW: POST /api/auth/login
    MW-->>B: pass (login route not gated)
    B->>API: credentials
    API->>AS: login(email, password)
    AS->>DB: findOne({ email })
    DB-->>AS: user (bcrypt hash)
    AS->>AS: bcrypt.compare(password, hash)
    alt password valid
        AS->>AS: signJwt({userId,email,role})
        AS-->>API: token
        API-->>B: 200 + Set-Cookie: token
        B->>MW: navigate /dashboard
        MW-->>B: token present → allow
    else invalid
        AS-->>API: null
        API-->>B: 401 Unauthorized
    end
```

### 2.3.2 Public form submission (with webhook + email + spam guard)

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant R as FormRenderer
    participant API as POST /api/forms/[id]/submit
    participant SS as SubmissionService
    participant SP as spam guard
    participant DB as Page DB
    participant WH as WebhookService
    participant EM as EmailService

    Visitor->>R: fill fields, click Submit
    R->>R: client-side Zod validation +<br/>conditional rules
    R->>API: submissionData (+ honeypot, turnstile)
    API->>SP: check honeypot / Turnstile / throttle
    alt spam detected
        SP-->>API: reject
        API-->>R: 429 / 400
    else clean
        API->>SS: submit(formId, data)
        SS->>DB: insert FormSubmission (webhookStatus=pending)
        SS->>DB: increment Form.analytics.completions
        SS-->>API: submission
        API-->>R: 200 { successMessage | redirectUrl }
        par async side-effects
            SS->>WH: dispatch(submission)
            WH->>DB: update webhookStatus=sent|failed
        and
            SS->>EM: notifyAdmin + notifyUser
        end
    end
```

### 2.3.3 Blog analytics — track then report

```mermaid
sequenceDiagram
    autonumber
    actor Reader
    participant Post as Blog Post page
    participant T as POST /api/analytics/track
    participant DBP as Page DB
    actor AdminU as Admin
    participant Dash as Analytics Dashboard
    participant Sum as GET /api/analytics/summary

    Reader->>Post: open post
    Post->>T: {type:'view', blogId, visitorId}
    T->>DBP: insert AnalyticsEvent
    Reader-->>Post: leave (unmount)
    Post->>T: {type:'read', durationSec}
    T->>DBP: insert AnalyticsEvent

    AdminU->>Dash: open /dashboard/analytics?range=30d
    Dash->>Sum: GET summary
    Sum->>DBP: aggregate (views, unique visitors,<br/>avg read time, popular posts)
    DBP-->>Sum: metrics
    Sum-->>Dash: JSON
    Dash-->>AdminU: render recharts (Area + Bar)
```

## 2.4 Activity diagrams

### 2.4.1 AI-assisted onboarding (starter-site generation)

```mermaid
flowchart TD
    Start([User starts onboarding]) --> Wizard[Fill preferences wizard]
    Wizard --> Autosave{Save draft?}
    Autosave -- autosave --> Draft[(WebsitePreferences.draft=true)]
    Autosave -- continue --> Complete[Complete wizard]
    Complete --> Gen[POST /api/onboarding/generate]
    Gen --> AI[callAI: generate page JSON<br/>from business profile]
    AI --> Valid{Valid JSON<br/>& quality score ≥ min?}
    Valid -- no --> Repair[jsonrepair / retry]
    Repair --> AI
    Valid -- yes --> Pages[Create Page docs<br/>home + generated slugs]
    Pages --> Mark[WebsitePreferences.onboardingCompleted=true<br/>User.onboardingCompleted=true]
    Mark --> Redirect([Redirect to /dashboard])
```

### 2.4.2 Blog post lifecycle (author → publish)

```mermaid
flowchart TD
    New([Create BlogPost]) --> Edit[Edit content blocks + SEO]
    Edit --> Decide{Publish now?}
    Decide -- Save draft --> DraftS[status = draft]
    DraftS --> Edit
    Decide -- Schedule --> Sched[status = scheduled<br/>set scheduledAt]
    Decide -- Publish --> Pub[status = published<br/>set publishedAt]
    Sched --> Cron{{cron: /api/cron/publish-scheduled}}
    Cron -->|scheduledAt reached| Pub
    Pub --> Live[[Visible on public site]]
    Live --> Archive{Archive?}
    Archive -- yes --> Arc[status = archived]
    Archive -- no --> Live
```

## 2.5 State-transition diagrams

### 2.5.1 BlogPost `status`

```mermaid
stateDiagram-v2
    [*] --> draft : create
    draft --> scheduled : schedule(scheduledAt)
    draft --> published : publish
    scheduled --> published : cron reaches scheduledAt
    scheduled --> draft : unschedule
    published --> archived : archive
    published --> draft : unpublish
    archived --> draft : restore
    archived --> [*]
```

### 2.5.2 Form `status`

```mermaid
stateDiagram-v2
    [*] --> draft : create
    draft --> published : publish (public renderer live)
    published --> draft : revert to draft
    published --> archived : archive
    draft --> archived : archive
    archived --> draft : restore
```

### 2.5.3 Comment moderation

```mermaid
stateDiagram-v2
    [*] --> pending : visitor submits
    pending --> approved : moderator approves
    pending --> spam : moderator/filter flags
    approved --> spam : re-flag
    spam --> approved : restore
    approved --> [*] : visible on post
```

### 2.5.4 FormSubmission webhook delivery

```mermaid
stateDiagram-v2
    [*] --> pending : submission stored
    pending --> sent : webhook 2xx
    pending --> failed : non-2xx / error
    failed --> sent : retry succeeds (retryCount)
    failed --> failed : retry fails
    sent --> [*]
```

---

# 3. Forms Design

The form builder is a drag-and-drop designer whose output is a `Form` document (§1.3). Editor state is normalized in Redux (`formBuilderSlice`: `fieldsById` + `fieldOrder[]` + `selectedFieldId`).

## 3.1 Field-type catalog

`FormFieldType` (`src/types/form-builder.ts`) → renderer (`src/components/form-builder/fields/registry.tsx`):

| Category | Field types | Renderer |
|----------|-------------|----------|
| **Text inputs** | `text` · `email` · `phone` · `number` · `url` · `password` · `date` · `time` | `TextInputField` |
| **Long text** | `textarea` | `TextareaField` |
| **Choice** | `dropdown` · `radio` · `checkbox` | `DropdownField` · `RadioField` · `CheckboxField` |
| **Rating** | `rating` | `RatingField` |
| **Special** | `file` · `signature` | `FileUploadField` · `SignatureField` |
| **Structural** | `section_header` · `divider` · `hidden` | `SectionHeaderField` · `DividerField` · `HiddenField` |

Each field supports: `label`, `placeholder`, `helpText`, `required`, `defaultValue`, `validation` (min/max length, regex, pattern, custom), `width` (25/50/75/100 %), `order`, `conditionalRules` (nested AND/OR), `options` (choice fields), `step` (multi-step index), `cssClass`.

## 3.2 Form builder screen layout (wireframe)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Form Builder                       [ Preview ] [ Settings ⚙ ] [ Save ▸ ]  │
├───────────────┬──────────────────────────────────────┬─────────────────────┤
│ FIELD LIBRARY │            FORM CANVAS               │  PROPERTIES PANEL    │
│ (draggable)   │        (dnd-kit sortable)            │  (selected field)    │
│               │                                      │                      │
│ ▸ Text        │  ┌────────────────────────────────┐  │  Label   [________]  │
│ ▸ Email       │  │ ▤ Section: Contact details     │  │  Required [x]        │
│ ▸ Phone       │  ├────────────────────────────────┤  │  Width  [ 50% ▼]     │
│ ▸ Dropdown    │  │ Full name *      [__________]   │  │  Placeholder […]     │
│ ▸ Radio       │  │ Email *          [__________]   │  │  ── Validation ──    │
│ ▸ Checkbox    │  │ Phone            [__________]   │  │  min/max, regex…     │
│ ▸ Date/Time   │  │ ── divider ──                  │  │  ── Conditional ──   │
│ ▸ File        │  │ Message          [▭▭▭▭▭▭▭▭]   │  │  show if … = …       │
│ ▸ Rating      │  │                                │  │                      │
│ ▸ Signature   │  │      [   Submit   ]            │  │                      │
│ ▸ Section     │  └────────────────────────────────┘  │                      │
└───────────────┴──────────────────────────────────────┴─────────────────────┘
```

## 3.3 Public form (rendered) & settings surfaces

- **Renderer** (`FormRenderer.tsx`, page `/forms/[slug]`): honors multi-step (progress bar + Back), conditional show/hide/require, spam guard (honeypot + Cloudflare Turnstile + throttle), file upload constraints, then POSTs to `/api/forms/[id]/submit`.
- **Settings drawer** groups: *Submit* (button text, success message, redirect), *Multi-step*, *Notifications* (admin/user email templates), *Webhook* (URL, method, headers, retry), *Spam*, *File upload*.

```mermaid
flowchart LR
    subgraph Builder["Design time"]
        Palette[Field Library] -->|drag| Canvas[Form Canvas]
        Canvas --> Props[Properties Panel]
        Props --> Save[(Form doc)]
    end
    subgraph Runtime["Run time"]
        Save --> Render[FormRenderer]
        Render --> Submit["POST /submit"]
        Submit --> Sub[(FormSubmission)]
    end
```

---

# 4. Reports Design

Three analytics/report surfaces, all rendered with **recharts** (wrapped by `src/components/ui/chart.tsx`).

## 4.1 Report inventory

| # | Report | Route | Data source | Charts |
|---|--------|-------|-------------|--------|
| A | **Blog Analytics** | `/dashboard/analytics` ← `GET /api/analytics/summary?range=7d\|30d\|all` | `AnalyticsEvent` aggregation | Stat cards (Views, Unique Visitors, Avg Read Time); Area (views/day); Bar (popular posts, top categories); list (search queries) |
| B | **Form Analytics** | `/dashboard/plugins/form-builder/[id]/analytics` ← `/api/forms/[id]/analytics` | `Form.analytics` + submissions | Stat cards (Views, Starts, Completions, Conversion %); Area (timeline); Bar (drop-off by field / funnel) |
| C | **Menu-Redirect Analytics** | menu-redirect plugin ← `/api/menu-redirect/analytics` | `MenuRedirectAnalytics` counters | Stat card (Total clicks); Bar (clicks by link); ranked list (top links w/ share %) |

> The **dashboard home** (`/dashboard`) shows DB-connection status cards (master/user/page) plus a LineChart currently backed by mock data — a candidate to wire to report A.

## 4.2 Blog Analytics dashboard layout (wireframe)

```
┌───────────────────────────────────────────────── Range: [7d] [30d] [All] ┐
│  ┌───────────┐  ┌───────────────┐  ┌───────────────┐                       │
│  │  Views    │  │ Unique        │  │ Avg Read      │   ← stat cards        │
│  │  12,480   │  │ Visitors 3,921│  │ Time  2m 14s  │                       │
│  └───────────┘  └───────────────┘  └───────────────┘                       │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Views over time                            (AreaChart)               │ │
│  │      ╭╮       ╭─╮                                                      │ │
│  │   ╭──╯╰──╮╭──╯  ╰────╮                                                 │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │ Popular posts (Bar, top 10)   │  │ Top categories (Bar)              │ │
│  │ Post A  ████████████ 1,204    │  │ News      █████████ 812           │ │
│  │ Post B  ████████ 903          │  │ Guides    ██████ 540              │ │
│  └───────────────────────────────┘  └───────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Top search queries: "pricing" (48) · "docs" (31) · "api" (22) …       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Form Analytics — conversion funnel

```
┌─ Form: "Contact us" ──────────────────────────────────────────────────────┐
│  Views 4,010   →   Starts 2,140   →   Completions 1,560   →  Conv. 38.9%   │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Timeline: views vs completions               (AreaChart)             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ Drop-off by field (Bar — abandonment count per fieldId)              │ │
│  │ phone      ████████ 410                                              │ │
│  │ message    ████ 180                                                  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4.4 Report data flow

```mermaid
flowchart LR
    subgraph Collect
        Ev[AnalyticsEvent] & FA[Form.analytics] & MA[MenuRedirectAnalytics]
    end
    subgraph Aggregate["API (Mongo aggregation)"]
        S1["/analytics/summary"]
        S2["/forms/:id/analytics"]
        S3["/menu-redirect/analytics"]
    end
    subgraph Present["Dashboards (recharts)"]
        D1[Blog Analytics]
        D2[Form Analytics]
        D3[Menu Analytics]
    end
    Ev --> S1 --> D1
    FA --> S2 --> D2
    MA --> S3 --> D3
```

---

# 5. Data Flow Diagrams (DFD)

Classic DeMarco-style DFD notation, rendered with Mermaid:

- **Rounded box** = *process* (transforms data), numbered `n.0`
- **Rectangle** = *external entity* (source/sink outside the system)
- **Cylinder** = *data store* (`Dn`)
- **Labeled arrow** = *data flow*

## 5.1 Level 0 — Context diagram

The whole CMS as a single process, showing every external actor and the data that crosses the system boundary.

```mermaid
flowchart TB
    ADMIN["👤 Admin / Editor"]:::ext
    VISITOR["🌐 Site Visitor"]:::ext
    AI["🤖 OpenRouter AI"]:::ext
    HOOK["🔗 3rd-party Webhook"]:::ext
    MAIL["✉️ Email Recipient"]:::ext

    SYS((("0<br/>OpenExtCMS"))):::proc

    ADMIN -->|"credentials, content,<br/>form &amp; theme config"| SYS
    SYS -->|"dashboards, reports,<br/>editor state"| ADMIN
    VISITOR -->|"page requests, form submissions,<br/>analytics events, comments"| SYS
    SYS -->|"rendered pages &amp; forms,<br/>confirmations"| VISITOR
    SYS -->|"prompts"| AI
    AI -->|"generated content / JSON"| SYS
    SYS -->|"submission payload"| HOOK
    HOOK -->|"delivery status"| SYS
    SYS -->|"notification emails"| MAIL

    classDef ext fill:#e8eaf6,stroke:#3949ab,color:#1a237e;
    classDef proc fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20;
```

## 5.2 Level 1 — Major processes

The system decomposed into its eight major processes, the eight data stores they read/write, and the flows between them and the external entities.

```mermaid
flowchart LR
    %% ---- external entities ----
    ADMIN["👤 Admin / Editor"]:::ext
    VISITOR["🌐 Site Visitor"]:::ext
    AI["🤖 OpenRouter AI"]:::ext
    HOOK["🔗 Webhook"]:::ext
    MAIL["✉️ Email"]:::ext

    %% ---- processes ----
    P1(["1.0 Authentication<br/>&amp; Authorization"]):::proc
    P2(["2.0 Content<br/>Management"]):::proc
    P3(["3.0 Form Builder<br/>&amp; Management"]):::proc
    P4(["4.0 Submission<br/>Processing"]):::proc
    P5(["5.0 Analytics<br/>&amp; Reporting"]):::proc
    P6(["6.0 Theme &amp; Plugin<br/>Management"]):::proc
    P7(["7.0 AI Generation"]):::proc
    P8(["8.0 Onboarding /<br/>Site Generation"]):::proc

    %% ---- data stores ----
    D1[("D1 Users / Roles / Settings")]:::store
    D2[("D2 Pages &amp; Blog")]:::store
    D3[("D3 Forms &amp; Versions")]:::store
    D4[("D4 Form Submissions")]:::store
    D5[("D5 Analytics Events")]:::store
    D6[("D6 Themes / Layouts")]:::store
    D7[("D7 Master Registry")]:::store
    D8[("D8 Website Preferences")]:::store

    %% ---- auth ----
    ADMIN -->|credentials| P1
    P1 -->|JWT cookie| ADMIN
    P1 <-->|user records| D1
    P1 -.->|bootstrap DBs| D7

    %% ---- content ----
    ADMIN -->|page / blog content| P2
    P2 <-->|CRUD block-tree| D2
    P2 -->|published pages| VISITOR
    VISITOR -->|comments| P2

    %% ---- forms ----
    ADMIN -->|form definition| P3
    P3 <-->|forms &amp; snapshots| D3
    P3 -->|rendered form| VISITOR

    %% ---- submissions ----
    VISITOR -->|submission data| P4
    P4 -->|store submission| D4
    P4 -->|completions++| D3
    P4 -->|payload| HOOK
    HOOK -->|status| P4
    P4 -->|notifications| MAIL
    P4 -->|confirmation| VISITOR

    %% ---- analytics ----
    VISITOR -->|view / read / search| P5
    P5 <-->|events| D5
    P5 -->|read form metrics| D3
    P5 -->|reports / dashboards| ADMIN

    %% ---- themes / plugins ----
    ADMIN -->|theme / plugin config| P6
    P6 <-->|themes / layouts| D6
    P6 <-->|plugin records| D1

    %% ---- AI ----
    P2 -->|content prompt| P7
    P3 -->|form prompt| P7
    P7 <-->|completions| AI
    P7 -->|generated content| P2

    %% ---- onboarding ----
    ADMIN -->|business profile| P8
    P8 <-->|preferences / draft| D8
    P8 -->|site prompt| P7
    P8 -->|starter pages| D2

    classDef ext fill:#e8eaf6,stroke:#3949ab,color:#1a237e;
    classDef proc fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20;
    classDef store fill:#fff3e0,stroke:#ef6c00,color:#e65100;
```

## 5.3 Level 2 — Form submission processing

Explosion of process **4.0**, showing the spam guard, persistence, analytics update, and the asynchronous webhook + email side-effects.

```mermaid
flowchart TB
    VISITOR["🌐 Site Visitor"]:::ext
    HOOK["🔗 Webhook"]:::ext
    MAIL["✉️ Email"]:::ext

    P41(["4.1 Validate &amp;<br/>Spam Check"]):::proc
    P42(["4.2 Persist<br/>Submission"]):::proc
    P43(["4.3 Update<br/>Analytics"]):::proc
    P44(["4.4 Dispatch<br/>Webhook"]):::proc
    P45(["4.5 Send Email<br/>Notifications"]):::proc

    D3[("D3 Forms")]:::store
    D4[("D4 Submissions")]:::store

    VISITOR -->|"form data + honeypot / Turnstile"| P41
    D3 -->|"field defs, spam &amp; webhook settings"| P41
    P41 -->|"reject (429 / 400)"| VISITOR
    P41 -->|"clean data"| P42
    P42 -->|"insert (webhookStatus=pending)"| D4
    P42 -->|"success message / redirect"| VISITOR
    P42 --> P43
    P43 -->|"completions++"| D3
    P42 --> P44
    P44 -->|"payload"| HOOK
    HOOK -->|"2xx / err → webhookStatus"| D4
    P42 --> P45
    P45 -->|"admin + user mail"| MAIL

    classDef ext fill:#e8eaf6,stroke:#3949ab,color:#1a237e;
    classDef proc fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20;
    classDef store fill:#fff3e0,stroke:#ef6c00,color:#e65100;
```

---

# 6. Use-Case & Component Views

Two supplementary UML views: the **use-case diagram** captures *who* can do *what* (actor roles vs. system functions), and the **component diagram** captures *how the code is assembled* (deployable units and the interfaces between them).

## 6.1 Use-case diagram

Four administrative roles form a **generalization hierarchy** — `SuperAdmin ▸ Admin ▸ Editor ▸ Author` — where each higher role inherits every use case of the roles below it (dashed *inherits* links). The **Site Visitor** is an unauthenticated actor; **OpenRouter AI** and the **cron scheduler** are secondary (system) actors. `«include»` / `«extend»` mark the AI-generation relationships.

```mermaid
flowchart LR
    %% ---- actors ----
    SA["👑 SuperAdmin"]:::actor
    AD["🛡️ Admin"]:::actor
    ED["✏️ Editor"]:::actor
    AU["🖊️ Author"]:::actor
    VIS["🌐 Site Visitor"]:::actor
    AIA["🤖 OpenRouter AI"]:::sys
    CRON["⏰ Scheduler (cron)"]:::sys

    %% ---- role generalization (higher role inherits lower's use cases) ----
    SA -.->|inherits| AD
    AD -.->|inherits| ED
    ED -.->|inherits| AU

    subgraph SYS["🗄️ OpenExtCMS"]
        direction TB
        subgraph AUTHG["Access &amp; onboarding"]
            U1(["Log in (JWT)"])
            U2(["Manage sub-users &amp; roles"])
            U3(["Complete AI onboarding"])
        end
        subgraph CONTENTG["Content"]
            U4(["Edit pages (block editor)"])
            U5(["Write blog posts"])
            U6(["Publish / schedule content"])
            U7(["Moderate comments"])
        end
        subgraph FORMG["Forms"]
            U8(["Build form (drag &amp; drop)"])
            U9(["Configure form settings"])
            U10(["Version / restore form"])
        end
        subgraph SITEG["Site &amp; design"]
            U12(["Manage themes &amp; layouts"])
            U13(["Manage plugins"])
            U14(["Configure menu redirects"])
        end
        subgraph REPORTG["Analytics &amp; reports"]
            U15(["View blog analytics"])
            U16(["View form analytics"])
            U17(["View menu-redirect analytics"])
        end
        subgraph PUBG["Public"]
            U18(["Browse site / read blog"])
            U19(["Post comment"])
            U11(["Submit form"])
        end
        UAI(["Generate content with AI"])
    end

    %% ---- Author (base content role) ----
    AU --- U1
    AU --- U4
    AU --- U5
    %% ---- Editor ----
    ED --- U6
    ED --- U7
    ED --- U8
    ED --- U9
    ED --- U10
    %% ---- Admin ----
    AD --- U2
    AD --- U3
    AD --- U12
    AD --- U13
    AD --- U14
    AD --- U15
    AD --- U16
    AD --- U17
    %% ---- Site Visitor ----
    VIS --- U18
    VIS --- U19
    VIS --- U11

    %% ---- include / extend + secondary actors ----
    U3 -.->|«include»| UAI
    UAI -.->|«extend»| U5
    UAI -.->|«extend»| U8
    AIA --- UAI
    CRON -.->|«triggers»| U6

    classDef actor fill:#e8eaf6,stroke:#3949ab,color:#1a237e;
    classDef sys fill:#fff3e0,stroke:#ef6c00,color:#e65100;
```

> **RBAC note** — this is the *intended* role model (`Role`: SuperAdmin=0, Admin=1, Editor=2, Author=3 seeded in `src/utils/db.ts`). Enforcement is partial today (see Appendix); the form-builder plugin uses its own `Owner/Admin/Editor/Viewer` scope (`useFormPermissions`).

## 6.2 Component diagram

Deployable/logical components grouped by tier, with the **provided/required interfaces** on each connector (HTTPS/JSON at the edge, Mongoose driver / REST / SMTP / HTTP POST at the external boundary). The Redux store is a client-side component; `utils/db.ts` is the single connection broker to all three MongoDB databases.

```mermaid
flowchart TB
    subgraph CLIENT["🌐 Client components"]
        direction LR
        C_ADMIN["«component»<br/>Admin Dashboard"]
        C_PUB["«component»<br/>Public Site Renderer"]
        C_EDIT["«component»<br/>Block / Page Editor"]
        C_FB["«component»<br/>Form Builder"]
        C_FR["«component»<br/>Form Renderer"]
    end

    subgraph STORE["🔁 Redux Toolkit store (redux-persist)"]
        direction LR
        S1["canvasSlice"]
        S2["formBuilderSlice"]
        S3["formSubmissionSlice"]
        S4["formAnalyticsSlice"]
        S5["themeBuilderSlice"]
        S6["menuRedirectSlice"]
    end

    subgraph SERVER["▲ Next.js 15 server"]
        MW["«component»<br/>middleware.ts<br/>(cookie gate)"]
        subgraph APIG["«component» API route handlers"]
            direction LR
            A1["/api/auth"]
            A2["/api/pages · blogs<br/>authors · categories<br/>tags · comments"]
            A3["/api/forms/*"]
            A4["/api/themes · layouts"]
            A5["/api/analytics"]
            A6["/api/ai · forms/ai"]
            A7["/api/menu-redirect"]
            A8["/api/onboarding"]
            A9["/api/sub-users"]
        end
        HELP["«component»<br/>lib/api<br/>requireAuth · response<br/>pagination · errors"]
    end

    subgraph DOMAIN["⚙️ Domain / service components"]
        direction LR
        SVCA["«component»<br/>authService<br/>(bcrypt + JWT)"]
        SVCF["«component»<br/>form-builder services<br/>form · submission · analytics<br/>webhook · email"]
        SVCT["«component»<br/>theme services<br/>loader · validator · cache"]
        SVCAI["«component»<br/>AI provider<br/>callAI()"]
        SVCG["«component»<br/>generateStarterWebsite"]
        SVCM["«component»<br/>menu-redirect<br/>matcher · lifecycle · history"]
        SVCP["«component»<br/>plugins<br/>extract · manifest · storage"]
    end

    subgraph DATA["🗃️ Data access"]
        direction LR
        MODELS["«component»<br/>Mongoose models (22)"]
        DBMGR["«component»<br/>utils/db.ts<br/>3-connection manager"]
    end

    subgraph EXT["🔌 External systems"]
        direction LR
        EDB[("MongoDB<br/>Master · User · Page")]
        EAI["OpenRouter API"]
        EMAIL["SMTP / Email"]
        EHOOK["3rd-party Webhook"]
        ETS["Cloudflare Turnstile"]
    end

    %% ---- client → server ----
    C_ADMIN & C_PUB & C_EDIT & C_FB & C_FR -->|HTTPS / JSON| MW
    C_EDIT <--> S1
    C_FB <--> S2
    C_FR <--> S3
    C_FB <--> S4
    C_EDIT <--> S5
    C_ADMIN <--> S6

    %% ---- routing → services ----
    MW --> APIG
    APIG -->|uses| HELP
    A1 --> SVCA
    A3 & A6 --> SVCF
    A4 --> SVCT
    A6 --> SVCAI
    A8 --> SVCG
    A7 --> SVCM
    A2 -->|plugin mgmt| SVCP
    SVCF --> SVCAI
    SVCG --> SVCAI
    HELP --> SVCA

    %% ---- services → data ----
    SVCA & SVCF & SVCT & SVCM & SVCP & SVCG --> MODELS
    A2 & A5 --> MODELS
    MODELS --> DBMGR

    %% ---- required external interfaces ----
    DBMGR -->|Mongoose driver| EDB
    SVCAI -->|REST| EAI
    SVCF -->|SMTP| EMAIL
    SVCF -->|HTTP POST| EHOOK
    C_FR -.->|verify token| ETS

    classDef comp fill:#e3f2fd,stroke:#1565c0,color:#0d47a1;
    classDef ext fill:#fff3e0,stroke:#ef6c00,color:#e65100;
    class C_ADMIN,C_PUB,C_EDIT,C_FB,C_FR,MW,HELP,SVCA,SVCF,SVCT,SVCAI,SVCG,SVCM,SVCP,MODELS,DBMGR comp;
    class EDB,EAI,EMAIL,EHOOK,ETS ext;
```

---

### Appendix — security note carried from the codebase

`requireAuth` (`src/lib/api/auth.ts`) currently **decodes** the JWT (`jwtDecode`) but does **not cryptographically verify** the signature — a documented placeholder. The sequence diagrams above show the intended verified flow; hardening `requireAuth` to call `verify(token)` (HS256 with `JWT_SECRET`) is a recommended next step before production.
