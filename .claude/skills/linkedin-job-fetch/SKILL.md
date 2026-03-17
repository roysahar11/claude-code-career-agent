---
name: linkedin-job-fetch
description: Search LinkedIn for job postings and extract relevant opportunities. Use for LinkedIn job search, finding low-applicant jobs.
---

# LinkedIn Job Fetch

Search LinkedIn for job postings and extract relevant opportunities based on configurable filters.

## When to Use

Use this skill when you need to:
- Search LinkedIn for job opportunities
- Find jobs with low applicant counts (early opportunities)
- Get a batch of jobs to analyze for relevance

## Input

- **Keywords**: Job title or keywords to search (e.g., "DevOps Engineer", "Full Stack Developer"). If not provided, read from `config/search.md` (LinkedIn section for the relevant scope).
- **Location**: Geographic filter (default: Israel). If not provided, read from `config/search.md`.
- **Time range**: How recent (default: past 24 hours)
- **Remote filter**: On-site, remote, or hybrid (optional)
- **Experience level**: Filter by seniority. If not provided, read from `config/search.md`. See experience level reference below.
- **Output file**: File path for the results JSON (default: `/tmp/linkedin-jobs-{DATE}.json`). When running multiple searches (e.g., Israeli + International), use different output files to avoid collisions.
- **Storage key**: localStorage key for the accumulator (default: `__allJobs`). Use a different key per search session to avoid overwriting data from a previous session in the same browser.

## Process

### Step 1: Navigate to LinkedIn Jobs

1. Get browser context using `tabs_context_mcp`
2. Create new tab if needed using `tabs_create_mcp`
3. Navigate to LinkedIn Jobs search with filters:
   ```
   https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}&f_TPR=r{seconds}&f_E={experience_levels}&sortBy=R
   ```

   **Sort order** (`sortBy` parameter): Use `R` (relevance). This surfaces jobs matching the user's profile first, reducing noise and allowing intelligent early stopping. The time filter (`f_TPR`) still limits results to the specified window.

   **Time range** (`f_TPR` parameter): Accepts any value in seconds as `r{seconds}`. LinkedIn supports arbitrary second values, not just named presets. Use the time window provided by the caller.

   Common presets for reference:
   - `r86400` = 24 hours
   - `r43200` = 12 hours
   - `r21600` = 6 hours
   - `r604800` = 1 week

   Experience level codes (`f_E` parameter, comma-separated for multiple):
   | Value | Level | Typical Experience |
   |-------|-------|-------------------|
   | `1` | Internship | Pre-entry, students |
   | `2` | Entry Level | 0-2 years |
   | `3` | Associate | 2-5 years |
   | `4` | Mid-Senior Level | 5+ years |
   | `5` | Director | 8+ years |
   | `6` | Executive | 10+ years |

   **Default**: Read from `config/search.md`. If not specified there, use `f_E=1,2` (Internship + Entry Level).
   - Use `f_E=1,2,3` to also include Associate (casts a wider net — useful because many companies misclassify experience levels on LinkedIn)

### Step 2: Initialize localStorage Accumulator

LinkedIn wipes all `window.*` variables on every page navigation (keyword changes, pagination). Use `localStorage.setItem()`/`getItem()` to persist data across navigations. Save to localStorage after each page — this protects against mid-extraction failures.

Use the **storage key** from the input (default: `__allJobs`). If the caller provided a different key (e.g., `__allJobsIntl` for international searches), use that instead throughout all steps.

The temp file (Step 7) is the primary output — the orchestrator reads it directly. localStorage is your safety net during extraction.

Run JS via `javascript_tool` before the first keyword search:

```javascript
// Initialize global accumulator in localStorage
// Replace STORAGE_KEY with the actual key (e.g., '__allJobs' or '__allJobsIntl')
localStorage.setItem('STORAGE_KEY', JSON.stringify([]));
window.__acc = new Map(); // keyed by URL
const total = document.querySelectorAll('li[data-occludable-job-id]').length;
const pagination = document.querySelector('button[aria-label="View next page"]');
'Initialized. Card slots: ' + total + ', Pagination: ' + (pagination ? 'yes' : 'no')
```

### Step 3: Scroll + Extract Loop (per page)

**Key insight**: LinkedIn virtualizes the job list — only ~7 cards near the viewport are rendered with content. JS `scrollTop` does NOT trigger rendering. You MUST use the `computer` scroll tool (native mouse wheel) to trigger LinkedIn's IntersectionObserver.

Repeat 2-3 times per page:

1. **Native scroll**: Use `computer` tool to scroll down ~10 ticks at coordinates `(500, 400)` over the job list panel
2. **Extract**: Run the extract snippet via `javascript_tool`:

