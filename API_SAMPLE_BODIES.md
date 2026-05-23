# API Sample Request Bodies

Use these examples as copy-ready request bodies for API users. Endpoints that read the login cookie require the user to be authenticated first.

## Authentication

### POST `/api/auth/verify-mongodb`

URI connection:

```json
{
  "mongoDB": "uri",
  "uri": "mongodb+srv://username:password@cluster0.example.mongodb.net/?retryWrites=true&w=majority"
}
```

MongoDB Atlas fields:

```json
{
  "mongoDB": "atlas",
  "username": "mongoUser",
  "password": "mongoPassword",
  "host": "abcde.mongodb.net",
  "cluster": "Cluster0"
}
```

Local MongoDB or Compass fields:

```json
{
  "mongoDB": "compass",
  "username": "mongoUser",
  "password": "mongoPassword",
  "host": "localhost:27017",
  "authMech": "DEFAULT",
  "authSource": "admin"
}
```

### POST `/api/auth/setup-databases`

URI connection:

```json
{
  "userDbName": "opennext_users",
  "pageDbName": "opennext_pages",
  "mongodbCredentials": {
    "mongoDB": "uri",
    "uri": "mongodb+srv://username:password@cluster0.example.mongodb.net/?retryWrites=true&w=majority"
  }
}
```

MongoDB Atlas fields:

```json
{
  "userDbName": "opennext_users",
  "pageDbName": "opennext_pages",
  "mongodbCredentials": {
    "mongoDB": "atlas",
    "username": "mongoUser",
    "password": "mongoPassword",
    "host": "abcde.mongodb.net",
    "cluster": "Cluster0"
  }
}
```

Local MongoDB or Compass fields:

```json
{
  "userDbName": "opennext_users",
  "pageDbName": "opennext_pages",
  "mongodbCredentials": {
    "mongoDB": "compass",
    "username": "mongoUser",
    "password": "mongoPassword",
    "host": "localhost:27017",
    "authMech": "DEFAULT",
    "authSource": "admin"
  }
}
```

### POST `/api/auth/admin`

Registers the first admin user and seeds the default home page.

```json
{
  "siteTitle": "OpenNext CMS",
  "username": "admin",
  "email": "admin@example.com",
  "password": "StrongPassword123",
  "phoneNo": "9876543210",
  "role": "SuperAdmin",
  "userDbName": "opennext_users",
  "pageDbName": "opennext_pages",
  "mongodbCredentials": {
    "mongoDB": "uri",
    "uri": "mongodb+srv://username:password@cluster0.example.mongodb.net/?retryWrites=true&w=majority"
  },
  "defaultData": [
    {
      "id": "hero-1",
      "label": "Hero Section",
      "type": "box",
      "children": [
        {
          "id": "heading-1",
          "label": "Heading",
          "type": "text",
          "content": "Welcome to OpenNext CMS"
        }
      ]
    }
  ]
}
```

### POST `/api/auth/login`

`identifier` can be an email or username.

```json
{
  "identifier": "admin@example.com",
  "password": "StrongPassword123"
}
```

### POST `/api/auth/logout`

No request body is required.

### POST `/api/auth/delete-databases`

No request body is required.

## Users And Profile

### POST `/api/sub-users/add-users`

```json
{
  "username": "editor",
  "email": "editor@example.com",
  "password": "EditorPassword123",
  "phoneNumber": "9876543211",
  "role": 2,
  "firstName": "Editor",
  "lastName": "User",
  "displayName": "Editor User",
  "active": true
}
```

### POST `/api/dashboard/profile`

Requires an authenticated cookie.

```json
{
  "username": "admin",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "nickname": "admin",
  "displayName": "Admin User",
  "website": "https://example.com",
  "bio": "Site administrator",
  "newPassword": ""
}
```

### POST `/api/dashboard/profile/upload`

Use `multipart/form-data`, not JSON.

```text
file: [image file]
userId: 665f5f83c9f3a47030bd8a10
```

### POST `/api/editor/background-upload`

Use `multipart/form-data`, not JSON.

```text
file: [jpg, png, webp, or gif image file]
```

## Settings

### POST `/api/dashboard/settings`

Requires an authenticated cookie.

```json
{
  "siteTitle": "OpenNext CMS",
  "tagline": "Build pages visually",
  "siteIcon": "site-icon.png",
  "language": "en",
  "timeZone": "Asia/Kolkata",
  "dateFormat": "F j, Y",
  "timeFormat": "g:i a",
  "activeTheme": "openNextDefault",
  "config": [
    {
      "key": "maxFileSize",
      "value": "5mb"
    }
  ]
}
```

### POST `/api/dashboard/settings/siteicon`

Use `multipart/form-data`, not JSON.

```text
file: [image file]
```

