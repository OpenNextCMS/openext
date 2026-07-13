# OpenNext CMS — Dark-Mode Screenshots

Full-page screenshots of every page and feature, captured in **dark mode** at 1440 px wide (full scroll height). 46 screenshots.

Regenerate:

```bash
npm run dev            # http://localhost:3011
npm run screenshots    # resumable — re-run until all pages are captured (see DB note)
node scripts/_shots_public.mjs        # logged-out auth/setup pages
node scripts/_screenshots_index.mjs   # rebuild this index
```

> **DB note:** the free-tier MongoDB Atlas cluster can throttle TLS connections under a sustained crawl. `screenshots.mjs` is resumable and aborts cleanly when the DB tips — restart the dev server and re-run `npm run screenshots` until all 46 pages are present.

> Dynamic pages (blog / form / theme detail, editor) render against seeded demo content: a published blog post, a "Contact us" form with submissions, and the default theme set.

## Contents

- [Public & Auth](#public-auth) (15)
- [Block / Page Editor](#block-page-editor) (1)
- [Dashboard (core)](#dashboard-core) (6)
- [Blog management](#blog-management) (7)
- [Page management](#page-management) (3)
- [Themes](#themes) (4)
- [Plugins — Form Builder & Menu Redirect](#plugins-form-builder-menu-redirect) (10)

## Public & Auth

### 1. Home

![Home](./01-public-home-dark.png)

### 2. Login

![Login](./02-public-login-dark.png)

### 3. Onboarding

![Onboarding](./03-public-onboarding-dark.png)

### 4. Admin Setup

![Admin Setup](./04-public-admin-setup-dark.png)

### 5. Language

![Language](./05-public-language-dark.png)

### 6. Mongodb Setup

![Mongodb Setup](./06-public-mongodb-setup-dark.png)

### 7. Mongodb Database Setup

![Mongodb Database Setup](./07-public-mongodb-database-setup-dark.png)

### 8. Blog Index

![Blog Index](./08-public-blog-index-dark.png)

### 9. Blog Post

![Blog Post](./09-public-blog-post-dark.png)

### 10. Blogs Listing

![Blogs Listing](./10-public-blogs-listing-dark.png)

### 11. Public Page

![Public Page](./11-public-public-page-dark.png)

### 12. Public Form

![Public Form](./12-public-public-form-dark.png)

### 13. Preview

![Preview](./13-public-preview-dark.png)

### 14. Doc

![Doc](./14-public-doc-dark.png)

### 15. Default Theme Layouts

![Default Theme Layouts](./15-public-default-theme-layouts-dark.png)

## Block / Page Editor

### 16. Block Page Editor

![Block Page Editor](./16-editor-block-page-editor-dark.png)

## Dashboard (core)

### 17. Dashboard Home

![Dashboard Home](./17-dashboard-dashboard-home-dark.png)

### 18. Ai Settings

![Ai Settings](./18-dashboard-ai-settings-dark.png)

### 19. Analytics

![Analytics](./19-dashboard-analytics-dark.png)

### 20. Profile

![Profile](./20-dashboard-profile-dark.png)

### 21. Settings

![Settings](./21-dashboard-settings-dark.png)

### 22. Users

![Users](./22-dashboard-users-dark.png)

## Blog management

### 23. Blogs All

![Blogs All](./23-blogs-blogs-all-dark.png)

### 24. Blog New

![Blog New](./24-blogs-blog-new-dark.png)

### 25. Blog Edit

![Blog Edit](./25-blogs-blog-edit-dark.png)

### 26. Blog Categories

![Blog Categories](./26-blogs-blog-categories-dark.png)

### 27. Blog Tags

![Blog Tags](./27-blogs-blog-tags-dark.png)

### 28. Blog Design

![Blog Design](./28-blogs-blog-design-dark.png)

### 29. Blog Layout

![Blog Layout](./29-blogs-blog-layout-dark.png)

## Page management

### 30. Pages All

![Pages All](./30-pages-pages-all-dark.png)

### 31. Pages Headers

![Pages Headers](./31-pages-pages-headers-dark.png)

### 32. Pages Footers

![Pages Footers](./32-pages-pages-footers-dark.png)

## Themes

### 33. Themes All

![Themes All](./33-themes-themes-all-dark.png)

### 34. Theme Builder New

![Theme Builder New](./34-themes-theme-builder-new-dark.png)

### 35. Theme Add

![Theme Add](./35-themes-theme-add-dark.png)

### 36. Theme Detail

![Theme Detail](./36-themes-theme-detail-dark.png)

## Plugins — Form Builder & Menu Redirect

### 37. Plugins Home

![Plugins Home](./37-plugins-plugins-home-dark.png)

### 38. Form Builder List

![Form Builder List](./38-plugins-form-builder-list-dark.png)

### 39. Form Builder New

![Form Builder New](./39-plugins-form-builder-new-dark.png)

### 40. Form Builder Edit

![Form Builder Edit](./40-plugins-form-builder-edit-dark.png)

### 41. Form Builder Analytics

![Form Builder Analytics](./41-plugins-form-builder-analytics-dark.png)

### 42. Form Builder Submissions

![Form Builder Submissions](./42-plugins-form-builder-submissions-dark.png)

### 43. Menu Redirect Home

![Menu Redirect Home](./43-plugins-menu-redirect-home-dark.png)

### 44. Menu Redirect Editor

![Menu Redirect Editor](./44-plugins-menu-redirect-editor-dark.png)

### 45. Menu Redirect Analytics

![Menu Redirect Analytics](./45-plugins-menu-redirect-analytics-dark.png)

### 46. Menu Redirect History

![Menu Redirect History](./46-plugins-menu-redirect-history-dark.png)

