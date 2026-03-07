---
name: daily-job-fetch
description: Orchestrate daily job scanning from multiple sources (LinkedIn + WhatsApp + web scrapers), filter by relevance, and generate a report. Use for daily job fetch, autonomous job scanning.
---

# Daily Job Fetch

Orchestrates daily job scanning from multiple sources, filters by relevance, and generates a report. Covers both Israeli and international opportunities.

**Architecture principle**: This skill is a thin orchestrator. All heavy data (descriptions, analysis) lives in files passed between agents. Use `jq` to extract only the fields you need at each step. In the normal pipeline flow, you should **not** read job descriptions or large text blobs into your context — use compact summaries and metadata only. However, if something fails and you need to debug or recover, use your judgment — reading a few entries to understand what went wrong is fine. The goal is to preserve context for the full pipeline, not to be rigid about never peeking at data.

## Agent Execution Rules

**MCP tools & custom agents**: Custom agents (defined in `.claude/agents/`) do NOT receive MCP tools at runtime — this is a known Claude Code platform limitation. Chrome-dependent agents must be spawned as `general-purpose` (a built-in agent type that inherits MCP tools) with instructions to read the custom agent's definition file.

**Pattern for Chrome-dependent agents:**
```
Task(subagent_type="general-purpose", model="sonnet", prompt="Read and follow the agent instructions at .claude/agents/{agent-name}/agent.md. Then: {actual task}")
```

**Skills for general-purpose agents**: Custom agents may declare `skills` in their frontmatter (e.g., `skills: [whatsapp, linkedin-job-fetch]`). These are **not** auto-loaded when running as `general-purpose`. The orchestrator must include explicit skill-loading instructions in the prompt. Pattern:
```
Read and follow the agent instructions at .claude/agents/{agent-name}/agent.md.
This agent requires skills that aren't auto-loaded. Read these skill files and follow their instructions when referenced:
- {path to skill 1 SKILL.md}
- {path to skill 2 SKILL.md}
Then: {actual task}
```
Skill paths: project skills at `.claude/skills/{name}/SKILL.md`, global skills at `~/.claude/skills/{name}/SKILL.md`.

**Foreground vs Background**: Agents that need Chrome browser access MUST run in the **foreground** (not background). Background agents cannot access `mcp__claude-in-chrome__*` tools.

| Agent | Needs Chrome? | Subagent type | Model | Run in... |
|-------|--------------|---------------|-------|-----------|
| `job-fetcher` | ✅ Yes | `general-purpose` | `sonnet` | **Foreground** |
| `job-description-fetcher` | ✅ Yes | `general-purpose` | `sonnet` | **Foreground** |
| `scan-jobs` | ❌ No (pipeline mode) | `scan-jobs` | (agent default) | Background OK |
| Quick-apply batch agents | ❌ No | `quick-apply-batch` | (agent default) | Background OK |

**Parallel execution**: When two agents don't need Chrome, they can run in parallel as background tasks. When Chrome is needed, run sequentially in foreground.

## Modes: Automated vs Manual

This skill runs in one of two modes based on the prompt:

### Automated Mode
Triggered when the prompt says "automated" (e.g., from launchd/shell script).
- **Sources**: Headless only — WhatsApp groups + web scrapers (HTTP-only). **No LinkedIn, no Chrome sources**.
- **Time window**: Read from `state/last-automated-fetch`. Calculate seconds since that timestamp. Cap at 86400 (24h).
- **On success**: Update `state/last-automated-fetch` with current epoch timestamp.
- **Chrome**: Not used. Tell job-fetcher to skip LinkedIn and Chrome sources. The job-description-fetcher will only use WebFetch (Tier 1), no Chrome fallback.

### Manual Mode (default)
Used for interactive `/daily-fetch` invocations.
- **Sources**: All sources — LinkedIn IL + Intl (via Chrome) + WhatsApp groups + web scrapers + Chrome-only sources (AllJobs, Built In, Wellfound).
- **Time window**: Read from `state/last-manual-fetch`. Calculate seconds since that timestamp. Cap at 86400 (24h). User can override with a custom range.
- **On success**: Update `state/last-manual-fetch` with current epoch timestamp.

### Time Window Calculation
1. Read the appropriate state file (`state/last-automated-fetch` or `state/last-manual-fetch`)
2. Calculate: `SECONDS = current_epoch - file_contents`
3. Cap at 86400 (24 hours max)
4. If file doesn't exist or is empty, default to 86400

Both modes share the same processing pipeline below. Some jobs may appear in both automated and manual runs — draft detection (Step 5) makes re-processing cheap (skip instantly).

## Process

### Step 0: Save Start Timestamp + Verify Chrome

