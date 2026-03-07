---
name: customize-resume
description: Create, customize, iterate on, or re-render a resume. Use this skill for ALL resume operations - drafting, customizing, editing, re-rendering after changes, or creating from scratch. Never manually create resume JSONs or run the rendering pipeline outside this skill.
disable-model-invocation: false
argument-hint: [job posting or company/role name if already analyzed]
---

# Resume Customization

Generate a customized resume tailored to a specific job posting.

## Input

- Job posting (text, URL, or screenshot)
- OR reference to an already-analyzed job (company/role name from prior scan)
- Optionally: a specific base resume to start from (path or recent application)

## Step 1: Choose Base Version

If a base resume was provided as input, use that. Otherwise, find the best starting point from all available resumes:

1. Glob for `Resumes/base-*.json` and `Applications/**/final/resume.json`
2. Read each candidate resume to understand its emphasis
3. Pick the one closest to what this job needs — a finalized resume tailored for a similar role is often a better starting point than a generic base template

**Valid base resume sources:**
1. Base resumes: `Resumes/base-*.json`
2. Finalized application resumes: `Applications/**/final/resume.json`

Only use base resumes or finalized resumes as starting points — files in `drafts/` folders are work-in-progress and may contain errors or unapproved content.

## Step 2: Customize Content

Draw from the user's full experience profile (`profile/experience.md`).
The base resume is a starting point. `experience.md` is the **source of truth** containing the user's complete experience, skills, and background.

**ADD relevant content not in the base resume:**
- Technical Skills that match the job requirements (check all proficiency levels in experience.md)
- Relevant Experience (Work Experience, Freelance projects if relevant, Extended background when it fits)
- **User-specific content rules** — Read `profile/resume-preferences.md` for personal emphasis rules, transferable skills mapping, cultural/regional section defaults, and other content preferences that affect what to include or highlight.

**REMOVE less relevant content to make room:**
- Experience that doesn't strengthen the application
- Keep resume to one page - adding relevant content means removing less relevant content

**Technical Skills section - prefer MORE over LESS:**
- Show breadth of skills rather than minimizing - it doesn't take much space
- Make strategic decisions through ORDER, STRUCTURE, PHRASING, and HIGHLIGHTS - not by removing
- Only remove skills from the base if absolutely necessary to make room for something more important

## Source of Truth Discipline

The user will be interviewed on everything in this resume. Every claim — skills, tools, metrics, experience — must be traceable to one of these approved sources:
- `profile/experience.md` (the complete source of truth)
- Base resumes (`Resumes/base-*.json`)
- Finalized application resumes (`Applications/**/final/resume.json`)

**Skills and tools**: List only what's documented in the profile. Tool and product names are proper nouns — use the exact names the user actually uses. Proficiency levels in the profile are meaningful: "Basic Knowledge / Exposure" items stay off the highlights, and "roughly familiar with concepts" items stay off the resume entirely.

**Experience bullets**: Describe what the user actually did, using the action-result format. Adapting language means using the JD's terminology for things the user genuinely did — not adding their requirements as if the user has them.

**Metrics**: Use only metrics explicitly documented in the profile. When a metric isn't documented, leave it out rather than estimating.

**Dates**: Verify against the profile. Don't assume years from context.

**Summary**: Write the user's elevator pitch, not a response to the job description. The test: would this summary make sense to someone who hasn't read the JD? If it only works as a reply to this specific posting — if it borrows the JD's buzzwords — rewrite it to describe the user in their own terms.

When adapting language for ATS matching, the boundary is clear: rephrase what the user did using their vocabulary, but don't add what they didn't do. When unsure whether something is documented, check the profile rather than guessing — or flag it for the user's review.

## Autonomous Mode Guardrails

When creating resumes without the user's real-time review (quick-apply, batch processing), these additional constraints apply — because autonomous drafts go to the user as "ready for review" and errors are harder to catch:

- Start from approved sources only (base resumes, finalized resumes, profile)
- Rephrase only when meaning stays identical — when in doubt, keep original wording
- Save bold creative moves (new framings, unconventional angles) for interactive sessions
- Add content from the profile freely, but don't invent new ways to present it

## Step 3: Reorganize & Highlight

**REORDER to match job priorities:**
- Put most relevant skills/experience first
- Match the order of requirements in the job posting
- Experience should follow reverse chronological order (newest first) - recruiters expect this
- BUT within the same time period (e.g., multiple "2025 – Present" roles), order by relevance to THIS job
- Skills section categories should reflect what the job emphasizes - remove or condense categories that aren't priorities for this role

**Write bullet points that SHOW, don't TELL:**
- Demonstrate skills through actions and results — the reader should infer your qualities from what you accomplished
- Good template: "[Action] using [technologies], resulting in [measurable outcome]"
- Alternative: "Used [technologies] to [something you did], enabling [impact]"
- Example BAD: "Strong product thinking and user-centric approach"
- Example GOOD: "Identified pain points in business workflows and implemented solutions using digital tools, enabling 50% capacity growth"

**Highlight keywords** using `<span class="highlight">`:
- Only highlight terms explicitly mentioned in the job posting
- Be selective - 2-4 highlights per bullet point maximum
- Focus on: key technologies, core concepts, tools matching their stack
- Don't highlight: generic terms, technologies not in job posting
- If a skill is NOT in the job requirements, don't highlight it even if the user has it - highlighting signals "this matches what you asked for"

