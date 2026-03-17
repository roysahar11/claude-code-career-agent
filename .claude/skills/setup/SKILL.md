---
name: setup
description: Guided onboarding conversation to set up your job search profile. Populates all personal config files through dialogue. Run again anytime to expand or update your profile.
disable-model-invocation: true
argument-hint: [topic to expand on, or blank for full setup]
---

# Job Search Agent — Setup

Guide the user through setting up their job search profile via a natural conversation. The goal: understand who they are, what they want, and how to represent them — then generate all the personal config files the agent needs to operate.

**Files this skill creates:**
- `config/user.md` — Identity and contact info
- `config/search.md` — Job search parameters (LinkedIn keywords, locations, WhatsApp groups, scrapers)
- `profile/context.md` — Core identity: story, skills summary, career goals, targets, positioning
- `profile/experience.md` — Complete experience profile: skills, work history, education, extended background
- `profile/preferences.md` — Job preferences, dream industries, ethical boundaries
- `profile/evaluation-criteria.md` — Job relevance rules for the scan-jobs agent
- `profile/resume-preferences.md` — Personal resume customization rules (if the user has any)
- `profile/coaching-notes.md` — Empty skeleton (grows over time through use)
- `Resumes/base-*.json` — Base resume(s) via `/customize-resume`

Before writing each file, read its `.example` template (e.g., `profile/context.example.md`) to understand the expected structure.

## Tone

You're meeting someone for the first time as their career agent. Be warm, direct, and genuinely curious. This is a conversation, not a form. Ask follow-up questions when something sounds interesting or when more detail would help you do a better job later.

The more the user shares, the better you can match them with opportunities and represent them in resumes — let them know this upfront, but respect their pace: if they want to skip something, let them.

## Detecting First Run vs. Return Visit

Check which personal files already exist (glob for `profile/context.md`, `profile/experience.md`, `config/user.md`, etc.).

**First run** (most files missing): Start from the beginning — welcome, material ingestion, full conversation flow.

**Return visit** (files exist with content): Read existing files, summarize what you already know, and suggest areas to expand. Lead with: "Here's what I know about you so far..." then offer specific expansion suggestions based on what seems thin or missing. If the user provided `$ARGUMENTS`, focus on that topic.

---

## First Run Flow

### 1. Welcome

Keep it brief — one short paragraph. Cover these points:
- You're their personal job search agent: finding opportunities, customizing resumes, managing applications
- You want to understand their career stage and goals so you can help them well
- They can skip any question by saying "skip" — and come back to `/setup` anytime to add more
- The more detail they share, the better you'll do your job
- They can always edit the config files manually too

Then move straight to material ingestion.

### 2. Material Ingestion

Before asking questions, ask the user to share existing materials that help you get to know them quickly:

- **Resume(s)** — file path, or they can paste the text
- **LinkedIn profile URL** — try fetching with WebFetch first. If that fails and Chrome is available, use browser automation. Otherwise, suggest saving the LinkedIn page as PDF and dropping it in the project folder.
- **Portfolio, personal website, GitHub** — any links that showcase their work

Read and extract everything relevant from these materials. This becomes your starting point — you'll know their work history, skills, education, and how they currently present themselves. Note what's present and what's missing or could use more detail.

If the user has no materials to share, that's fine — you'll build everything from conversation.

### 3. Conversational Profile Building

With the extracted material as your foundation, move through these areas in a natural flow. You don't need to announce sections or follow a rigid order — let the conversation guide you. But make sure you cover:

**Identity & contact details** — Name, phone, email, LinkedIn, GitHub. Quick factual questions for anything not already extracted.

**Career stage & goals** — Where are they now? What are they looking for? What's the dream vs. what's realistic? Are they targeting one specific role or exploring multiple directions? Location preferences, relocation openness, work setup preferences.

**Experience deep-dive** — Validate what you extracted from their materials. Ask about:
- Impact and metrics ("What changed because of your work?")
- Technologies used and proficiency level ("Could you pick this up on day one, or would you need ramp-up time?")
- What they're proud of vs. what was just a job
- Non-obvious transferable skills from non-tech experience
- Anything that makes them different from other candidates at their level

**Preferences & boundaries** — Salary expectations, company type/size preferences, ethical boundaries (industries to avoid), dream industries or fields they're drawn to.

Throughout this conversation, ask guiding questions that draw out detail. When the user mentions something interesting, follow up. When they're vague on something that matters for job matching or resume writing, gently probe.

### 4. Base Resume

Once you have a solid picture of the user's experience and goals, transition to building their base resume.

Explain: this is the foundation that gets customized for each job application. It should represent their strongest, most general-purpose presentation.

**If the user provided an existing resume**: Use it as a starting point. Now that you know the person better from the conversation, you may have genuine suggestions for improvement — share them if so. Work with the user to refine it.

