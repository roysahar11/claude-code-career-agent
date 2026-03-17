---
name: daily-job-fetch
description: Orchestrate daily job scanning from multiple sources (LinkedIn + WhatsApp + web scrapers), filter by relevance, and generate a report. Use for daily job fetch, autonomous job scanning.
---

# Daily Job Fetch

Orchestrates daily job scanning from multiple sources, filters by relevance, and generates a report. Covers both local and international opportunities.

**Context management**: This skill is a thin orchestrator. You are not supposed to read job descriptions or large text blobs into your context, to avoid context overload — you only pass data between the subagents, and use `jq` to extract compact metadata (titles, URLs, verdicts, counts) that's needed for your work. Full data lives in files passed between agents, each with fresh context.

## Agent Execution Rules

Custom agents (`.claude/agents/`) do NOT receive MCP tools at runtime — known Claude Code platform limitation. This creates two spawning paths:

**Agents that need Chrome (MCP tools)**: Spawn as `general-purpose` — a built-in agent type that inherits MCP tools. Since `general-purpose` can't natively load custom agent definitions or their frontmatter skills, you must instruct the agent to manually read both the agent definition and any required skill files:
```
Read and follow the agent instructions at .claude/agents/{agent-name}/agent.md.
This agent requires skills that aren't auto-loaded. Read these skill files and follow their instructions when referenced:
- {path to skill SKILL.md}
Then: {actual task}
```
Skill paths: project skills at `.claude/skills/{name}/SKILL.md`, global skills at `~/.claude/skills/{name}/SKILL.md`.

**Agents that don't need Chrome**: Spawn using their custom subagent type (e.g., `scan-jobs`, `quick-apply-batch`). The agent definition and frontmatter skills load natively — no manual skill-loading needed.

**Foreground vs Background**: Background agents cannot access `mcp__claude-in-chrome__*` tools, so Chrome-dependent agents run in **foreground** only. Others can run in background.

| Agent | Needs Chrome? | Subagent type | Model | Run in... |
|-------|--------------|---------------|-------|-----------|
| `job-fetcher` | Yes | `general-purpose` | `sonnet` | Foreground |
| `job-description-fetcher` | Yes | `general-purpose` | `sonnet` | Foreground |
| `scan-jobs` | No (pipeline mode) | `scan-jobs` | (agent default) | Background OK |
| Quick-apply batch agents | No | `quick-apply-batch` | (agent default) | Background OK |

When two agents both need Chrome, run them sequentially. Non-Chrome agents can run in parallel.

## Modes: Automated vs Manual

### Automated Mode
Triggered when the prompt says "automated" (e.g., from launchd/shell script).
- **Sources**: Headless only — WhatsApp groups + web scrapers. No LinkedIn, no Chrome.
- **Time window**: Read from `state/last-automated-fetch`. Cap at 86400s (24h).
- **On success**: Update `state/last-automated-fetch` with start timestamp.
- **Chrome**: Not used. Tell job-fetcher to skip LinkedIn/Chrome. Tell description-fetcher to use WebFetch only.

### Manual Mode (default)
- **Sources**: All — LinkedIn local + international, WhatsApp groups, web scrapers, Chrome sources.
- **Time window**: Read from `state/last-manual-fetch`. Cap at 86400s (24h). User can override.
- **On success**: Update `state/last-manual-fetch` with start timestamp.

### Time Window Calculation
1. Read the appropriate state file
2. `SECONDS = current_epoch - file_contents` (cap at 86400)
3. If file missing or empty, default to 86400

## Autonomous Mode

When running autonomously, use `/whatsapp autonomous` for all WhatsApp operations:
```
/whatsapp autonomous send-message --phone "{PHONE}" --message "..."
```
Where `{PHONE}` is the self-chat phone number from `config/user.md`.

## Process

### Step 0: Save Start Timestamp + Verify Chrome

Save the current epoch before any fetching — the next run's time window picks up from this point, not from when post-processing finishes.

```bash
date +%s > /tmp/daily-fetch-start-ts
```

**Verify Chrome (Manual Mode Only)**: Call `tabs_context_mcp` before spawning any Chrome-dependent agents.
- If it succeeds → Chrome is available. Proceed with manual mode.
- If it fails → Chrome is unavailable. Fall back to automated/WebFetch-only mode for all agents, regardless of the mode setting.

### Step 0b: Read Search Config