**Adapt language** to match job description terminology:
- Same meaning, different words (e.g., "container orchestration" ↔ "Kubernetes management")
- Helps with ATS matching

## Step 4: Customize Summary

Tweak or rewrite the summary to best represent the user for this job:
- Capture the recruiter's attention
- Highlight uniqueness and strengths to stand out
- Include key skills relevant to this role
- Keep it as the user's "elevator speech"

## Step 5: Proofread & Polish

Before generating, read through ALL text in the resume JSON like an editor would. Check for:

- **Grammar** - any grammatical errors or issues
- **Spelling** - typos and spelling mistakes
- **Punctuation** - correct and consistent punctuation
- **Readability** - text flows naturally, no awkward phrasings
- **Accuracy** - text accurately represents what it claims (no misleading framings)

Fix any issues found before proceeding. The resume text should be flawless.

## Step 6: Generate Resume (Drafts)

All work-in-progress files go in the `drafts/` subfolder. Only finalized resumes go in `final/`.

`{NAME}` in the file paths below is the resume filename prefix from `config/user.md`.

**Directory naming**: `Applications/{company}/{role}-{city}/` where `{city}` is the `locationCity` from the pipeline (e.g., `Raanana`, `Tel-Aviv-Yafo`, `Remote`). If no city is available, use just `{role}`.

1. **Create drafts folder and save customized JSON**:
   ```bash
   mkdir -p Applications/{company}/{role}-{city}/drafts
   ```
   Save to: `Applications/{company}/{role}-{city}/drafts/resume.json`

2. **Generate HTML from JSON**:
   ```bash
   node .claude/skills/customize-resume/scripts/generate-resume.js \
       Applications/{company}/{role}-{city}/drafts/resume.json \
       Applications/{company}/{role}-{city}/drafts/resume.html
   ```

3. **Auto-optimize layout**:
   ```bash
   node .claude/skills/customize-resume/scripts/check-fit.js \
       Applications/{company}/{role}-{city}/drafts/resume.html --fix
   ```
   This optimizes:
   - Column balancing (sidebar width 170-230px)
   - Font scaling (85%-130% of base)
   - Targets ~100% page fill with <40px column height difference

4. **Convert to PDF** (versioned folder, consistent filename):
   ```bash
   mkdir -p "Applications/{company}/{role}-{city}/drafts/v1"
   node ~/.claude/skills/html-to-pdf/scripts/convert.js \
       Applications/{company}/{role}-{city}/drafts/resume.html \
       "Applications/{company}/{role}-{city}/drafts/v1/{NAME}.pdf" \
       --format A4 --margin 0
   ```
   Increment the version folder (v1, v2, v3...) each time you regenerate during review.

5. **Open PDF for review**:
   ```bash
   open "Applications/{company}/{role}-{city}/drafts/v1/{NAME}.pdf"
   ```

## Step 7: Final Review

Once the user is satisfied with a draft, perform a final review before finalizing. Review the resume against the job posting and ask yourself:

1. Does it best represent the user for THIS job?
2. Is it easily readable?
3. Does it look and read professionally?

Present your conclusions to the user. If changes are made after this review, repeat Step 7 before proceeding to finalization.

## Step 8: Finalize Resume

Once the user approves a draft version (e.g., v3):

1. **Create final folder and copy approved PDF**:
   ```bash
   mkdir -p "Applications/{company}/{role}-{city}/final"
   cp "Applications/{company}/{role}-{city}/drafts/v3/{NAME}.pdf" \
      "Applications/{company}/{role}-{city}/final/{NAME}.pdf"
   ```

2. **Commit finalized resume**:
   ```bash
   git add Applications/{company}/
   git commit -m "Add {company} {role} resume (finalized)"
   ```

## Step 9: Personal Note (if applicable)

If there's an opportunity to add a personal message (email body, application textbox, LinkedIn message):
- Draft a short, authentic note (3-5 sentences)
- Highlight specific motivation for THIS role/company
- Connect the user's background to their needs
- Use the user's voice (direct, warm, genuine - not corporate)

## Step 10: Track Application

Create `status.md` in the application directory if it doesn't already exist:

```markdown
# {Role} @ {Company}
- **Status**: Draft
- **Date**: {today's date YYYY-MM-DD}
- **Source**: {where the job was found}
- **URL**: {job posting URL}
```

Update to "Applied" once the user confirms submission.

## Step 11: Output

- Final PDF saved to: `Applications/{company}/{role}-{city}/final/{NAME}.pdf`
- Personal note drafted (if applicable)
- Application tracked
- Show the user the summary and confirm everything is ready

## Design Principles

**If auto-scaling hits minimum (85%) and content still overflows**, manually adjust:
1. Remove less relevant experience
2. Shorten bullet points
3. Reduce spacing between sections
4. Remove low-priority content

**Priority of content** (what to preserve vs. cut):
- HIGH: Recent relevant experience, key technical skills matching the job
- MEDIUM: Certifications, education, older relevant experience
- LOW: Hobbies, very old experience, skills not relevant to target role

**Avoid orphaned words** - adjust text so paragraphs don't end with a single word on the last line.