Save the current epoch to a temp file before any fetching begins. This ensures the "last successful fetch" timestamp reflects when data was actually fetched, not when post-processing finished (which can be 20-30 minutes later). Without this, jobs posted during processing would be missed by the next run.

```bash
date +%s > /tmp/daily-fetch-start-ts
```

**Verify Chrome Access (Manual Mode Only)**

Before spawning any Chrome-dependent agents, verify Chrome is available by calling `tabs_context_mcp` yourself.

- If `tabs_context_mcp` succeeds → Chrome is available. Chrome-dependent agents will be spawned as `general-purpose` (which inherits MCP tools) with instructions to read the relevant agent.md file.
- If it fails → Chrome is unavailable. Run all agents in automated/WebFetch-only mode regardless of the mode setting.

### Step 1: Fetch Jobs (Agent + Scrapers)

**Step 1a: Run web scrapers** (both modes — all current scrapers are HTTP-only):

Read `config/search.md` to get the SimplifyJobs relevant categories, then pass them to the international scraper:

```bash
node scripts/scrapers/fetch-all.js --scope israeli --since {CUTOFF_EPOCH}
node scripts/scrapers/fetch-all.js --scope international --since {CUTOFF_EPOCH} --simplify-categories "{CATEGORIES}"
```

Where `CUTOFF_EPOCH = current_epoch - SECONDS` (the time window start) and `{CATEGORIES}` is the comma-separated list from config/search.md (e.g., `"Software,AI/ML/Data"`). Read the stdout JSON summary and the output files:
- `/tmp/scraped-jobs-israeli-{DATE}.json`
- `/tmp/scraped-jobs-international-{DATE}.json`

**Step 1b: Invoke job-fetcher** (**foreground** — needs browser automation in manual mode):

