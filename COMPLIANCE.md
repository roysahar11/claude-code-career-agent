# Compliance & Terms of Service Notes

This project automates personal job search activities. All automated access respects platform terms of service where possible.

## Usage Scope

This project is for **personal, non-commercial job search use only**. It is not intended for distribution, resale, or use by third parties.

## Source Classification

### Fully Compliant (Public API / RSS)

These sources provide explicit public access mechanisms:

| Source | Method | Notes |
|--------|--------|-------|
| **Arbeitnow** | Public JSON API (`/api/job-board-api`) | Designed for programmatic access |
| **SimplifyJobs** | Public GitHub repository (raw JSON) | Community-maintained open data |
| **Secret Tel Aviv** | RSS feed (wpjobboard/xml/rss) | Standard RSS, permissive robots.txt |

No ToS issues. Rate-limited to respectful intervals.

### Chrome Browser Automation (ToS Risk — Personal Use Only)

These sources prohibit automated scraping in their ToS but are accessed via Chrome browser automation (simulating normal browsing). This is the same approach used for LinkedIn.

| Source | ToS Concern | Risk Level |
|--------|-------------|------------|
| **LinkedIn** | ToS prohibits scraping; hiQ v. LinkedIn precedent limits enforcement | Low — personal use, low volume |
| **AllJobs** | ToS restricts reproduction | Low — browsing, not bulk extraction |
| **Built In** | ToS prohibits bots/scrapers/crawlers | Low — Chrome automation, not headless |
| **Wellfound** | ToS prohibits automated access | Low — Chrome automation, personal use |

**If repurposing this code**: Remove Chrome-automated sources or replace with ToS-compliant alternatives before any commercial use, open-source distribution, or sharing with others.

### Manual-Check Sources (No Automation)

| Source | How to Use |
|--------|-----------|
| **Drushim** | Use built-in "Smart Agent" (email alerts) |
| **Goozali** | Browse manually |
| **AllJobs alerts** | Register for email alerts |

## Rate Limiting & Respectful Access

- API scrapers: 1 request per second minimum delay (Arbeitnow pagination)
- RSS feeds: Fetched at most 3x/day (automated schedule)
- Chrome automation: Normal browsing speed with human-like delays
- GitHub raw files: Single HTTP request per run

## Future Scrapers

Before implementing any new automated scraper, verify:
1. Does the source offer a public API or RSS feed?
2. Does the ToS explicitly allow or prohibit automated access?
3. Does robots.txt permit the routes being accessed?

Only automate sources in the "Fully Compliant" category. All others should use Chrome browser automation (manual mode only) or manual checking.