### POST `/api/dashboard/ai-settings`

Requires an authenticated cookie.

```json
{
  "openrouterApiKey": "sk-or-v1-your-api-key",
  "openrouterModel": "google/gemini-2.0-flash-001",
  "openrouterReviewModel": "google/gemini-2.0-flash-001",
  "aiMinQualityScore": 80
}
```

### POST `/api/env-connection`

```json
{
  "key": "NEXT_PUBLIC_BACKEND_URL",
  "value": "http://localhost:5000"
}
```

## Pages

### POST `/api/pages/add-page`

Requires an authenticated cookie.

```json
{
  "pageName": "About Us",
  "pageType": "page",
  "isPublished": true,
  "isHome": false,
  "preHeading": "Company",
  "description": "Learn more about our company.",
  "slug": "about-us",
  "seoName": "About Us | OpenNext CMS",
  "seoMeta": "Learn more about our company and services.",
  "component": [
    {
      "id": "heading-1",
      "label": "Heading",
      "type": "text",
      "content": "About Us"
    }
  ]
}
```

Header page:

```json
{
  "pageName": "Main Header",
  "pageType": "header",
  "isPublished": true,
  "isGlobal": true,
  "slug": "main-header",
  "component": [
    {
      "id": "navbar-1",
      "label": "Navbar",
      "type": "navbar",
      "content": "OpenNext CMS"
    }
  ]
}
```

Footer page:

```json
{
  "pageName": "Main Footer",
  "pageType": "footer",
  "isPublished": true,
  "isGlobal": true,
  "slug": "main-footer",
  "component": [
    {
      "id": "footer-text-1",
      "label": "Footer Text",
      "type": "text",
      "content": "Copyright 2026 OpenNext CMS"
    }
  ]
}
```

### PATCH `/api/pages/update-page`

Requires an authenticated cookie. Use either `pageID` or `slug`.

```json
{
  "pageID": "665f5f83c9f3a47030bd8a11",
  "pageName": "About Our Team",
  "slug": "about-us",
  "isPublished": true,
  "isHome": false,
  "seoName": "About Our Team | OpenNext CMS",
  "seoMeta": "Meet the team behind OpenNext CMS.",
  "updatedComponents": [
    {
      "id": "heading-1",
      "label": "Heading",
      "type": "text",
      "content": "About Our Team"
    }
  ]
}
```

Slug-based update:

```json
{
  "slug": "about-us",
  "description": "Updated page description",
  "isPublished": true
}
```

## Themes

### POST `/api/themes/extract`

Use `multipart/form-data`, not JSON.

```text
file: [theme zip file]
```

### POST `/api/themes/upload`

```json
{
  "folderName": "myCustomTheme"
}
```

## Plugins

### POST `/api/dashboard/plugins/install-plugin`

```json
{
  "pluginId": "contact-form",
  "name": "Contact Form",
  "version": "1.0.0",
  "description": "Adds a contact form block.",
  "author": "OpenNext",
  "icon": "mail",
  "entryPoint": "plugins/contact-form/index.js",
  "hasUpdate": false
}
```

### PATCH `/api/dashboard/plugins/toggle-plugin`

```json
{
  "pluginId": "contact-form",
  "isActive": true
}
```

### PATCH `/api/dashboard/plugins/update-plugin`

```json
{
  "pluginId": "contact-form",
  "name": "Contact Form",
  "description": "Adds a contact form block with updated settings.",
  "version": "1.0.1",
  "icon": "mail"
}
```

### POST `/api/dashboard/plugins/upload-plugin`

Use `multipart/form-data`, not JSON.

```text
file: [plugin zip file]
```

## AI Page Generation

### POST `/api/ai/generate-page-json`

Requires an authenticated cookie. Use `multipart/form-data`, not JSON.

Prompt-only generation:

```text
prompt: Build a modern pricing page with three pricing cards
pageType: page
```

Image-based generation:

```text
prompt: Recreate this landing page screenshot
pageType: page
image: [jpg, png, webp, or gif image file up to 8MB]
```

Header-only generation:

```text
prompt: Build a responsive SaaS header with logo, navigation, and CTA
pageType: header
```

Footer-only generation:

```text
prompt: Build a footer with company links, social links, and newsletter signup
pageType: footer
```

## No-Body Endpoints

These endpoints do not require a request body:

```text
GET /api/sub-users/get-users
GET /api/dashboard/settings
GET /api/dashboard/profile
GET /api/get-role
GET /api/pages/get-pages
GET /api/pages/get-page?name=about-us&key=allowMe
GET /api/dashboard/plugins/get-plugins
GET /api/dashboard
GET /api/api-sync
GET /api/verify-connection
POST /api/clear-cookies
POST /api/auth/logout
POST /api/auth/delete-databases
```