```javascript
document.querySelectorAll('li[data-occludable-job-id]').forEach(card => {
  const jobId = card.getAttribute('data-occludable-job-id');
  const url = 'https://www.linkedin.com/jobs/view/' + jobId + '/';
  if (window.__acc.has(url)) return;
  const titleEl = card.querySelector('.artdeco-entity-lockup__title');
  if (!titleEl || !titleEl.innerText.trim()) return;
  const companyEl = card.querySelector('.artdeco-entity-lockup__subtitle');
  const locationEl = card.querySelector('.artdeco-entity-lockup__caption');
  const timeEl = card.querySelector('time');
  const text = card.innerText || '';
  const postedTime = timeEl ? timeEl.innerText.trim().split('\n')[0] : '';
  const easyApply = text.includes('Easy Apply');
  const topApplicant = text.includes('top applicant') || text.includes('Top applicant');
  const noteLines = [
    easyApply && 'Easy Apply',
    topApplicant && 'Top applicant',
    postedTime && ('Posted: ' + postedTime)
  ].filter(Boolean);
  window.__acc.set(url, {
    url,
    title: titleEl.innerText.trim().split('\n')[0],
    company: companyEl ? companyEl.innerText.trim() : '',
    source: 'LinkedIn',
    location: locationEl ? locationEl.innerText.trim() : '',
    description: null,
    notes: noteLines.length ? noteLines.join('\n') : null
  });
});
'Accumulated: ' + window.__acc.size + ' / ' + document.querySelectorAll('li[data-occludable-job-id]').length
```

