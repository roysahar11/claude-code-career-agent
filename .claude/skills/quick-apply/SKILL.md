---
name: quick-apply
description: Process job applications autonomously when the user is away. Creates draft resumes and sends summaries via WhatsApp for later review. Use whenever the user says "quick apply" — works for single jobs or batches.
disable-model-invocation: false
argument-hint: [list of jobs to process, or "continue" to resume]
---

# Quick Apply - Autonomous Job Application Drafts

Process job applications autonomously, creating draft resumes and notifying the user via WhatsApp for later review and approval.

## When to Use

When the user wants a resume drafted and will be away/unavailable for review. Works for:
- A single job (referral, WhatsApp message, URL, or pasted description)
- A batch of jobs from scan-jobs output
- Any situation where the user says "quick apply" — the key is autonomy + WhatsApp notification

## Input

- One or more jobs to process (company, role, and any available context: URL, job description, WhatsApp conversation, referral details)
- Jobs may come from scan-jobs output, direct referrals, WhatsApp messages, or any other source

## Process Per Job

### 0. Check for Existing Drafts

Before starting work on a job, check if a draft already exists:
1. Glob for `Applications/{Company}*/{Role}*/drafts/**/*.pdf` and `Applications/{Company}*/{Role}*/final/*.pdf`
2. If a match is found → **skip this job** and note: "Resume draft already exists at {path}"
3. If no match → proceed with draft creation

### 1. Create Draft Resume

Invoke the `/customize-resume` skill for this job, following Steps 1-6. The **Source of Truth Discipline** and **Autonomous Mode Guardrails** from that skill apply — in short, every claim must be traceable to an approved source (profile, base resume, or finalized resume).

**Output:**
- Save to `Applications/{company}/{role}/drafts/` (following the folder structure defined in `/customize-resume`)

### 2. Review & Iterate

v1 is the starting point, not the finished product. Review and improve through this loop:

**Accuracy Trace** (write to `Applications/{company}/{role}/drafts/review-notes.md`):
- **Skill/Tool Trace**: For each technical skill or tool in the resume, note its source in the profile (e.g., "Terraform → experience.md, Infrastructure as Code section, Working Proficiency")
- **Summary Independence Check**: Read the summary without looking at the JD. Does it describe the user, or does it echo the job posting? Note: "Summary describes the user as [X] — [accurate / mirrors JD]"
- **Metric Verification**: For each metric or number, note its source (e.g., "2.7x productivity → experience.md, [project name]")

Fix any accuracy issues found and regenerate (v2).

**Qualitative Review** (read as a recruiter would):
- Does the summary grab attention and convey what makes the user unique?
- Do the bullets tell a story, or just list duties?
- Would the user hand this resume to a hiring manager with confidence?

If improvements are needed, refine and regenerate → loop back to Accuracy Trace.
Most resumes should reach v2 or v3 before you're satisfied.

Delete `review-notes.md` after the final version — it's a working artifact only.

### 2b. Handle Location Groups

When a batch entry has multiple locations (a `Locations` / `Location Cities` field listing several cities), the JD is the same for all locations. Handle as follows:
1. Create one resume draft (same JD, one `/customize-resume` invocation)
2. Copy the draft to each location's directory (e.g., `NVIDIA/DevOps-Engineer-Raanana/`, `NVIDIA/DevOps-Engineer-Yokneam/`)
3. Create a `status.md` in each directory
4. Send one WhatsApp message listing all locations

### 3. Create status.md

After creating the draft, create `status.md` in the application directory (same directory where the resume was saved):

```markdown
# {Role} @ {Company}
- **Status**: Draft
- **Date**: {today's date YYYY-MM-DD}
- **Source**: {WhatsApp group / LinkedIn / Direct}
- **URL**: {job posting URL}
- **Notes**: Draft resume created by quick-apply.
```

If `status.md` already exists (e.g., from a previous run), don't overwrite it.

### 4. Send WhatsApp Summary

Use the `/whatsapp` skill to send the user a message with:
- Role title & Company name
- Link to job posting
- Which base resume was used
- The draft PDF attached

**Scope boundaries:**
- Everything stays in `drafts/` — only the user can finalize to `final/`
- Profile files are read-only during quick-apply

## After All Jobs Processed

1. **Send base resumes used** - For each unique base resume used in the batch, send the PDF via WhatsApp so the user can compare customizations against the originals.

2. **Send final summary** via WhatsApp:
   - How many jobs were processed
   - Any issues encountered
   - What's ready for the user's review

## Example WhatsApp Message

```
DevOps Engineer @ Webbing Solutions

Job: https://webbingsolutions.com/careers/OTQuNTZC/

Base: base-devops resume

Draft ready for your review - see attached PDF. Key customizations:
- Emphasized AWS networking (VPC, subnets)
- Highlighted Terraform and ECS
- Reordered skills to match their priorities

Let me know when you're back to review!
```

## After Summary: Commit and Push

After all WhatsApp messages are sent, commit and push the new draft files:

```bash
git add Applications/ && git commit -m "Quick-apply drafts: {list of Company/Role}" && git push
```

Only commit if there are actual new files. This ensures drafts are version-controlled and backed up even if the session ends.

## Key Principles

1. **Each resume represents a real person** — quality per draft matters more than processing speed. Take the time to iterate.
2. **Autonomous means conservative, not careless** — Source of Truth Discipline and Autonomous Mode Guardrails apply to every draft.
3. **Process every job in the input** — jobs were pre-filtered by scan-jobs; your role is drafting, not filtering. If something seems off about a job, note your concern in the WhatsApp message instead of skipping it.
