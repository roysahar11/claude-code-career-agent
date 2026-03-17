# Your Name - Agent Context

Everything the agent needs to feel immediately familiar with you. This file is loaded every session via CLAUDE.md.

Detailed reference files (read when deeper info is needed):
- `profile/experience.md` — Full skills, projects, work history
- `profile/preferences.md` — Location, salary, industry preferences
- `profile/evaluation-criteria.md` — Job relevance judgment rules (used by scan-jobs)
- `profile/coaching-notes.md` — Interview lessons, patterns
- `config/user.md` — Contact info, links, resume filename
- `config/search.md` — Search keywords, locations, WhatsApp groups, scraper params

---

## Your Story (For Cover Letters & Outreach)
<!-- Write a 2-3 paragraph narrative about your professional journey. This is the "human version" of your resume — used for cover letters, outreach messages, and personal notes. Include:
- What drew you to tech / your field (origin story)
- Key experiences and transitions that shaped your direction
- What you're looking for now and why

Example: "Alex has been building things with code since middle school — starting with simple games in Python, then moving to web apps in college. After 3 years as a project manager at a consulting firm, Alex realized the most fulfilling moments were always the technical ones — automating reports, building internal tools, debugging deployment issues. That realization led to an intensive DevOps bootcamp and a career pivot..."
-->

**What you seek**: <!-- One sentence about what you're looking for — e.g., "A stable foundation with solid compensation, support for growth, and room to bridge technical and creative interests." -->

**Core narrative**: <!-- One sentence summary of your professional identity for recruiters — e.g., "Alex is a career-switcher who brings 5 years of project management experience to infrastructure engineering, combining technical skills with deep understanding of product delivery." -->

---

## About You
<!-- One-line professional summary — e.g., "DevOps Engineer and Developer seeking opportunities in Israeli high-tech. Combines technical expertise with creative background and entrepreneurial mindset." -->

### Basic Info
- **Age**: <!-- Your age -->
- **Citizenships**: <!-- e.g., US, US + EU (Irish), Israeli + German (EU work rights) -->
- **Languages**: <!-- e.g., Hebrew (native), English (fluent), French (basic), eager to learn new languages -->
- **Partner**: <!-- If relevant to relocation planning — e.g., "US citizen (not married yet)" — or remove this line -->
- **Career stage**: <!-- Brief description — e.g., "Seeking first tech industry job. Background includes military service, two US summer camp delegations, freelance projects, and recent DevOps bootcamp graduation." or "3 years as SRE at mid-size company, looking to move to a larger engineering org." -->
- **Relocation**: <!-- e.g., "Actively seeking EU and US opportunities. See profile/preferences.md for full details." or "Not open to relocation — remote or Bay Area only." -->

### Links
- LinkedIn: <!-- https://linkedin.com/in/your-profile -->
- GitHub: <!-- https://github.com/your-username -->

### Technical Skills
(full detail in profile/experience.md)
<!-- List your main skill categories with key technologies. Keep this brief — details live in experience.md. Example: -->
- **Cloud**: <!-- e.g., AWS -->
- **IaC/Config Management**: <!-- e.g., Terraform, Ansible -->
- **Containers**: <!-- e.g., Docker, Kubernetes, Amazon ECS -->
- **CI/CD**: <!-- e.g., GitHub Actions, Jenkins -->
- **Programming**: <!-- e.g., Python, JavaScript, Bash, HTML, CSS -->
- **OS**: <!-- e.g., Linux (strong), Windows, Active Directory -->
- **AI**: <!-- e.g., Generative AI, LLMs, AI agents development, AI-assisted coding -->

### Certifications
<!-- List certifications with enough detail to identify them. Example:
- DevOps Course - Training Program Name (1,000 hours)
- AWS Solutions Architect Associate
- Red Hat: RH294 (Ansible), DO180 (OpenShift)
-->

### Current Experience
<!-- List current/recent positions with one-line descriptions showing what you do and the tech involved. Example:
- **Freelance AI & Technical Consulting (2025-Present)**: AI-powered WhatsApp chatbot (TypeScript, Claude API, Docker, VPS), marketing automation (AI CRM with 2.7x productivity gain)
- **University (2025-Present)**: DevOps volunteering — CI/CD for national AI system, Kubernetes infrastructure for research
- **Bootcamp Name (2024-2025)**: Hands-on DevOps projects
-->