Spawn as `general-purpose` agent with `model="sonnet"` (inherits MCP Chrome tools). The agent reads its own instructions from the agent.md file.

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
Then: Fetch jobs from LinkedIn (Israel + International), WhatsApp groups, and Chrome sources (AllJobs, Built In Israel, Wellfound). Time window: {SECONDS} seconds.
```

The agent returns file paths:
- **LinkedIn IL jobs**: `/tmp/linkedin-jobs-{DATE}.json`
- **LinkedIn Intl jobs**: `/tmp/linkedin-jobs-intl-{DATE}.json` (manual mode only)
- **WhatsApp jobs**: `/tmp/whatsapp-jobs-{DATE}.json`
- **Chrome-sourced Israeli jobs**: `/tmp/chrome-israeli-jobs-{DATE}.json` (manual mode only)

**Important**: All job data is in files — the agent's response contains only paths and summary stats.

### Step 1.5: Merge + Pre-Filter → Master JSONs

Run the merge script to combine all source files into two master pipeline JSONs:

```bash
node scripts/merge-pipeline.js --date {DATE}
```

This script:
1. Reads all source files from `/tmp/` (missing files treated as empty — not an error)
2. Normalizes entries to the lean schema (`url`, `title`, `company`, `source`, `location`, `locationCity`, `description`, `notes`, `status`)
3. Sets all entries to `status: ACTIVE` (title filtering happens after merge via LLM judgment — see below)
4. Deduplicates by URL and company+title+locationCity (same role in different cities survives dedup)
5. Writes `/tmp/pipeline-il-{DATE}.json` and `/tmp/pipeline-intl-{DATE}.json`
6. Outputs JSON summary to stdout with counts

The script handles all edge cases (scraper descriptions preserved, WhatsApp attachment fields, LinkedIn/Chrome `notes` metadata). No manual intervention needed.

**LLM Title Pre-Filter** (after merge, before description-fetching):

After the merge script outputs its summary, review the titles in each pipeline JSON to filter obviously irrelevant roles before description-fetching.

1. Read titles:
   ```bash
   jq '[.[] | {url, title, company}]' /tmp/pipeline-il-{DATE}.json
   ```
2. Filter only titles where no reasonable reading of the job description could make it relevant to the user. This filter exists to remove noise, not to make judgment calls — that's scan-jobs' role. When in doubt, keep it.
3. Apply the filter — write the URLs to skip into a temp file and run:
   ```bash
   node -e "
   const fs = require('fs');
   const f = process.argv[1];
   const skip = new Set(fs.readFileSync(process.argv[2], 'utf8').trim().split('\n'));
   const d = JSON.parse(fs.readFileSync(f, 'utf8'));
   d.forEach(e => { if (skip.has(e.url)) { e.status = 'TITLE_FILTERED'; e.filterReason = 'title pre-filter'; } });
   fs.writeFileSync(f, JSON.stringify(d, null, 2));
   " /tmp/pipeline-il-{DATE}.json /tmp/title-filter-urls.txt
   ```
4. Repeat for the international pipeline.

This replaces the old regex-based filter with LLM judgment. LinkedIn already has its own title filter (linkedin-job-fetch Step 6), so this mainly catches non-LinkedIn sources.

### Step 2: Fetch Descriptions

Spawn as `general-purpose` agents with `model="sonnet"` (**foreground** — needs Chrome fallback). Run sequentially (IL then Intl) since they share Chrome.

In automated mode (no Chrome available), tell the agent explicitly: "No Chrome available — use WebFetch only."

**Israeli:**
```
Read and follow the agent instructions at .claude/agents/job-description-fetcher/agent.md.
Then: Fetch descriptions for jobs in /tmp/pipeline-il-{DATE}.json
```

**International:**
```
Read and follow the agent instructions at .claude/agents/job-description-fetcher/agent.md.
Then: Fetch descriptions for jobs in /tmp/pipeline-intl-{DATE}.json
```

Each agent reads the master JSON, adds `description` + `fetchStatus` + `language` + `applicantCount` fields, and writes back. The response contains only summary stats (e.g., "22 OK, 3 FETCH_FAILED, 2 SKIP_HIGH_APPLICANTS, 1 SKIP_LANGUAGE (German)").

**Verify results** (just counts, via jq):
```bash
jq '[.[] | .fetchStatus] | group_by(.) | map({(.[0]): length}) | add' /tmp/pipeline-il-{DATE}.json
```

### Step 3: Scan Jobs (Relevance Filtering)

Spawn scan-jobs agents per scope. These don't need Chrome in pipeline mode, so they **can run in parallel as background tasks**.

**Israeli:**
```
Pipeline mode: Analyze jobs in /tmp/pipeline-il-{DATE}.json for relevance to the user.
Update the master JSON at /tmp/pipeline-il-{DATE}.json and return only the file path + compact summary stats. Do not produce detailed markdown analysis in your response.
```

**International:**
```
Pipeline mode: Analyze jobs in /tmp/pipeline-intl-{DATE}.json for relevance to the user. Include citizenship/visa context from the profile for international job assessment.
Update the master JSON at /tmp/pipeline-intl-{DATE}.json and return only the file path + compact summary stats. Do not produce detailed markdown analysis in your response.
```

Each agent reads descriptions from the JSON (in its own fresh context), writes verdicts back. Response is just "8 ✅ RELEVANT, 5 ❌ SKIP, 2 ⚠️ DISCUSS".

**Read verdicts for report** (compact — no descriptions):
```bash
jq '[.[] | select(.verdict) | {url, title, company, source, location, verdict, reasoning, bestResume, resumeScore}]' /tmp/pipeline-il-{DATE}.json
jq '[.[] | select(.fetchStatus == "SKIP_LANGUAGE") | {title, company, source, language}]' /tmp/pipeline-il-{DATE}.json
```

### Step 4: Generate Report

Use the `jq` output from Step 3 to compile the report. This data is compact (no descriptions) and safe to read into context.

```markdown
# Daily Job Report - {DATE} {HH:MM}

## Summary
- Mode: {Automated | Manual}
- Sources: {list all sources that ran}
- Time window: {SECONDS}s (~{hours}h since last run)
- Israeli: Total X | ✅ Relevant: X | ⚠️ Discuss: X | ❌ Skipped: X
- International: Total X | ✅ Relevant: X | ⚠️ Discuss: X | ❌ Skipped: X

---

## Israeli Opportunities

### ✅ Relevant Jobs (Apply)

#### 1. {Role} @ {Company}
- **Source**: {LinkedIn | WhatsApp group | Secret Tel Aviv | etc.}
- **URL**: {direct link to job posting — MANDATORY}
- **Location**: {location}
- **Why relevant**: {reasoning from scan-jobs}
- **Best resume**: {bestResume} ({resumeScore}/100)

### ⚠️ Jobs to Discuss

#### 1. {Role} @ {Company}
- **Source**: {source}
- **URL**: {direct link — MANDATORY}
- **Location**: {location}
- **Question**: {reasoning from scan-jobs}

### ❌ Skipped
#### {Role} @ {Company}
{reasoning}

---

## International Opportunities

### ✅ Relevant Jobs (Apply)

#### 1. {Role} @ {Company}
- **Source**: {Arbeitnow | SimplifyJobs | LinkedIn Intl | etc.}
- **URL**: {direct link — MANDATORY}
- **Location**: {location}
- **Visa/relocation**: {citizenship info | Visa sponsorship offered | etc.}
- **Why relevant**: {reasoning from scan-jobs}
- **Best resume**: {bestResume} ({resumeScore}/100)

### ⚠️ Jobs to Discuss

