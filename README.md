# Claude Code Career Agent

Your job search, managed by an AI agent that actually knows you.

Built on [Claude Code](https://docs.anthropic.com/en/docs/claude-code), this is a set of skills, agents, and tools that turn Claude into your career partner. It builds a deep profile of your experience, skills, and goals through conversation — then uses that context across everything it does: evaluating job opportunities against your real background (not keywords), generating tailored resumes that draw from your actual experience, scanning multiple job sources daily, and drafting applications autonomously while you sleep.

It's modular — each capability works on its own. It's extensible — you can customize anything or build new capabilities through conversation. And it's honest — it will tell you when a job isn't a good fit, push back on your assumptions, and call out when you're keeping too many options open.

## What You Can Do

### Evaluate Jobs Intelligently

Give the agent job postings and it evaluates each one against your full profile — skills, experience level, career goals, location preferences, visa implications, and ethical boundaries. It uses a two-pass analysis: first judging relevance (is this worth your time?), then scoring your existing resumes against the role to recommend which one to start from.

This isn't keyword matching. The agent reads your `evaluation-criteria.md` — rules you define about how flexible to be on experience requirements, when a "stretch" role is still worth pursuing, how to assess international opportunities and visa pathways, and what "foot in the door" opportunities look like. It classifies jobs as Relevant, Discuss (worth a conversation), or Skip — and always errs on the side of Discuss over Skip, because the cost of missing a good opportunity is higher than reviewing an extra posting.

```
Here, check this out: https://example.com/jobs/senior-devops-engineer
```

```
I found these 5 jobs, scan them for me:
https://...
https://...
```

### Build and Customize Resumes

The agent maintains your base resumes as structured JSON and generates tailored versions for specific roles. It draws exclusively from your documented experience — every claim is traceable to your profile, and your profile explicitly marks what each experience IS and IS NOT to prevent inflation.

For each role, it reorders sections by relevance, highlights keywords from the job posting, adjusts your summary, and adds or removes content to keep it to one page. The rendering pipeline auto-optimizes layout — adjusting font sizes and column widths to fill the page without overflow — and produces a polished PDF.

You iterate through conversation: adjust emphasis, reword bullets, change what's highlighted, until it's right.

```
/customize-resume
```

### Apply to Jobs in Bulk

The agent processes multiple jobs autonomously — selecting the best base resume for each, customizing content, generating PDFs, and sending each draft to your WhatsApp with the job link and match score for review. It iterates on its own work (v1, v2, v3) to meet quality standards before sending.

```
/quick-apply
```

### Fetch Jobs from Multiple Sources

The agent pulls job listings from multiple configurable sources, each with its own fetching strategy:

| Source | Method | What It Covers |
|--------|--------|----------------|
| LinkedIn | Browser automation via [Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/) | Keyword + location searches with experience-level filtering, sorted by relevance with intelligent pagination stopping |
| WhatsApp groups | Optional [WhatsApp skill](https://github.com/roysahar11/claude-code-whatsapp) | Reads job group history, parses text posts, downloads and extracts PDFs/DOCX attachments, vision-parses job flyers |
| Chrome job boards | Browser automation | AllJobs, Built In Israel, Wellfound — navigates and extracts listings |
| [Secret Tel Aviv Jobs](https://jobs.secrettelaviv.com/) | RSS feed | Israeli tech startup ecosystem |
| [Arbeitnow](https://www.arbeitnow.com/) | REST API | European tech jobs, DACH focus, with remote-friendly positions |
| [SimplifyJobs](https://github.com/SimplifyJobs/New-Grad-Positions) | GitHub raw JSON | US new-grad and entry-level tech, crowdsourced |

Sources are modular — enable or disable any of them, configure keywords and locations, or add your own.

### Run the Full Daily Pipeline

Connect all capabilities into an automated end-to-end flow:

```
/daily-job-fetch
```

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
           (fetch + validate + language detect)
                     │
                scan-jobs
           (two-pass relevance analysis)
                     │
          ┌──────────┴──────────┐
          │   quick-apply       │
          │  (batch resume      │
          │   customization)    │
          └─────────────────────┘
```

The pipeline fetches from all configured sources, merges and deduplicates (location-aware, URL-normalized), fetches full job descriptions with content validation and language detection, filters out high-applicant postings, evaluates every remaining job against your profile, generates a report, drafts tailored resumes for relevant matches, and sends everything to your WhatsApp for review.

It runs manually when you invoke it, or you can schedule it to run autonomously (see [Scheduling](#scheduling-optional)).

### Beyond the Built-In Tools

The agent holds your full professional context — your career story, detailed skills inventory, work history, goals, preferences, strengths, and lessons learned from past interviews. That makes it useful for things that aren't explicitly programmed:

- **Career strategy** — "What types of roles should I be targeting?" / "Is this career pivot realistic?"
- **Interview preparation** — It knows your story, what gets positive reactions, and where you tend to struggle. It has your coaching notes.
- **Professional writing** — Cover letters, LinkedIn messages to recruiters, follow-up emails — all grounded in your actual experience
- **Self-assessment** — "What are my strongest selling points for DevOps roles?" / "Where are my gaps?"

It's Claude Code — it's a conversation. Ask anything about your career and it uses everything it knows about you to help.

## Make It Yours

This repo is a starting point. It's built as a set of **instructions** (skills, agents, profile data) on top of Claude Code — which means you can extend it in any direction:

- **Add job sources** — write a scraper, point the agent at a new site, connect a new API
- **Create new skills** — a networking outreach workflow, a salary negotiation prep, an interview simulator
- **Customize existing tools** — change how resumes are formatted, adjust evaluation criteria, modify the pipeline
- **Build entirely new capabilities** — the agent has your context and Claude Code's full toolset

Skills and agents are markdown files with instructions. There's no framework to learn — describe what you want and Claude Code builds it.

**Built something useful? Share it back.** If you create a new scraper, skill, or workflow that others could benefit from, consider contributing it to this repo. The more people build on this, the more powerful it becomes for everyone. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.

## Getting Started

### Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — the AI coding assistant that powers everything
- **Node.js** (v18+) — for scripts and resume rendering
- **[Puppeteer](https://pptr.dev/)** — for HTML-to-PDF resume conversion
- **[Claude in Chrome](https://chromewebstore.google.com/detail/claude-in-chrome/)** (optional) — for LinkedIn and Chrome-based job boards
- **WhatsApp skill** (optional) — for scanning job groups and receiving notifications. See [claude-code-whatsapp](https://github.com/roysahar11/claude-code-whatsapp)

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

The agent guides you through a conversation to build your professional profile — your experience, skills, career goals, preferences, and ethical boundaries. It can import from your existing resume or LinkedIn profile. From there it creates your base resume(s), drafts evaluation criteria for job scanning, and configures your search parameters.

You can come back to `/setup` anytime to expand or update your profile.

<details>
<summary>Manual setup (alternative)</summary>

Copy the example files and fill in your details:

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

Each capability works independently:

```
/scan-jobs           — evaluate job postings against your profile
/customize-resume    — tailor a resume for a specific job
/quick-apply         — draft applications for multiple jobs
/daily-job-fetch     — run the full pipeline end-to-end
```

Or just talk to it — paste a job URL, ask for career advice, discuss your resume strategy. It's a conversation.

### Scheduling (optional)

To run `/daily-job-fetch` on a schedule, create a scheduled job that launches Claude Code:

```bash
claude \
  --permission-mode dontAsk \
  --allowedTools "Read,Glob,Grep,Task,WebFetch,WebSearch,Write,Edit,Bash,mcp__claude-in-chrome__*" \
  "Run /daily-job-fetch and quick-apply to relevant jobs. Work autonomously."
```

Wrap this in a shell script and trigger it with `launchd`, `cron`, or any scheduler.

## How It's Built

The system is a set of **skills** (workflow instructions), **agents** (specialized workers), and **scripts** (data processing) orchestrated by Claude Code.

### Skills

| Skill | What It Does |
|-------|-------------|
| `/setup` | Builds your professional profile, base resumes, evaluation criteria, and search config through guided conversation |
| `/daily-job-fetch` | Orchestrates the full pipeline — spawns agents for fetching, description retrieval, relevance scanning, and batch resume drafting |
| `/customize-resume` | Tailors a resume for a specific role: selects base, customizes content from your profile, highlights job-relevant keywords, auto-optimizes layout, renders PDF |
| `/quick-apply` | Processes jobs autonomously — customizes resumes, self-reviews each draft, sends PDFs to WhatsApp with job links and match scores |
| `/scan-jobs` | Two-pass job evaluation: relevance judgment against your profile, then resume scoring across all your base resumes |
| `/linkedin-job-fetch` | Searches LinkedIn by keyword/location, handles DOM virtualization with native scrolling, persists data across page navigations, saves results to JSON |
| `/personal-note` | Writes cover letters grounded in your documented experience — maps your skills to job requirements, includes genuine personal connection only when documented |

### Agents

| Agent | Role |
|-------|------|
| `job-fetcher` | Collects jobs from LinkedIn, WhatsApp (including image/PDF parsing), and Chrome-based job boards into standardized JSON |
| `job-description-fetcher` | Retrieves full descriptions with content validation (title/company match), language detection, and applicant count extraction. Two-tier: WebFetch first, Chrome fallback |
| `scan-jobs` | Reads your full profile, evaluates each job in two passes (relevance → resume scoring), outputs verdicts with reasoning |
| `quick-apply-batch` | Creates draft resumes for a batch of pre-screened jobs, iterating on quality (v1→v2→v3), with per-job WhatsApp delivery |

### Scripts

| Script | What It Does |
|--------|-------------|
| `merge-pipeline.js` | Merges jobs from all sources into master pipeline JSONs. Location-aware deduplication, URL normalization, city extraction |
| `create-quick-apply-batches.js` | Groups multi-location postings, splits jobs into batches with full context (verdict, reasoning, best resume, description) |
| `filter-by-urls.js` | Pre-filters pipeline entries by URL match — used for title-based filtering before LLM evaluation |
| `scrapers/fetch-all.js` | Runs web scrapers in parallel with per-scraper error isolation. Tracks last-fetch timestamps to avoid re-processing |

## File Structure

```
claude-code-career-agent/
├── .claude/
│   ├── agents/           # Specialized worker definitions
│   ├── skills/           # Workflow instruction sets
│   └── settings.json     # Permission rules
├── config/
│   ├── user.md           # Contact info, links, citizenships
│   └── search.md         # Keywords, locations, sources, filtering thresholds
├── profile/
│   ├── context.md        # Your story, goals, positioning (loaded every session)
│   ├── experience.md     # Full skills inventory, work history, projects — with explicit scope markers
│   ├── preferences.md    # Location, salary, boundaries, dream industries
│   ├── evaluation-criteria.md  # Rules for job relevance: experience flexibility, visa assessment, "foot in door" logic
│   ├── resume-preferences.md   # Personal resume rules: always-highlight skills, regional sections, transferable skills framing
│   └── coaching-notes.md       # Interview strengths, lessons learned, behavioral patterns to watch
├── scripts/
│   ├── merge-pipeline.js
│   ├── create-quick-apply-batches.js
│   └── scrapers/
├── templates/            # Report templates (daily summary, WhatsApp digest)
├── Resumes/              # Base resume JSONs (created by /setup)
├── Applications/         # Per-job directories with drafts, finals, and status tracking
├── CLAUDE.md             # Project instructions for Claude Code
├── COMPLIANCE.md         # Terms of service notes
└── package.json
```

Each `config/` and `profile/` file has an `.example` template showing the expected structure.

## Roadmap

- **`/update` skill** — Pull updates from the template repo into your fork without overwriting personal files

## Compliance & Disclaimer

This project includes instructions that tell Claude Code to browse certain job platforms using the Claude in Chrome extension. Some platforms may restrict automated access in their Terms of Service. These instructions are published for educational and personal use purposes. By using this project, you accept full responsibility for ensuring your use complies with all applicable laws and platform Terms of Service. See [COMPLIANCE.md](COMPLIANCE.md) for details.

## License

[MIT](LICENSE)
