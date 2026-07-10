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

### Appendix — security note carried from the codebase

`requireAuth` (`src/lib/api/auth.ts`) currently **decodes** the JWT (`jwtDecode`) but does **not cryptographically verify** the signature — a documented placeholder. The sequence diagrams above show the intended verified flow; hardening `requireAuth` to call `verify(token)` (HS256 with `JWT_SECRET`) is a recommended next step before production.
