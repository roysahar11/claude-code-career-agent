# Claude Code Career Agent

An AI-powered job search automation system built with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). It orchestrates daily job scanning, resume customization, relevance analysis, and application drafting — all managed by an AI agent that acts as your job search partner.

## What It Does

- **Daily job scanning** from multiple sources (LinkedIn, WhatsApp groups, web scrapers, job boards)
- **Automated relevance filtering** — AI evaluates each job against your profile and preferences
- **Resume customization** — generates tailored resumes for each job from your base resume
- **Batch applications** — processes multiple jobs autonomously with quality review
- **WhatsApp notifications** (optional) — sends summaries and draft PDFs for review
- **LinkedIn content** — helps create posts to increase visibility
- **Application tracking** — directory-based tracking with status files

## Architecture

The system is built as a set of **skills** (workflow instructions) and **agents** (specialized workers) orchestrated by Claude Code.

```
┌─────────────────────────────────────────────────┐
│                  /daily-job-fetch                │
│              (orchestrator skill)                │
├─────────┬──────────┬──────────┬─────────────────┤
│LinkedIn │ WhatsApp  │ Scrapers │ Chrome Sources   │
│ (Chrome)│(optional)│  (HTTP)  │ (AllJobs, etc.) │
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
| `/setup` | Guided onboarding — builds your profile, resumes, and search config through conversation |
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
| `scripts/filter-by-urls.js` | Marks pipeline entries as filtered by matching URLs from a file |
| `scripts/scrapers/fetch-all.js` | Runs web scrapers (see table below) |

### Web Scrapers

Built-in scrapers that run via `fetch-all.js`. Each can be individually enabled/disabled in `config/search.md`.

| Scraper | Scope | Source | Coverage |
|---------|-------|--------|----------|
| `secret-tel-aviv` | Israeli | [Secret Tel Aviv Jobs](https://jobs.secrettelaviv.com/) | Israeli tech jobs via RSS feed. English-language listings from the Tel Aviv startup ecosystem. |
| `arbeitnow` | International | [Arbeitnow API](https://www.arbeitnow.com/) | European jobs with a DACH (Germany/Austria/Switzerland) focus. Includes remote-friendly positions. |
| `simplify-jobs` | International | [SimplifyJobs GitHub](https://github.com/SimplifyJobs/New-Grad-Positions) | US new-grad and entry-level tech positions, crowdsourced and updated frequently. Filterable by category. |

## Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — the AI coding assistant that runs the skills and agents
- **Node.js** (v18+) — for scripts and resume rendering
- **[Puppeteer](https://pptr.dev/)** — for HTML-to-PDF resume conversion
- **[Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/)** (optional) — browser extension for LinkedIn scraping and Chrome-based job boards
- **WhatsApp skill** (optional) — for scanning job groups and receiving notifications. See [claude-code-whatsapp](https://github.com/roysahar11/claude-code-whatsapp) for a WAHA-based implementation, or use any WhatsApp skill that supports reading group chats and sending messages

## Getting Started

### 1. Create your repo and install

Click **"Use this template"** on GitHub to create your own copy, then:

```bash
git clone https://github.com/YOUR_USERNAME/claude-code-career-agent.git
cd claude-code-career-agent
npm install
```

### 2. Set up your profile

Open Claude Code in the project directory and run:

```
/setup
```

The agent will guide you through a conversation to build your profile, create your base resume(s), configure job search parameters, and detect any WhatsApp integration you have installed. It can import from your existing resume or LinkedIn profile to speed things up.

The `/setup` process will check if you have a WhatsApp-capable skill installed and update the `## Integrations` section in `CLAUDE.md` accordingly. Without WhatsApp, the pipeline still works — just no group scanning or WhatsApp notifications. You can install WhatsApp later and re-run `/setup` to enable it.

You can come back to `/setup` anytime to expand or update your profile.

<details>
<summary>Manual setup (alternative)</summary>

If you prefer to set up manually, copy the example files and fill in your details:

```bash
cp profile/context.example.md profile/context.md
cp profile/experience.example.md profile/experience.md
cp profile/preferences.example.md profile/preferences.md
cp profile/coaching-notes.example.md profile/coaching-notes.md
cp profile/evaluation-criteria.example.md profile/evaluation-criteria.md
cp profile/resume-preferences.example.md profile/resume-preferences.md
cp config/user.example.md config/user.md
cp config/search.example.md config/search.md
```

