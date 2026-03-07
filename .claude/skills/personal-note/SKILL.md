---
name: personal-note
description: Write a personal note or cover letter for a job application. Use after resume is ready, when applying to a job that accepts a personal message.
argument-hint: [company/role name or job posting]
---

# Personal Note / Cover Letter

Write an authentic, well-structured personal note or cover letter for a job application.

## When to Use

- Application has a text field for personal message
- Sending resume via email (note goes in email body)
- LinkedIn message to recruiter
- Any opportunity to add personal context beyond the resume

## Input

- Job posting (URL, text, or reference to previously analyzed job)
- OR company/role name if already analyzed
- Resume should already be prepared (reference `Applications/{company}/{role}/resume.json` for context)

## Source of Truth

**Always draw from `profile/experience.md`** for experience and skills claims. Never invent or exaggerate - only reference what's documented.

The personal note is a good opportunity to include details that didn't make it into the resume but are still relevant - dig into the profile for supporting experiences that strengthen the application.

## Structure

### 1. Warm Opening
```
Hi! / Hello! / Hey!
My name is [Name], I'm a [relevant title based on role].
I got interested in this job posting, and I think my skills are a great match to this role:
```

Adjust formality based on company vibes. "Hi!" for startups, "Hello" for more formal companies.

### 2. Requirements Mapping

For each key requirement in the job posting:
```
- {Requirement (quoted/paraphrased from job post)} - {How the user's skills and experience fit it}
```

**Guidelines:**
- Pull 3-5 most important requirements from the job posting
- Be specific - reference actual experiences from `profile/experience.md`, not generic claims
- This is a chance to mention relevant details that didn't fit in the resume (e.g., language fluency, specific teaching experiences, unique background)
- If a requirement is a stretch, acknowledge it honestly while showing related experience
- Group related requirements if needed, but avoid overly long bullet points

### 3. Personal Connection (only if documented)

**IMPORTANT**: Only include this section if the user has a documented genuine interest. Check `profile/preferences.md` for the user's dream industries and passion areas. If the company/industry isn't listed there, either:
1. Skip this section entirely, OR
2. Ask the user first if they have genuine enthusiasm for this company/mission

**Never invent enthusiasm** - even if the company sounds interesting, don't write about excitement unless it's verified. Generic-sounding enthusiasm is worse than no enthusiasm section at all.

### 4. Closing

```
I'm looking forward to discussing how my skills may help the company.

Wishing you a wonderful [time-appropriate greeting],
[Name]
```

**Time-appropriate greetings:**
- Morning/day: "wonderful day"
- Evening: "wonderful evening"
- Thursday/Friday: "wonderful weekend"
- Before holidays: "Happy [Holiday]"
- General: "wonderful week"

## Tone & Voice

- **Warm but professional** - not corporate-speak, not overly casual
- **Direct and honest** - state facts, don't oversell
- **Confident but humble** - acknowledge strengths without arrogance
- **Personal** - this is the user speaking, not a template

## Cover Letter vs Personal Note

**Personal Note (default):**
- 3-5 bullet points
- Conversational tone
- For application text fields, emails, LinkedIn

**Cover Letter (when specifically requested):**
- Slightly more structured
- Can be longer (still concise)
- More formal greeting/closing
- Same content principles apply

## Language

- Default: English (unless applying to a company that requires the local language)
- Adjust formality based on company culture:
  - Startup/tech: More casual
  - Enterprise/traditional: More formal
  - Creative/agency: Can be playful

## Output

1. Draft the personal note
2. Present to the user for review
3. Save final version to `Applications/{company}/{role}/personal-note.md`

## Example

```
Hi!
My name is [Name], I'm a developer and prompt engineer.
I got interested in this job posting, and I think my skills are a great match:

- Native level English with excellent communication skills - I have diverse experience
  writing, presenting, and teaching in both English and my native language.

- Strong product sense and user empathy - As a freelancer and entrepreneur,
  I've developed a customer-facing, product-first mindset.

- 2+ years in product/R&D - I gained diverse hands-on experience through freelancing,
  a DevOps bootcamp, and volunteering as a DevOps engineer at a university research lab.

I'm looking forward to discussing how my skills may help the company.

Wishing you a wonderful week,
[Name]
```
