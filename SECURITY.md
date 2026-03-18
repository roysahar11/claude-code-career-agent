# Security

## Reporting a Vulnerability

If you discover a security issue, please report it privately rather than opening a public issue.

**How to report:** Use [GitHub's private vulnerability reporting](https://github.com/roysahar11/appliable/security/advisories/new) to submit a report. You can also email roysahar11@gmail.com.

**What to expect:** I'll acknowledge the report within a few days, investigate, and work on a fix. I'll keep you updated on progress.

## What Counts as a Security Issue

- **PII in committed files** — Personal data (names, emails, phone numbers, addresses) accidentally included in the public repo
- **Credential exposure** — API keys, tokens, or secrets in code or config
- **Malicious contributions** — A PR or contribution that exfiltrates data, introduces backdoors, or does something harmful

## User Responsibility

This project stores sensitive personal data in your local `profile/`, `config/`, and `Applications/` directories. These are gitignored by default, but you should be aware:

- **Never commit** your actual `profile/*.md` or `config/*.md` files to a public repo — they contain personal information
- **Never commit** `.env` files or API keys
- If using the `/publish` skill, review the PII check results before pushing
- Your WhatsApp session tokens (if using the WhatsApp integration) should stay in the WhatsApp skill's own `.env` file, which is gitignored
