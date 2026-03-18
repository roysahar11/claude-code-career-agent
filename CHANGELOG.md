# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-03-18

Initial public release.

### Skills
- `/setup` — Guided onboarding that builds your profile through conversation
- `/daily-job-fetch` — Full pipeline: fetch from multiple sources, scan, report, draft applications
- `/customize-resume` — Tailored resume generation with auto-layout optimization and PDF rendering
- `/quick-apply` — Autonomous batch application drafting with WhatsApp delivery
- `/scan-jobs` — Two-pass job evaluation: relevance judgment + resume scoring
- `/linkedin-job-fetch` — LinkedIn job extraction via browser automation
- `/personal-note` — Cover letters grounded in documented experience
- `/publish` — Contribute improvements back with automatic PII sanitization

### Agents
- `job-fetcher` — Multi-source job collection (LinkedIn, WhatsApp, Chrome sources)
- `job-description-fetcher` — Two-tier description retrieval with content validation and language detection
- `scan-jobs` — Profile-based relevance analysis with resume scoring
- `quick-apply-batch` — Batch resume customization with quality iteration

### Scripts
- `merge-pipeline.js` — Multi-source merge with location-aware deduplication
- `create-quick-apply-batches.js` — Batch creation with multi-location grouping
- `filter-by-urls.js` — URL-based pipeline filtering
- Web scrapers: Secret Tel Aviv (RSS), Arbeitnow (API), SimplifyJobs (GitHub)

### Infrastructure
- Profile system: context, experience, preferences, evaluation criteria, resume preferences, coaching notes
- Config system: user identity, search parameters, source configuration
- Application tracking via directory structure with status files
- Resume rendering pipeline: JSON → HTML → auto-fit → PDF
