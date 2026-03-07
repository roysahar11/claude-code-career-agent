# AI Job Agent

An AI-powered job search automation system built with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). It orchestrates daily job scanning, resume customization, relevance analysis, and application drafting — all managed by an AI agent that acts as your job search partner.

## What It Does

- **Daily job scanning** from multiple sources (LinkedIn, WhatsApp groups, web scrapers, job boards)
- **Automated relevance filtering** — AI evaluates each job against your profile and preferences
- **Resume customization** — generates tailored resumes for each job from your base resume
- **Batch applications** — processes multiple jobs autonomously with quality review
- **WhatsApp notifications** — sends summaries and draft PDFs for review
- **LinkedIn content** — helps create posts to increase visibility
- **Application tracking** — directory-based tracking with status files

## Architecture

The system is built as a set of **skills** (workflow instructions) and **agents** (specialized workers) orchestrated by Claude Code.

```
┌─────────────────────────────────────────────────┐
│                  /daily-job-fetch                │
│              (orchestrator skill)                │
├─────────┬──────────┬──────────┬─────────────────┤
│LinkedIn │ WhatsApp │ Scrapers │ Chrome Sources   │
│ (Chrome)│  (WAHA)  │  (HTTP)  │ (AllJobs, etc.) │
└────┬────┴────┬─────┴────┬────┴────────┬────────┘
     └─────────┴──────────┴─────────────┘
                     │
              merge-pipeline.js
              (normalize + dedup)
                     │
           job-description-fetcher
           (WebFetch + Chrome fallback)
                     │
                scan-jobs
           (relevance analysis)
                     │
          ┌──────────┴──────────┐
          │   quick-apply       │
          │  (batch resume      │
          │   drafting)         │
          └─────────────────────┘
```

### Skills

| Skill | Description |
|-------|-------------|
| `/daily-job-fetch` | Orchestrates the full pipeline: fetch → merge → scan → report → quick-apply |
| `/customize-resume` | Creates tailored resumes from a base template for specific job postings |
| `/quick-apply` | Autonomous batch application drafting with WhatsApp notifications |
| `/scan-jobs` | Evaluates job relevance against your profile and preferences |
| `/linkedin-job-fetch` | Extracts job listings from LinkedIn via Chrome automation |
| `/personal-note` | Writes cover letters and personal notes for applications |

### Agents

| Agent | Role |
|-------|------|
| `job-fetcher` | Fetches jobs from LinkedIn, WhatsApp, and Chrome sources |
| `job-description-fetcher` | Retrieves full job descriptions with WebFetch + Chrome fallback |
| `scan-jobs` | Analyzes job postings for relevance (standalone or pipeline mode) |
| `quick-apply-batch` | Processes batches of applications autonomously |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/merge-pipeline.js` | Merges jobs from all sources, normalizes, deduplicates |
| `scripts/create-quick-apply-batches.js` | Splits relevant jobs into batches for parallel processing |
| `scripts/scrapers/fetch-all.js` | Runs web scrapers (Arbeitnow, SimplifyJobs, Secret Tel Aviv) |

## Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — the AI coding assistant that runs the skills and agents
- **[Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/)** — browser extension for LinkedIn scraping and Chrome-based job boards
- **Node.js** (v18+) — for scripts and resume rendering
- **[Puppeteer](https://pptr.dev/)** — for HTML-to-PDF resume conversion
- **[WAHA](https://waha.devlike.pro/)** (optional) — self-hosted WhatsApp API for group scanning and notifications

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/roysahar11/ai-job-agent.git
cd ai-job-agent
npm install
```

### 2. Configure your profile

Copy the example files and fill in your details:

```bash
# Profile files
cp profile/context.example.md profile/context.md
cp profile/experience.example.md profile/experience.md
cp profile/preferences.example.md profile/preferences.md
cp profile/coaching-notes.example.md profile/coaching-notes.md
cp profile/evaluation-criteria.example.md profile/evaluation-criteria.md

# Config files
cp config/user.example.md config/user.md
cp config/search.example.md config/search.md
```