Read `config/search.md` and extract:
1. **International scope**: `## Scope` → `International: true|false`. Default: `true` if not present.
2. **Disabled scrapers**: `## Scrapers` table → collect scraper names where `Enabled` is `false`. Build a comma-separated list (e.g., `"arbeitnow,simplify-jobs"`).
3. **SimplifyJobs categories**: from `## Web Scrapers` → `### SimplifyJobs` → `Relevant categories`.

These values are used throughout the pipeline:
- If international is `false`: skip international scrapers, LinkedIn international, international pipeline in Steps 1-5.
- If any scrapers are disabled: pass `--disabled "{LIST}"` to `fetch-all.js`.

### Step 1: Fetch Jobs

Run Step 1a and 1b in parallel where possible (scrapers don't need Chrome).

**Step 1a: Web scrapers** (both modes):

```bash
node scripts/scrapers/fetch-all.js --scope israeli --since {CUTOFF_EPOCH} {DISABLED_FLAG}
```

If international is enabled:
```bash
node scripts/scrapers/fetch-all.js --scope international --since {CUTOFF_EPOCH} --simplify-categories "{CATEGORIES}" {DISABLED_FLAG}
```

Where:
- `CUTOFF_EPOCH = current_epoch - SECONDS` (the time window start as an epoch timestamp)
- `{DISABLED_FLAG}` = `--disabled "{LIST}"` if any scrapers are disabled, omitted otherwise
- `{CATEGORIES}` = SimplifyJobs categories from config

Output files: `/tmp/scraped-jobs-israeli-{DATE}.json`, `/tmp/scraped-jobs-international-{DATE}.json` (international only if enabled)

**Step 1b: Job-fetcher agent** (foreground — needs Chrome in manual mode):

Spawn as `general-purpose` with `model="sonnet"`.

**Automated mode:**
```
Read and follow the agent instructions at .claude/agents/job-fetcher/agent.md.
This agent requires skills that aren't auto-loaded. Read these skill files and follow their instructions when referenced:
- ~/.claude/skills/whatsapp/SKILL.md
Then: Fetch jobs from WhatsApp groups only (skip LinkedIn and Chrome sources). Time window: {SECONDS} seconds.
```

**Manual mode:**
```
Read and follow the agent instructions at .claude/agents/job-fetcher/agent.md.
This agent requires skills that aren't auto-loaded. Read these skill files and follow their instructions when referenced:
- ~/.claude/skills/whatsapp/SKILL.md
- .claude/skills/linkedin-job-fetch/SKILL.md
Then: Fetch jobs from LinkedIn ({LINKEDIN_SCOPES}), WhatsApp groups, and Chrome sources. Time window: {SECONDS} seconds.
```

Where `{LINKEDIN_SCOPES}` = "local + International" if international is enabled, "local only" otherwise.

**What it returns**: File paths and summary stats. Job data is in the files:
- `/tmp/linkedin-jobs-{DATE}.json`
- `/tmp/linkedin-jobs-intl-{DATE}.json` (only if international enabled)
- `/tmp/whatsapp-jobs-{DATE}.json`, `/tmp/chrome-israeli-jobs-{DATE}.json`

### Step 1.5: Merge + Pre-Filter

**Merge** all source files into master pipeline JSONs:

```bash
node scripts/merge-pipeline.js --date {DATE}
```

Combines sources, normalizes schema, deduplicates. Outputs `/tmp/pipeline-il-{DATE}.json` and `/tmp/pipeline-intl-{DATE}.json` (if international enabled) with a JSON summary to stdout. Missing source files are treated as empty.

**LLM Title Pre-Filter** (after merge, before description-fetching):

Review titles in each pipeline JSON to filter out roles that are **obviously irrelevant** for the user. This filter is only to remove noise, not to make judgement calls — keep anything where a reasonable reading of the description could make it relevant (when in doubt - keep it). The scan-jobs agent will later analyze and make a call with detailed context.

1. Extract titles: `jq '[.[] | {url, title, company}]' /tmp/pipeline-il-{DATE}.json`
2. Write URLs to skip to `/tmp/title-filter-urls.txt` (one per line)
3. Apply:
   ```bash
   node scripts/filter-by-urls.js --pipeline /tmp/pipeline-il-{DATE}.json --urls /tmp/title-filter-urls.txt
   ```
4. Repeat for the international pipeline (if international enabled).

### Step 2: Fetch Descriptions

Spawn `job-description-fetcher` agents (foreground, `general-purpose` with `model="sonnet"`). Run local first, then international if enabled (they share Chrome).

In automated mode, tell the agent: "No Chrome available — use WebFetch only."

```
Read and follow the agent instructions at .claude/agents/job-description-fetcher/agent.md.
Then: Fetch descriptions for jobs in /tmp/pipeline-{scope}-{DATE}.json
```

**What it does**: Adds `description`, `fetchStatus`, `language`, and `applicantCount` fields to each entry in the pipeline JSON. Filters high-applicant jobs and non-English/Hebrew postings.

**Verify** (counts only): `jq '[.[] | .fetchStatus] | group_by(.) | map({(.[0]): length}) | add' /tmp/pipeline-il-{DATE}.json`

### Step 3: Scan Jobs (Relevance Filtering)

Spawn `scan-jobs` agents per scope. No Chrome needed — can run in parallel as background tasks. Skip international if not enabled in config.

**Local:**
```
Pipeline mode: Analyze jobs in /tmp/pipeline-il-{DATE}.json for relevance to the user.
Read the user's profile from profile/context.md and profile/experience.md for context.
Update the master JSON at /tmp/pipeline-il-{DATE}.json and return only the file path + compact summary stats. Do not produce detailed markdown analysis in your response.
```

**International:**
```
Pipeline mode: Analyze jobs in /tmp/pipeline-intl-{DATE}.json for relevance to the user.
Read the user's profile from profile/context.md and profile/experience.md for context. Check config/user.md for citizenship/work authorization details relevant to international jobs.
Update the master JSON at /tmp/pipeline-intl-{DATE}.json and return only the file path + compact summary stats. Do not produce detailed markdown analysis in your response.
```

**What they return**: Verdicts added to JSON entries (RELEVANT / DISCUSS / SKIP with reasoning, bestResume, resumeScore).

**Read verdicts for the report** (compact — no descriptions):
```bash
jq '[.[] | select(.verdict) | {url, title, company, source, location, verdict, reasoning, bestResume, resumeScore}]' /tmp/pipeline-il-{DATE}.json
jq '[.[] | select(.fetchStatus == "SKIP_LANGUAGE") | {title, company, source, language}]' /tmp/pipeline-il-{DATE}.json
```

### Step 4: Generate Report

Use the `jq` output from Step 3 to compile the report. Follow the template at `templates/daily-report.md`.

Every job entry in the report — Relevant, Discuss, AND Skipped — must include a URL or source link. The user needs links to assess relevance. If a job came from WhatsApp without a URL, include the WhatsApp group name and any context for manual search.

#### Step 4b: Report Errors

If any source encountered errors, include them in the report and send the user a WhatsApp alert via `/whatsapp autonomous send-message` (phone from `config/user.md`).

### Step 5: Quick-Apply to Relevant/Discuss Jobs

**Draft detection**: Before creating batches, check each Relevant/Discuss job for existing drafts by globbing `Applications/{Company}*/{Role}*/drafts/*.pdf` and `Applications/{Company}*/{Role}*/final/*.pdf`. Skip jobs with existing drafts and note in the report.

**Create batches** (include `--master` for international only if enabled):
```bash
node scripts/create-quick-apply-batches.js \
  --master /tmp/pipeline-il-{DATE}.json \
  --master /tmp/pipeline-intl-{DATE}.json \
  --batch-size 6
```

Outputs JSON summary to stdout with batch file paths and counts.

**Spawn `quick-apply-batch` agents** for each batch (up to 4-5 in parallel, background, no Chrome needed):
```
Task(subagent_type="quick-apply-batch", prompt="Process the batch file at /tmp/quick-apply-batch-{N}-{DATE}.md. Each job has full description + verdict metadata. Create a quality draft resume for each job in the batch.")
```

### Step 5b: Send Consolidated Report to WhatsApp

After quick-apply agents finish, update the report with draft statuses and errors from quick-apply, then send to user's self-chat via `/whatsapp autonomous send-message` (phone from `config/user.md`). This is the primary deliverable — always sent. It is distinct from the per-job WhatsApp notifications that quick-apply agents send.

**Format**: Follow the WhatsApp template at `templates/daily-report-whatsapp.md`. Read it and apply its structure and guidelines.

### Step 6: Update State Timestamp

```bash
cp /tmp/daily-fetch-start-ts state/last-automated-fetch   # automated mode
# OR
cp /tmp/daily-fetch-start-ts state/last-manual-fetch      # manual mode
```

### Step 7: Commit and Push

Commit and push if there are actual changes (new Application folders, updated state files):
```bash
git add Applications/ state/ && git commit -m "Daily job fetch {DATE}: {summary}" && git push
```

## Output

- Full report displayed in conversation (local + international sections)
- WhatsApp report sent to the user with URLs for every job
- Draft resumes created for all Relevant/Discuss jobs (both pipelines)
- Changes committed and pushed
