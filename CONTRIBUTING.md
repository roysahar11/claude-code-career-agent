# Contributing

Thanks for considering contributing to the Claude Code Career Agent! This project gets better as more people build on it — new job sources, smarter skills, better workflows.

## Ways to Contribute

### New Job Scrapers

The most immediately useful contribution. If you write a scraper for a job source that isn't covered, others can plug it in instantly.

A scraper is a Node.js module in `scripts/scrapers/` that exports a `fetch(options)` function returning an array of jobs in the standard schema (see `scripts/scrapers/lib/types.js`). Register it in the scraper array in `fetch-all.js` and it works with the full pipeline.

Look at `scripts/scrapers/israeli/secret-tel-aviv.js` (RSS), `scripts/scrapers/international/arbeitnow.js` (REST API), or `scripts/scrapers/international/simplify-jobs.js` (raw JSON) for examples of different fetching strategies.

### New Skills

Skills are markdown instruction files in `.claude/skills/`. If you've built a workflow that helps your job search — interview prep, networking outreach, salary research, application follow-ups — it can become a skill others can use.

A skill is a `SKILL.md` file that describes a workflow step by step. Claude Code reads it and follows the instructions. No code required (though skills can reference scripts when needed).

### Improvements to Existing Components

Bug fixes, better evaluation logic, resume template improvements, pipeline optimizations — all welcome. If you've been using the system and found something that could work better, chances are others hit the same thing.

### Documentation

Better examples, clearer setup instructions, usage guides, translations.

## How to Contribute

1. **Fork** the repo and create a branch for your change
2. **Make your changes** — keep them focused on one thing
3. **Test locally** — make sure your change works with the existing pipeline
4. **Open a PR** with a clear description of what you're adding and why

## Guidelines

- **No personal data** — Double-check that your contribution doesn't include names, contact info, API keys, or anything from your `profile/`, `config/`, or `Applications/` directories. These are all gitignored, but be careful with copy-paste.
- **Keep it modular** — New scrapers, skills, and agents should work independently. Don't create dependencies between unrelated components.
- **Match existing patterns** — Look at how existing scrapers, skills, and agents are structured and follow the same conventions.
- **Standard job schema** — Scrapers must output jobs using `makeJob()` from `scripts/scrapers/lib/types.js`. This keeps the merge pipeline working.

## Questions?

Open an issue if you're unsure whether something would be a good contribution, or if you need help getting started.