3. **Check progress**: Stop when accumulated count is within 1-2 of total card slots (23/25 is fine — don't over-optimize)

### Step 4: Save to localStorage + Paginate

After extracting a page, **always save to localStorage before navigating**:

```javascript
// Merge current page into persistent storage
// Replace STORAGE_KEY with the actual key (e.g., '__allJobs' or '__allJobsIntl')
const existing = JSON.parse(localStorage.getItem('STORAGE_KEY') || '[]');
const existingUrls = new Set(existing.map(j => j.url));
const newJobs = Array.from(window.__acc.values()).filter(j => !existingUrls.has(j.url));
existing.push(...newJobs);
localStorage.setItem('STORAGE_KEY', JSON.stringify(existing));
'Saved. New: ' + newJobs.length + ', Total in storage: ' + existing.length
```

Then paginate:
1. Use `find` tool to locate the next page button (e.g., `find` query: "page 2 pagination button")
2. Use `scroll_to` with the ref to ensure it's visible, then `left_click` with the ref
3. Wait 3 seconds for page load
4. Reset `window.__acc = new Map()` for the new page
5. Repeat Step 3

**Pagination with relevance sort**: Since results are sorted by relevance (best matches first), later pages contain progressively less relevant jobs. Use this stopping rule:
- **Stop extracting a keyword** when you encounter **2 consecutive pages where zero job titles are plausibly tech/engineering/IT roles** (e.g., pages full of Sales, Marketing, Pastry Cook, Executive Assistant).
- **Do NOT stop** just because a page has high overlap with previous keywords — overlap is expected and fine.
- **Do NOT stop** after just 1 weak page — LinkedIn mixes in some irrelevant results on every page. Only stop after 2 consecutive pages of pure noise.
- If the "next page" button is disabled/absent, stop (no more results).
- **Log page counts** per keyword (e.g., "DevOps Engineer: 3 pages, stopped after 2 non-tech pages").

### Step 5: Repeat for Next Keyword

After finishing all pages for a keyword:
1. Navigate to the next keyword search URL
2. Wait 3 seconds for page load
3. Reset `window.__acc = new Map()`
4. Repeat Steps 3-4
5. Data from previous keywords is safe in localStorage

### Step 6: Title-Based Pre-Filter

After all keywords are extracted, review the collected job titles against the user's target roles (from `profile/context.md`) and **remove any that are clearly unrelated**. Be generous — keep anything that might even slightly relate to the user's target jobs. Final relevance filtering is done by scan-jobs.

Remove only titles where no reasonable interpretation could relate to the user's job search goals. When in doubt, **always keep it** — the scan-jobs agent will do detailed relevance filtering later.

### Step 7: Save Results to File

Save extracted jobs to a temp file on disk. **This is the primary output** — the daily-fetch orchestrator reads this file directly, avoiding the need to extract data from localStorage via multiple truncated JavaScript calls.

**File path**: Use the **output file** from the input parameters. Default: `/tmp/linkedin-jobs-{DATE}.json`. For international searches, the caller will specify `/tmp/linkedin-jobs-intl-{DATE}.json`.

The JavaScript tool output truncates at ~3000 characters, which is too small for the full job dataset. Use batched base64 extraction to transfer data reliably from browser to disk:

1. **Count total jobs**:
   ```javascript
   // Replace STORAGE_KEY with the actual key
   JSON.parse(localStorage.getItem('STORAGE_KEY') || '[]').length
   ```

2. **Extract in base64 batches** (10 jobs per batch to stay under truncation limit):
   ```javascript
   // Replace STORAGE_KEY with the actual key
   const jobs = JSON.parse(localStorage.getItem('STORAGE_KEY') || '[]');
   btoa(unescape(encodeURIComponent(JSON.stringify(jobs.slice(0, 10)))))
   ```
   Repeat with `slice(10, 20)`, `slice(20, 30)`, etc. Base64 encoding avoids quoting issues with Hebrew text, special characters, and nested JSON.

3. **Decode each batch** and save to a numbered temp file:
   ```bash
   echo 'BASE64_OUTPUT' | base64 -d > /tmp/lj-batch-0.json
   ```

4. **Combine all batches** into the final file:
   ```bash
   python3 -c "
   import json, glob, os
   all_jobs = []
   for f in sorted(glob.glob('/tmp/lj-batch-*.json')):
       all_jobs.extend(json.load(open(f)))
       os.remove(f)
   path = 'OUTPUT_FILE_PATH'
   json.dump(all_jobs, open(path, 'w'), ensure_ascii=False)
   print(f'Saved {len(all_jobs)} jobs to {path}')
   "
   ```
   Replace `OUTPUT_FILE_PATH` with the actual output file path from input.

5. **Verify** the file:
   ```bash
   python3 -c "import json; print(len(json.load(open('OUTPUT_FILE_PATH'))))"
   ```

## Output

Include in your response:
1. The file path to the saved JSON
2. A summary of what was extracted:

```
## LinkedIn Job Fetch Results

**File**: {OUTPUT_FILE_PATH}
**Search**: {keywords searched} | {location} | {time range} | {experience levels}
**Found**: {total scraped} -> {tech-relevant after filter} tech-relevant ({filtered out} non-tech removed)

### Per-Keyword Stats
- "DevOps Engineer": {N} pages extracted, {M} jobs
- "Full Stack Developer": {N} pages, {M} new jobs
- ...

### Filtered Out ({count})
{comma-separated list of removed non-tech job titles}
```

**Do NOT rely on localStorage as the output mechanism.** The caller cannot access the browser's localStorage. The temp file IS the output.

## Integration with Other Skills

After fetching jobs, typically:
1. Use `/scan-jobs` agent to analyze relevance
2. Use `/quick-apply` for batch applications
3. Use `/customize-resume` for individual applications

## Example Usage

```
/linkedin-job-fetch keywords="DevOps Engineer" location="Israel" time="24h"
```

Would search for DevOps Engineer jobs in Israel posted in the last 24 hours. Defaults to Entry Level + Internship.

```
/linkedin-job-fetch keywords="Full Stack Developer" location="Israel" experience="entry,internship,associate"
```

Same search but with Associate level included for a wider net.

## CAPTCHA / Security Challenge Detection

After navigating to search results for **each keyword**, check if LinkedIn is showing a CAPTCHA or security challenge instead of job results.

**How to detect:**
- Page shows "Let's do a quick security check" or similar verification text
- A challenge iframe or puzzle is displayed instead of job cards
- No job cards (`li[data-occludable-job-id]`) appear despite the search having results
- Unusual page layout with no recognizable LinkedIn jobs UI

**What to do if detected:**
1. **Stop LinkedIn scraping immediately** — do not retry or attempt to solve the CAPTCHA
2. **Send WhatsApp alert to the user** using `/whatsapp autonomous`:
   ```
   LinkedIn CAPTCHA detected during job fetch. LinkedIn scraping stopped. Please solve the CAPTCHA manually and the next scheduled run will resume normally.
   ```
3. **Return whatever jobs were collected so far** from previous keywords (data is safe in localStorage)
4. **Note the error** in the output so the orchestrator can include it in the report
5. The orchestrator will continue with WhatsApp sources despite LinkedIn failure

## Notes

- **Data persistence**: localStorage survives page navigations; window variables don't. Save after each page.
- **Output**: The temp file is the primary output. The orchestrator cannot access browser localStorage.
- **Browser access requirement**: LinkedIn extraction requires Chrome browser tools (`mcp__claude-in-chrome__*`), which are only available to foreground agents in the invoking conversation. Background agents cannot access these tools.
- **Applicant count**: NOT available from the list view — don't try to extract it here. Applicant count filtering is handled by the scan-jobs agent when it opens individual job pages.
- **DOM virtualization**: LinkedIn only renders ~7 job cards visible in the viewport. You MUST use native scroll (`computer` tool) — JS `scrollTop` does NOT trigger card rendering.
- **Pagination clicks**: Use `find` tool to locate page buttons by ref, then click by ref — more reliable than coordinate-based clicks.
- **Don't over-extract**: 23/25 cards per page is fine. Don't waste tool calls chasing the last 1-2 cards.
- LinkedIn may rate-limit or show CAPTCHAs - if this happens, pause and inform the user
- Job counts are approximate and may change between viewing
- Always verify the browser is logged into LinkedIn before searching