### Unique Differentiators
<!-- What makes you stand out? Be specific and honest. 3-6 bullet points. Example:
- AI: Deep experience with AI tools, agents, and AI-powered application development
- Business impact: Applies tech to solve real business problems — not just technical projects
- Creative background: Video production, music, theater
- Entrepreneurial: Initiated a major community event from scratch
- US experience: Worked as counselor in English at a STEM summer camp
- Multidisciplinary: Tech + creativity + people skills
-->

---

## Dream Industries (Passion Areas)
**Primary excitement:**
<!-- List 3-5 industries/domains that excite you most. Example:
- AI/ML — cutting-edge AI solutions
- Tech + Art intersection — AI tools for creatives, apps like Adobe
- Tech + Wellness/Self-development — meditation, stress relief, emotional awareness tools
- AI for small businesses — automation and efficiency
-->

**Also very interested in:**
<!-- Secondary interests. Example:
- Cutting-edge research: quantum computing, AI, biotech
- Technology in education
- Gaming industry (especially creative/educational)
- Cybersecurity, DevEx
-->

**Narrative Thread**: <!-- One sentence connecting your interests — e.g., "Drawn to technology that enhances human experience — creativity, wellness, education, self-growth." -->

**Reality**: <!-- Your flexibility level — e.g., "Open to any field for first job — passion areas are ideal targets but not requirements." -->

---

## Career Goals
- **Primary Goal**: <!-- e.g., "Land first tech industry job (entry-level/junior position)" -->
- **Direction**: <!-- e.g., "DevOps is core skill, but open to development roles and hybrid positions" -->
- **Long-term**: <!-- e.g., "Leverage multidisciplinary background — connecting different areas of expertise" -->

## Target Roles
<!-- List specific role titles you're targeting. Example:
- Junior DevOps Engineer
- Junior Full Stack Developer
- Junior Developer (Python/JavaScript)
- DevOps/Development hybrid roles
- Any entry-level position that gets foot in the door
-->

## Positioning
<!-- How you position yourself to employers. Include your key selling points. Example:
**Junior with unique advantages:**
- Fresh bootcamp graduate with hands-on projects
- Real volunteering experience (not toy projects)
- Diverse background brings creativity and fresh perspectives
- AI-native generation — comfortable with modern tooling
- Entrepreneurial mindset and self-starter attitude
-->

### Ethical Boundaries
<!-- Industries or companies you want to avoid, and how strictly. Example:
"Avoids companies/industries found immoral or ethically problematic. No hard rules that completely rule out opportunities, but flag anything questionable for discussion. Examples of likely no-go: companies promoting meat/dairy food industry. When in doubt, highlight it and discuss."

Or: "No ethical restrictions — evaluate all opportunities purely on fit."
-->

---

## Current Status
<!-- Brief bullets about what you're doing right now. Example:
- Freelance consulting: Marketing automation & business process optimization
- Volunteering at University (not full-time)
- Fresh from 1,000-hour DevOps bootcamp
- Actively seeking first industry role
-->

## Job Search Channels (Active)

### Automated Pipeline (`/daily-job-fetch`)
The core job scanning workflow runs daily (manually or via launchd), covering:
<!-- List your active automated sources. Example:
- **LinkedIn** (Chrome automation): Israeli + International searches with configurable keywords and experience filters
- **WhatsApp groups** (7 groups): Tech job groups scanned for postings, images, and document attachments
- **Web scrapers** (HTTP-based): Secret Tel Aviv (RSS), Arbeitnow (API), SimplifyJobs (GitHub)
- **Chrome-only sources** (manual mode): AllJobs, Built In Israel, Wellfound
-->

Pipeline flow: Fetch > Pre-filter > Fetch descriptions > Scan relevance > Generate report > Quick-apply drafts

### Other Active Channels
<!-- Other ways you're finding jobs. Example:
- **Recruitment agency**: Receives daily job offers, applies to relevant ones
- **Job matching platform**: Gets direct job matches occasionally
- **Personal network**: Friends in industry, some leveraged already
-->

---

## Future Focus Areas
<!-- Checklist of things you plan to work on. Example:
- [ ] **Resume Improvement** — Polish structure, content, and presentation
- [ ] **LinkedIn Profile** — Optimize headline, about, experience sections
- [ ] **LinkedIn Content** — Create posts to increase visibility
- [ ] **GitHub Curation** — Make projects presentable with good READMEs
- [ ] **More automated scrapers** — Add additional job sources
- [ ] **Networking strategy** — Join relevant communities and groups
-->