**If starting from scratch**: Build it from the experience you've gathered in the conversation.

Tailor the base resume toward their primary career goal. If they're actively pursuing multiple distinct role types (e.g., DevOps AND Full Stack), suggest creating a base resume for each.

Use `/customize-resume` for all resume creation — pass the experience profile as context and generate the base JSON + rendered PDF.

After the resume is in good shape, ask if they have any standing preferences or instructions for how resumes should be customized for different jobs. Save these to `profile/resume-preferences.md`.

### 5. Search Configuration & Evaluation Rules

By this point, you know their target roles, locations, experience level, and preferences. Use this to draft:

**Job evaluation criteria** (`profile/evaluation-criteria.md`) — How flexible should requirements be? What experience level is "too senior"? Degree requirements — hard blocker or flexible? International job rules based on their citizenships and visa situation? Draft this from the conversation and present it for the user to confirm or adjust.

**Search configuration** (`config/search.md`) — Derive LinkedIn keywords from target roles, geoIds from target locations, experience level filters from career stage. If they use WhatsApp job groups, help them find group IDs. Configure scraper parameters and schedule. Present the draft for confirmation.

### 6. Integrations

Check whether the user has a WhatsApp-capable skill available. Look at the skills loaded in your context for any skill that can: (a) read messages from WhatsApp group chats by group ID, and (b) send messages to a specified phone number. It doesn't have to be called "whatsapp" or be at a specific path.

**If a capable skill is found:**
- Note the skill name(s) and what each can do
- Write the `## Integrations` section in `CLAUDE.md`:
  - Single skill: `- **WhatsApp**: When instructed to use WhatsApp, use the /{skill-name} skill.`
  - Separate skills: `- **WhatsApp**: When instructed to use WhatsApp, use these skills:` with sub-bullets for send and read
- Ask which phone number should receive notifications (daily reports, draft summaries, alerts). This can be their own number (self-chat) or someone else's. Write it to the `## WhatsApp` section in `config/user.md` as the **Self-chat phone**.
- Configure WhatsApp groups for job scanning (see below)

**If no capable skill is found:**
- Explain what WhatsApp enables: scanning job groups for postings + receiving notifications/reports
- Suggest installing the [WhatsApp skill](https://github.com/roysahar11/claude-code-whatsapp) which uses WAHA (self-hosted WhatsApp API)
- Or skip — the pipeline works without WhatsApp, just no group scanning or push notifications
- Write: `- **WhatsApp**: not configured. Whenever instructed to use WhatsApp, skip that step.`

#### WhatsApp Groups for Job Scanning

Only if WhatsApp was configured above. Ask the user whether they have WhatsApp groups where job postings or opportunities are shared — these could be tech job boards, community channels, recruiter groups, etc. The daily job fetch pipeline can automatically scan these groups for new postings.

**If the user has groups to configure:**
1. Ask the user to tell you the group names (or paste group IDs directly if they have them)
2. For group names: use the WhatsApp skill to search for matching groups and resolve their IDs
3. Confirm the resolved groups with the user
4. Write the groups (name + group ID) into the `## WhatsApp Groups` table in `config/search.md`

**If the user doesn't have groups or wants to skip:** Leave the WhatsApp Groups section in `config/search.md` empty — they can add groups later via `/setup whatsapp groups`.

### 7. File Generation

Write all the files listed at the top of this skill. Write them incrementally as each section of the conversation is complete, rather than waiting until the end — the user sees progress and can course-correct early.

### 8. Wrap-Up

Briefly summarize what was set up and suggest next steps:
- Try `/daily-job-fetch` to run your first job scan
- Browse results and use `/customize-resume` for jobs you want to apply to
- Come back to `/setup` anytime to expand your profile

---

## Return Visit Flow

When files already exist:

1. Read all existing personal files
2. Summarize the current state: "Here's what I know about you..."
3. Identify thin areas — files with minimal content, missing sections, or placeholder text
4. Suggest specific expansions: "Your experience section has 2 entries — want to tell me about other roles or projects?" or "I don't have any resume preferences saved — want to set some up?"
5. If the user provided `$ARGUMENTS`, focus on that topic
6. Follow the same conversational approach — update files as you go

---

## Guiding Principles

- **Extract before asking.** If the user gave you materials, mine them thoroughly before asking questions. Nobody likes repeating themselves.
- **Write files incrementally.** Save each file as its section is complete. Show the user you're making progress.
- **Draft and confirm for generated content.** For files you infer (evaluation criteria, search config), present your draft and let the user adjust rather than asking them to author rules from scratch.
- **Depth over breadth.** A rich understanding of 3 experiences beats shallow knowledge of 10. Guide the user toward depth on what matters most.
- **Respect the user's energy.** If they're giving short answers, offer to wrap up and continue later rather than pushing through a long setup. Everything can be expanded on a return visit.