Edit each file following the placeholder instructions inside. Then create your base resume JSON in `Resumes/` (see `Resumes/README.md` for the schema).

</details>

### 3. Start using it

Run the full job search pipeline:

```
/daily-job-fetch
```

This fetches jobs from all configured sources, filters by relevance, generates a report, and drafts applications for matching jobs.

For individual operations:
- `/customize-resume` — tailor a resume for a specific job
- `/scan-jobs` — evaluate a batch of job postings
- `/quick-apply` — draft applications for multiple jobs

### Scheduling (optional)

By default, `/daily-job-fetch` runs manually when you invoke it. If you want to automate it on a schedule, you can create a scheduled job that launches Claude Code with the right prompt and permissions. For example:

```bash
claude \
  --permission-mode dontAsk \
  --allowedTools "Read,Glob,Grep,Task,WebFetch,WebSearch,Write,Edit,Bash,mcp__claude-in-chrome__*" \
  "Run /daily-job-fetch and quick-apply to relevant jobs. Work autonomously."
```

Wrap this in a shell script with any platform-specific setup you need (e.g., `caffeinate` on macOS to prevent sleep, waiting for external drives to mount) and trigger it with `launchd`, `cron`, or any scheduler of your choice.

## File Structure

```
claude-code-career-agent/
├── .claude/
│   ├── agents/           # Agent definitions (specialized workers)
│   ├── skills/           # Skill definitions (workflow instructions)
│   └── settings.json     # Permission rules
├── config/               # Personal config (created by /setup)
│   ├── user.md           # Your contact info and identity
│   └── search.md         # LinkedIn keywords, locations, WhatsApp groups, scraper params
├── profile/              # Personal profile (created by /setup)
│   ├── context.md        # Your story, career goals, positioning (loaded every session)
│   ├── experience.md     # Skills, work history, projects (source of truth for resumes)
│   ├── preferences.md    # Location, salary, ethical boundaries, dream industries
│   ├── evaluation-criteria.md  # Job relevance rules for scan-jobs
│   ├── resume-preferences.md   # Personal resume customization rules
│   └── coaching-notes.md       # Interview lessons (grows over time)
├── scripts/
│   ├── merge-pipeline.js         # Merge + dedup job data
│   ├── create-quick-apply-batches.js  # Batch job creator
│   └── scrapers/                 # Web scraper modules
├── templates/            # Report templates (daily fetch summary, WhatsApp digest)
├── Resumes/              # Base resume JSON files (created by /setup)
├── Applications/         # Per-job application directories (auto-created)
├── CLAUDE.md             # Project instructions for Claude Code
├── COMPLIANCE.md         # Terms of service notes
└── package.json
```

Each `config/` and `profile/` file has an `.example` template showing the expected structure. `/setup` populates them through conversation, or you can copy and edit them manually.

## How the Pipeline Works

1. **Fetch** — `job-fetcher` agent collects jobs from LinkedIn (via Chrome), WhatsApp groups (if configured), and web scrapers (HTTP APIs/RSS)
2. **Merge** — `merge-pipeline.js` normalizes all jobs to a standard schema, derives location cities, and deduplicates
3. **Pre-filter** — Claude reviews job titles and removes obviously irrelevant ones
4. **Fetch descriptions** — `job-description-fetcher` retrieves full descriptions (WebFetch first, Chrome fallback)
5. **Scan** — `scan-jobs` agent evaluates each job against your profile, skills, and preferences
6. **Report** — generates a structured report with relevant, discuss, and skip categories
7. **Quick-apply** — `quick-apply-batch` agents create draft resumes for relevant jobs in parallel
8. **Notify** — sends WhatsApp summaries with draft PDFs for review (if WhatsApp is configured)

## Roadmap

- **`/update` skill** — Pull updates from the template repo into your fork without overwriting personal files. Will handle merging new skills, agent improvements, and script updates while preserving your `profile/`, `config/`, and `Resumes/` data.

## Compliance & Disclaimer

This project includes instructions that tell Claude Code to browse certain job platforms using the Claude in Chrome extension. Some of these platforms may restrict automated access in their Terms of Service. These instructions are published for educational and personal use purposes. By using this project, you accept full responsibility for ensuring your use complies with all applicable laws and platform Terms of Service. See [COMPLIANCE.md](COMPLIANCE.md) for full details.

## License

[MIT](LICENSE)
