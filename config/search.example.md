# Job Search Configuration

## Scope

- **International**: <!-- true or false — set to false to skip all international sources (LinkedIn International, international scrapers) -->

## Scrapers

<!-- Enable or disable individual web scrapers. Disabled scrapers are skipped by fetch-all.js. -->

| Scraper | Scope | Enabled | Description |
|---------|-------|---------|-------------|
| secret-tel-aviv | israeli | true | Israeli tech jobs via RSS from Secret Tel Aviv |
| arbeitnow | international | true | European jobs (DACH focus) via Arbeitnow API |
| simplify-jobs | international | true | US new-grad/entry-level positions from SimplifyJobs GitHub repo |

## LinkedIn Searches

<!-- Configure one or more LinkedIn search profiles. Each needs a geographic target and keywords.
To find your geoId: search LinkedIn Jobs for your target location, then extract the geoId parameter from the URL.
Experience levels: 1=Internship, 2=Entry level, 3=Associate, 4=Mid-Senior level, 5=Director, 6=Executive -->

### Israel
- **geoId**: 101620260
- **Keywords**: <!-- Comma-separated role keywords — e.g., DevOps Engineer, Full Stack Developer, Junior Software Developer, Junior Software Engineer -->
- **Experience levels**: <!-- e.g., 1,2 for internship + entry level -->

### International
<!-- Optional second search profile for international roles. Remove this section if not searching internationally. -->
- **Locations**: <!-- Comma-separated — e.g., European Union, Germany, Netherlands, Remote -->
- **Keywords**: <!-- e.g., DevOps Engineer, Full Stack Developer, Junior Software Developer -->
- **Experience levels**: <!-- e.g., 1,2 -->

## Chrome Sources (manual-mode only)

<!-- Job boards that require browser automation (no public API). Add, remove, or modify based on your target market. -->

### AllJobs
- **URL template**: https://www.alljobs.co.il/SearchResultVer2.aspx?page=1&position={POSITION_CODES}&type=&source=hp_sb
- **Position codes**: <!-- Site-specific category codes — e.g., 11577 (DevOps), 11571 (Full Stack) -->
- **Keywords**: <!-- e.g., DevOps, Full Stack, Junior Developer -->

### Built In Israel
- **URL base**: https://builtin.com/jobs/mena/israel
- **Keywords**: <!-- e.g., devops, full stack, developer, engineer -->

### Wellfound
- **URL base**: https://wellfound.com/location/israel
- **Keywords**: <!-- e.g., DevOps, Full Stack, Developer -->

## Web Scrapers

### SimplifyJobs
- **Relevant categories**: <!-- e.g., Software, AI/ML/Data — see the SimplifyJobs GitHub repo for available categories -->

## WhatsApp Groups

<!-- List WhatsApp groups where job postings are shared. Get group IDs from WAHA API.
To find group IDs, use the WhatsApp skill to list your groups. -->

| Name | Group ID |
|------|----------|
| <!-- Group name --> | <!-- group-id@g.us --> |
| <!-- Group name --> | <!-- group-id@g.us --> |

## Filtering
- **Max applicants**: <!-- Maximum LinkedIn applicant count before skipping a posting — e.g., 30. Lower = more selective, higher = more inclusive. -->
