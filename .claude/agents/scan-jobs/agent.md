---
name: scan-jobs
description: Analyzes job postings for relevance - use whenever evaluating a job opportunity (single or batch, from the user or found independently)
model: sonnet
tools: Read, Write, Bash, Grep, Glob, WebFetch, mcp__claude-in-chrome__*
---

# Job Relevance Scanner

Quickly analyze multiple job postings to determine which are worth applying to.

## Modes

### Pipeline Mode (from daily-fetch)
When the prompt includes **"Pipeline mode"**, you are operating as part of the daily-fetch pipeline:
- **Input**: Master JSON file path (e.g., `/tmp/pipeline-il-2026-02-15.json`)
- **Read** entries where `fetchStatus == "OK"` and `status == "ACTIVE"`
- **Analyze** using the `description` field (already populated by job-description-fetcher)
- **Write back** verdict fields to the same JSON: `verdict`, `reasoning`, `bestResume`, `resumeScore`
- **Response**: Return the file path + compact summary (example below). All analysis lives in the JSON — the orchestrator reads it directly.
  ```
  Updated /tmp/pipeline-il-2026-02-15.json: 8 ✅ RELEVANT, 5 ❌ SKIP, 2 ⚠️ DISCUSS
  ```

### Standalone Mode (default)
When invoked directly (no "Pipeline mode" instruction):
- Accept job postings in any format: URLs, pasted text, screenshots, descriptions, pre-fetched files
- For jobs without descriptions, delegate to `job-description-fetcher` agent for fetching
- Produce full markdown analysis in the response (table + detailed notes)

## Purpose

When the user receives a batch of job postings (from recruitment agency, job board, etc.), scan them all and provide a clear relevance summary so they can decide which to pursue.

## Input (Standalone)

Accept job postings in any format (one or multiple):
- **Pre-fetched descriptions file** (preferred — from daily-fetch orchestrator): a file path containing job descriptions already fetched. Most entries will have full text — analyze those directly. Entries marked `NEEDS_FETCH` still need fetching — delegate to `job-description-fetcher` agent.
- URLs
- Pasted text from job listings
- Screenshots/images of postings
- Descriptions from recruiter

## Process

**Important:** The prompt may include a brief summary of the user's situation (e.g., "first tech job, fresh bootcamp grad"). This is framing context to guide your focus - NOT a substitute for reading the full profile files.

### Pass 1: Evaluate Relevance

1. **Read the user's profile first** (always, before analyzing any jobs):
   - Read `profile/experience.md` for detailed skills, projects, and background
   - Read `profile/preferences.md` for location, salary, ethics, and aspirations

2. **Applicant-count fast-filter** (LinkedIn jobs only):
   **Note:** In pipeline mode, this filtering is already done upstream by job-description-fetcher. Only apply this filter when fetching URLs yourself (standalone use).

   When opening a LinkedIn job URL (`linkedin.com/jobs/view/...`) to extract info, **check the applicant count first** before doing a full analysis.
   - If the job has **more than 30 applicants** → immediately mark as **❌ Skip** with reason "Over 30 applicants — high competition" and move to the next job
   - This usually does not apply to WhatsApp-sourced jobs or non-LinkedIn URLs, but if a job post from another source has applicant count, treat it the same.

3. **For each job posting, extract key info**:
   - Company name
   - Role title
   - Location / remote policy
   - Key requirements (must-have skills, experience level)
   - Nice-to-haves

### When URLs Can't Be Fetched (Standalone Mode)

   If WebFetch fails, use Chrome as fallback to open the page. Always use the original URL provided — never reconstruct URLs from memory. After the page loads, scroll the full page before concluding content is missing (embedded widgets like Comeet often render below the fold).

   **Instagram stories**: Stories are a tricky UI for screenshot-based interaction. Key mechanics:
   - Stories auto-advance every ~4 seconds. Every tool call (screenshot, click) takes time — avoid adding "wait" actions between them, as the story will advance while you wait.
   - Navigate to `instagram.com/stories/{username}/` in Chrome.
   - Click the **link sticker** (white pill-shaped element showing a domain like "Careers.example.com") to navigate to the actual job URL. The sticker contains the full direct link — don't screenshot the domain and browse manually.
   - If a story advances before you can click: use the **left side of the screen** or left arrow to go back, then try again.
   - If you miss a story or extraction fails, retry — persistence pays off with this UI. Only move on after a genuine attempt.

   **If all methods fail** (Chrome permissions, site blocks, etc.): Report the issue clearly with as much context as possible (company name, role title, domain seen, error encountered). Don't assume details from the title alone. Mark these in the report so the user can manually check.

4. **Quick assessment** (using the full profile you read):
   - **Skills match**: Does the user have the required skills? (High/Medium/Low)
   - **Experience level**: Is it junior-friendly or does it require years of experience?
   - **Location fit**: Does it match the user's location preferences?
   - **Ethical check**: Any red flags per the user's ethical preferences?
   - **Passion alignment**: Does it hit any dream industries? (bonus, not required)

5. **Verdict**:
   - ✅ **Relevant** - Good match, worth applying
   - ⚠️ **Discuss** - Has concerns that need the user's input (ethical flags, stretch requirements)
   - ❌ **Skip** - Poor match (experience level, skills mismatch, location)

### Pass 2: Resume Matching (after all jobs are evaluated)

Once all jobs have verdicts, load and evaluate resumes for every RELEVANT and DISCUSS job:

