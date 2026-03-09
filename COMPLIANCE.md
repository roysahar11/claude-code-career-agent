# Compliance & Terms of Service

## Disclaimer

This project is published for **educational and personal use purposes**. It demonstrates how AI agents can automate job search workflows, including interaction with job platforms and career websites.

For sources that provide public APIs or explicitly permit programmatic access, this repository includes **traditional scrapers** (HTTP requests, RSS parsing, etc.). For sources that restrict automated access in their Terms of Service, the repository instead contains **natural language instructions** (skills and agent definitions) that direct Claude Code to use browser automation (via the Claude in Chrome extension) to navigate pages and read content — much like a human browsing manually.

Some of the platforms accessed via browser automation may restrict or prohibit automated access in their Terms of Service. These instructions are provided as-is for learning and reference. **By using this project, you accept full responsibility for ensuring your use complies with all applicable laws, regulations, and platform Terms of Service in your jurisdiction.**

The authors and contributors of this project are not responsible for any misuse or any consequences arising from the use of this software. See the [LICENSE](LICENSE) file for full warranty and liability disclaimers.

## Source Categories

When integrating job sources into your search pipeline, each source falls into one of three categories:

### 1. Public APIs & Open Data

Sources that offer explicit programmatic access — public REST APIs, RSS feeds, open GitHub datasets. These are designed for automated consumption and are generally safe to use.

**Best practice:** Respect rate limits and any usage guidelines provided by the source.

### 2. Browser Automation

Sources that don't offer a public API but can be accessed through browser automation. This project uses Claude Code with the Claude in Chrome extension to browse these platforms — the agent follows natural language instructions to navigate pages and read content, rather than running traditional scraping scripts.

**This repository includes instructions that fall into this category.** They are published for educational purposes to demonstrate AI-driven browser automation in the context of job searching. Whether and how you use them is your responsibility.

**Best practice:** Browse at human-like speeds, avoid bulk extraction, and review each platform's ToS before use.

### 3. Manual-Only Sources

Some platforms are best accessed manually or through their own built-in alert systems (email notifications, saved searches). When a platform offers no API and explicitly prohibits automation, consider using their native tools instead.

## Respectful Access Principles

Regardless of the method, follow these principles:

- **Rate limit** all automated requests — don't hammer servers
- **Minimize volume** — fetch only what you need for your personal search
- **Respect robots.txt** where applicable
- **Stop if asked** — if a platform blocks or rate-limits you, don't circumvent it

## Adding New Sources

Before automating a new job source, check:

1. Does it offer a public API or RSS feed? → Use that first
2. What does its Terms of Service say about automated access?
3. What does its robots.txt permit?

Prefer public APIs and open data. Use browser automation only when necessary and with awareness of the associated ToS considerations.