#### 1. {Role} @ {Company}
- **Source**: {source}
- **URL**: {direct link — MANDATORY}
- **Location**: {location}
- **Question**: {reasoning from scan-jobs}

### ❌ Skipped
#### {Role} @ {Company}
{reasoning}

---

## Pre-filtered by Title (if any)
{titles that were filtered in Step 1.5, with reasons}

## 🌐 Foreign Language — Skipped (if any)
Jobs posted in a language other than English or Hebrew. These were not scanned for relevance.
- {Role} @ {Company} — {language} ({source})

## 🚫 Could Not Fetch (if any)
Jobs where description fetching failed. Any failure must be reported here, not go by quietly.
- {Role} @ {Company} - {fetchError from master JSON}

## Manual-Check Reminder
Check these sources manually (not automated):
- AllJobs email alerts
- Drushim Smart Agent
- Goozali (en.goozali.com)
- Built In Israel (builtin.com/jobs/mena/israel) — if not in manual mode
- Wellfound Israel (wellfound.com/location/israel) — if not in manual mode

## ⚠️ Other Errors (if any)
- {source}: {error description}
```

### Step 4b: Report Errors (if any)

If any source encountered errors (permission denied, Chrome not running, scraper failures, etc.):

1. Include errors in the report above
2. Use the `/whatsapp` skill to send the user a message alerting them:
   - Send to the user's self-chat (default)
   - Message: List of errors encountered and note that working sources were still processed

## Autonomous Mode

When running in autonomous mode, use `/whatsapp autonomous` for all WhatsApp operations:

```
/whatsapp autonomous send-message --phone "{PHONE}" --message "..."
```

Where `{PHONE}` is the self-chat phone number from `config/user.md`.

This:
- Skips the two-step approval (for self-chat only)
- Uses the appropriate command pattern for the environment

### Step 5: Quick-Apply to All Relevant/Discuss Jobs

**Draft detection (pre-check):** Before creating batches, check each Relevant/Discuss job for existing drafts:
1. Glob for `Applications/{Company}*/{Role}*/drafts/*.pdf` and `Applications/{Company}*/{Role}*/final/*.pdf`
2. If a match is found → **skip that job** and note in the report: "Resume draft already exists at {path}"
3. If no match → include in the batch

**Create batches** using the Node script (orchestrator does NOT read the output files):
```bash
node scripts/create-quick-apply-batches.js \
  --master /tmp/pipeline-il-{DATE}.json \
  --master /tmp/pipeline-intl-{DATE}.json \
  --batch-size 6
```

The script outputs a JSON summary to stdout:
```json
{"batches": [{"path": "/tmp/quick-apply-batch-1-{DATE}.md", "jobCount": 6}, ...], "totalJobs": 15, "batchCount": 3}
```

**Spawn `quick-apply-batch` agents** for each batch — up to 4-5 in parallel (background is fine, no Chrome needed). Skills are loaded automatically via the agent's frontmatter.
```
Task(subagent_type="quick-apply-batch", prompt="Process the batch file at /tmp/quick-apply-batch-{N}-{DATE}.md. Each job has full description + verdict metadata. Create a quality draft resume for each job in the batch.")
```

The agent creates draft resumes and sends WhatsApp notifications for each job. International jobs should be clearly labeled in the WhatsApp messages.

**Important**: The batch files contain full descriptions — the orchestrator never reads them. The Task agents have fresh context for each batch.

### Step 6: Update State Timestamp

After processing completes successfully (report generated, quick-apply done or skipped), read the start timestamp saved in Step 0 and write it to the state file:

```bash
cp /tmp/daily-fetch-start-ts state/last-automated-fetch   # automated mode
# OR
cp /tmp/daily-fetch-start-ts state/last-manual-fetch      # manual mode
```

This uses the timestamp from when fetching started (not when processing finished), so the next run's time window picks up exactly where this run's data collection left off.

### Step 7: Commit and Push

After quick-apply completes (or if skipped because there are no Relevant/Discuss jobs), commit and push all changes from this session:

```bash
git add Applications/ state/ && git commit -m "Daily job fetch {DATE}: {summary}" && git push
```

Only commit if there are actual changes (new Application folders from quick-apply, updated state files).

## Report Rules

**Every job in the WhatsApp report MUST include a direct URL or source link** — Relevant, Discuss, and Skipped alike. The user needs links to assess relevance themselves. If a job came from WhatsApp without a URL, include the WhatsApp group name and any available context (company website, job title for manual search).

## Output

- Full report displayed in conversation (Israeli + International sections)
- WhatsApp report sent with URLs for every job
- Draft resumes created for all Relevant/Discuss jobs (both pipelines)
- Changes committed and pushed