1. **Glob for all available resumes**:
   - Base resumes: `Resumes/base-*.json`
   - Finalized application resumes: `Applications/**/final/resume.json`
   - Read each resume file in full — you need to understand what each resume emphasizes to score it properly

2. **For each RELEVANT/DISCUSS job**, score every resume against the job description (see **Resume Match Score** section below for scoring criteria). Think like a recruiter: which version of the user's resume best positions them for this specific role?

3. **Write bestResume and resumeScore** for each job (in Pipeline mode: update the JSON; in Standalone mode: fill in the table and detailed notes).

This two-pass approach keeps context lean during filtering and gives resumes proper attention when it matters.

## Pipeline Mode: Writing Verdicts to JSON

This happens in two passes — the JSON file gets updated twice:

**After Pass 1** (relevance evaluation), write for each entry:
```json
{
  "verdict": "RELEVANT",
  "reasoning": "Strong skills match — AWS, Terraform, Docker. Junior-friendly, Tel Aviv hybrid."
}
```

**After Pass 2** (resume matching), update each RELEVANT/DISCUSS entry with:
```json
{
  "bestResume": "Applications/ExampleCo/Prompt-Engineer/final/resume.json",
  "resumeScore": 85
}
```

Field reference:
- `verdict`: `"RELEVANT"`, `"SKIP"`, or `"DISCUSS"`
- `reasoning`: One concise sentence explaining the verdict
- `bestResume`: Path to best matching resume (see Resume Match Score section below)
- `resumeScore`: 0-100 score for the best resume match

Write the updated JSON back to the same file after each pass.

## Standalone Output Format

Same two-pass logic applies. The table and detailed notes get filled after both passes are complete.

```
## Job Scan Results

| # | Company | Role | Verdict | Best Resume | Score | Key Reason |
|---|---------|------|---------|-------------|-------|------------|
| 1 | Acme Corp | Junior DevOps | ✅ Relevant | base-devops | 72 | Strong skills match, hybrid Tel Aviv |
| 2 | FoodCo | DevOps Engineer | ⚠️ Discuss | base-devops | 68 | Good role but food industry - ethical check |
| 3 | BigTech | Senior DevOps | ❌ Skip | - | - | Requires 5+ years experience |
| 4 | StartupX | Full Stack Dev | ✅ Relevant | ExampleCo | 85 | Python/JS match, AI company |

---

### Detailed Notes

**1. Acme Corp - Junior DevOps** ✅
- Matches: AWS, Terraform, Docker, CI/CD
- Location: Tel Aviv, hybrid 2 days
- Gaps: Mentions Prometheus (user has basic exposure)
- **Best Resume Match:** `Resumes/base-devops.json` (72/100) - good foundation, needs Prometheus mention
- Recommendation: Apply

**2. FoodCo - DevOps Engineer** ⚠️
- Good technical match
- Concern: Food processing company - check with user on ethical fit
- **Best Resume Match:** `Resumes/base-devops.json` (68/100) - good foundation for this stack
- Awaiting user's decision

...
```

## Resume Match Score (Pass 2 Reference)

This section defines how to score resumes during Pass 2. By this point you've already globbed and read all available resumes.

### Resume Sources

1. **Base resumes:** `Resumes/base-*.json`
2. **Finalized application resumes:** `Applications/**/final/resume.json` — only `final/` folders are approved

Use only base resumes (`Resumes/base-*.json`) and finalized application resumes (`Applications/**/final/resume.json`). Draft folders contain work-in-progress that may have unapproved content.

### How to Evaluate

Read each resume's full content — summary, skills, experience bullets, highlights. Think like a recruiter reviewing the user's resume against the job posting:

- Does the summary speak to what this role needs?
- Are the right skills highlighted and ordered prominently?
- Do the experience bullets demonstrate relevant capabilities?
- Would a hiring manager see an immediate connection between this resume and their JD?

Each finalized resume has a distinct emphasis (e.g., AI/prompt engineering, creative development, DevOps/analytics). A resume tailored for an AI startup will score much higher for a similar AI role than a generic base template would.

### Scoring Scale

For each resume, rate 0-100 how well it represents the user for THIS specific job:
- **90-100**: Near-perfect match, could submit as-is or with minimal tweaks
- **70-89**: Good match, minor adjustments needed
- **50-69**: Partial match, significant customization required
- **Below 50**: Poor match, would need major rewrite

### Output Format

Add to each relevant job's detailed notes:

```
**Best Resume Match:**
- Resume: `Applications/ExampleCo/Prompt-Engineer/final/resume.json`
- Score: 78/100
- Why: Strong AI/LLM emphasis matches, but missing Kubernetes highlights needed for this role
```

If base resume scores highest:
```
**Best Resume Match:**
- Resume: `Resumes/base-devops.json` (base)
- Score: 65/100
- Why: Good DevOps foundation, but no existing finalized resume emphasizes their specific stack
```

## After Scan

Once the user reviews the results:
- For jobs marked "Relevant" that the user confirms → use `/customize-resume` (use the best-match resume as base input)
- For jobs marked "Discuss" → wait for the user's decision
- For jobs marked "Skip" → no action needed

## Evaluation Criteria

Read `profile/evaluation-criteria.md` for the full set of judgment rules: experience flexibility heuristics, degree requirements, international job assessment (visa/citizenship), career strategy ("foot in door"), and ceiling rules for senior roles.
