# System Design — Diagram PNGs

Rendered from the Mermaid blocks in [`../SYSTEM_DESIGN.md`](../SYSTEM_DESIGN.md).
Source `.mmd` files live in [`src/`](./src) — re-render with:

```bash
node_modules/.bin/mmdc -i docs/diagrams/src/<name>.mmd -o docs/diagrams/<name>.png \
  -p docs/diagrams/src/puppeteer.json -b white -s 3
```

| # | Diagram | Type | PNG |
|---|---------|------|-----|
| 1 | Tenancy model (3 databases) | Flowchart | `01-1-1-tenancy-model-3-physical-databases.png` |
| 2 | Entity–Relationship diagram | ER | `02-1-2-entity-relationship-diagram.png` |
| 3 | Embedded document structures | Class | `03-1-3-embedded-document-structures.png` |
| 4 | System / structure chart | Flowchart | `04-2-1-system-structure-chart.png` |
| 5 | Domain & service layer | Class | `05-2-2-class-diagram-domain-service-layer.png` |
| 6 | Admin login (JWT) | Sequence | `06-2-3-1-admin-login-jwt-issuance.png` |
| 7 | Form submission | Sequence | `07-2-3-2-public-form-submission-with-webhook-email-spam-guard.png` |
| 8 | Blog analytics track→report | Sequence | `08-2-3-3-blog-analytics-track-then-report.png` |
| 9 | AI onboarding generation | Activity | `09-2-4-1-ai-assisted-onboarding-starter-site-generation.png` |
| 10 | Blog post lifecycle | Activity | `10-2-4-2-blog-post-lifecycle-author-publish.png` |
| 11 | BlogPost status | State | `11-2-5-1-blogpost-status.png` |
| 12 | Form status | State | `12-2-5-2-form-status.png` |
| 13 | Comment moderation | State | `13-2-5-3-comment-moderation.png` |
| 14 | Webhook delivery | State | `14-2-5-4-formsubmission-webhook-delivery.png` |
| 15 | Forms design flow | Flowchart | `15-3-3-public-form-rendered-settings-surfaces.png` |
| 16 | Report data flow | Flowchart | `16-4-4-report-data-flow.png` |
| 17 | DFD Level 0 — Context | Data Flow | `17-5-1-level-0-context-diagram.png` |
| 18 | DFD Level 1 — Major processes | Data Flow | `18-5-2-level-1-major-processes.png` |
| 19 | DFD Level 2 — Form submission | Data Flow | `19-5-3-level-2-form-submission-processing.png` |
| 20 | Use-case diagram | Use Case | `20-6-1-use-case-diagram.png` |
| 21 | Component diagram | Component | `21-6-2-component-diagram.png` |

All PNGs rendered at scale ×3 (crisp for print/slides) on a white background.