Edit each file following the placeholder instructions inside. The system reads these files to understand your background, skills, and job search preferences.

### 3. Create base resumes

Create your base resume JSON files in `Resumes/`. See `Resumes/README.md` for the JSON schema. You'll need at least one base resume (e.g., `Resumes/base-primary.json`).

### 4. Start using it

Open Claude Code in the project directory and start with:

```
/daily-job-fetch
```

This runs the full pipeline: fetching jobs → filtering → scanning relevance → generating a report → drafting applications.

For individual operations:
- `/customize-resume` — tailor a resume for a specific job
- `/scan-jobs` — evaluate a batch of job postings
- `/quick-apply` — draft applications for multiple jobs

## File Structure

```
ai-job-agent/
├── .claude/
│   ├── agents/           # Agent definitions (specialized workers)
│   ├── skills/           # Skill definitions (workflow instructions)
│   └── settings.json     # Permission rules
├── config/
│   ├── user.md           # Your contact info (from user.example.md)
│   └── search.md         # Search parameters (from search.example.md)
├── profile/
│   ├── context.md        # Your background story (from context.example.md)
│   ├── experience.md     # Skills and experience (from experience.example.md)
│   ├── preferences.md    # Job preferences (from preferences.example.md)
│   ├── coaching-notes.md # Interview lessons (from coaching-notes.example.md)
│   └── evaluation-criteria.md  # Job relevance rules
├── scripts/
│   ├── merge-pipeline.js         # Merge + dedup job data
│   ├── create-quick-apply-batches.js  # Batch job creator
│   └── scrapers/                 # Web scraper modules
├── Resumes/              # Base resume JSON files
├── Applications/         # Per-job application directories (auto-created)
├── CLAUDE.md             # Project instructions for Claude Code
├── COMPLIANCE.md         # Terms of service notes
└── package.json
```

## How the Pipeline Works

1. **Fetch** — `job-fetcher` agent collects jobs from LinkedIn (via Chrome), WhatsApp groups (via WAHA), and web scrapers (HTTP APIs/RSS)
2. **Merge** — `merge-pipeline.js` normalizes all jobs to a standard schema, derives location cities, and deduplicates
3. **Pre-filter** — Claude reviews job titles and removes obviously irrelevant ones
4. **Fetch descriptions** — `job-description-fetcher` retrieves full descriptions (WebFetch first, Chrome fallback)
5. **Scan** — `scan-jobs` agent evaluates each job against your profile, skills, and preferences
6. **Report** — generates a structured report with relevant, discuss, and skip categories
7. **Quick-apply** — `quick-apply-batch` agents create draft resumes for relevant jobs in parallel
8. **Notify** — sends WhatsApp summaries with draft PDFs for review

## Configuration

### `config/user.md`
Your identity — name, email, phone, LinkedIn/GitHub links, work authorization details.

### `config/search.md`
Search parameters — LinkedIn keywords and locations, Chrome source URLs, WhatsApp group IDs, scraper categories, schedule, and filtering thresholds.

### `profile/context.md`
Your professional narrative — loaded every session. Includes your story, skills summary, career goals, and positioning.

### `profile/experience.md`
Detailed skills with proficiency levels, project descriptions, and work history. The source of truth for resume generation.

### `profile/preferences.md`
Location, salary, work setup preferences, ethical boundaries, and dream industries.

### `profile/evaluation-criteria.md`
Rules for how `scan-jobs` evaluates job relevance — experience flexibility, degree requirements, international assessment criteria.

## Compliance

See [COMPLIANCE.md](COMPLIANCE.md) for notes on terms of service compliance. Some sources (LinkedIn, AllJobs) are accessed via Chrome browser automation — review the compliance notes before use.

## License

[MIT](LICENSE)
