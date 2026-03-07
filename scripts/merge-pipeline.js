#!/usr/bin/env node
/**
 * merge-pipeline.js
 *
 * Merges job data from all sources into two master pipeline JSONs:
 *   /tmp/pipeline-il-{DATE}.json
 *   /tmp/pipeline-intl-{DATE}.json
 *
 * All sources output the lean schema (url, title, company, source, location,
 * description, notes). This script is a dumb concat → derive → dedup pipeline
 * with no field-guessing.
 *
 * Derived fields: locationCity (from location), status (always ACTIVE).
 * Title filtering happens after merge via LLM judgment in the orchestrator.
 *
 * Usage:
 *   node scripts/merge-pipeline.js --date 2026-02-24
 *
 * Input files (all in /tmp/, keyed by DATE):
 *   - linkedin-jobs-{DATE}.json         (LinkedIn Israel)
 *   - linkedin-jobs-intl-{DATE}.json    (LinkedIn International)
 *   - chrome-israeli-jobs-{DATE}.json   (AllJobs, Built In Israel, Wellfound)
 *   - whatsapp-jobs-{DATE}.json         (WhatsApp groups)
 *   - scraped-jobs-israeli-{DATE}.json  (Secret Tel Aviv, etc.)
 *   - scraped-jobs-international-{DATE}.json (Arbeitnow, SimplifyJobs, etc.)
 *
 * Missing files are treated as empty arrays (not an error).
 *
 * Output: JSON summary to stdout with counts per pipeline.
 */

const fs = require("fs");

// --- CLI ---
const args = process.argv.slice(2);
const dateIdx = args.indexOf("--date");
if (dateIdx === -1 || !args[dateIdx + 1]) {
  console.error("Usage: node scripts/merge-pipeline.js --date YYYY-MM-DD");
  process.exit(1);
}
const DATE = args[dateIdx + 1];

// --- Helpers ---

function loadJSON(path) {
  try {
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    if (!Array.isArray(data)) {
      console.error(`Warning: ${path} is not an array (got ${typeof data}), treating as empty`);
      return [];
    }
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      // File doesn't exist — expected for optional sources (e.g., no Chrome run)
      return [];
    }
    // Unexpected error (corrupt JSON, permission denied, etc.) — fail loudly
    console.error(`Error reading ${path}: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Extract a filesystem-safe city name from a full location string.
 *
 * Examples:
 *   "Raanana, Center District, Israel"          → "Raanana"
 *   "Tel Aviv-Yafo, Tel Aviv District, Israel (Hybrid)" → "Tel-Aviv-Yafo"
 *   "Berlin, Berlin, Germany (Remote)"           → "Berlin"
 *   "EMEA (Remote)"                              → "Remote"
 *   ""                                           → "Remote"
 *   "מרכז"                                      → "מרכז"
 *   "Ra'anana"                                   → "Raanana"
 *   "מספר מקומות"                                → "מספר-מקומות"
 */
function extractLocationCity(location) {
  let s = (location || "").trim();

  // Strip work-mode suffixes
  s = s.replace(/\s*\((Remote|Hybrid|On-site)\)\s*/gi, " ").trim();

  // If empty or a broad region with no city info, return Remote
  if (!s || /^(remote|worldwide|global|emea|apac|americas?)$/i.test(s)) return "Remote";

  // Take the first comma-separated segment (the city)
  const city = s.split(",")[0].trim();
  if (!city) return "Remote";

  // Sanitize for filesystem: replace spaces/apostrophes, remove non-safe chars
  return city
    .replace(/'/g, "")           // Ra'anana → Raanana
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/[^a-zA-Z0-9\u0590-\u05FF\-]/g, ""); // keep alphanumeric, Hebrew, hyphens
}

/**
 * Thin passthrough — trims, derives locationCity, sets status ACTIVE, forwards notes.
 */
function normalize(entry, fallbackSource) {
  return {
    url: (entry.url || "").trim(),
    title: (entry.title || "").trim(),
    company: (entry.company || "").trim(),
    source: entry.source || fallbackSource,
    location: (entry.location || "").trim(),
    locationCity: extractLocationCity((entry.location || "").trim()),
    description: entry.description || null,
    notes: entry.notes || null,
    status: "ACTIVE",
    ...(entry.downloadUrl ? { downloadUrl: entry.downloadUrl, fileName: entry.fileName } : {}),
  };
}

function dedup(entries) {
  // Phase 1: Identify listing-page URLs (shared by multiple distinct jobs).
  // These are search/listing pages (e.g., builtin.com/jobs/mena/israel) that
  // the Chrome scraper stored as the URL for every job on the page.
  // They must NOT be used for URL-based dedup.
  const urlCounts = {};
  for (const e of entries) {
    const url = e.url ? e.url.replace(/\/$/, "").toLowerCase() : null;
    if (url) urlCounts[url] = (urlCounts[url] || 0) + 1;
  }
  const listingPageUrls = new Set(
    Object.entries(urlCounts).filter(([, count]) => count > 2).map(([url]) => url)
  );

  // Phase 2: Dedup
  const seenUrls = new Set();
  const seenTitles = new Set();
  return entries.filter(e => {
    const urlKey = e.url ? e.url.replace(/\/$/, "").toLowerCase() : null;
    const isUniqueUrl = urlKey && !listingPageUrls.has(urlKey);

    // Dedup by URL — only for URLs that uniquely identify a single job
    if (isUniqueUrl && seenUrls.has(urlKey)) return false;

    // Dedup by company+title — but only when company is known.
    // Many AllJobs entries have empty/hidden company names, so "||DevOps Engineer"
    // would falsely dedup unrelated jobs at different hidden companies.
    const hasCompany = e.company && e.company.length > 0;
    if (hasCompany) {
      const baseKey = `${e.company}||${e.title}`.toLowerCase();

      if (e.locationCity && e.locationCity !== "Remote") {
        // Specific city: dedup against same city only
        const cityKey = `${baseKey}||${e.locationCity.toLowerCase()}`;
        if (seenTitles.has(cityKey)) return false;
        seenTitles.add(cityKey);
        seenTitles.add(baseKey); // mark base so no-city dupes are caught later
      } else {
        // No city / Remote: dedup against base
        if (seenTitles.has(baseKey)) return false;
        seenTitles.add(baseKey);
      }
    }

    if (isUniqueUrl) seenUrls.add(urlKey);
    return true;
  });
}

// --- Load sources ---
const scrapedIL = loadJSON(`/tmp/scraped-jobs-israeli-${DATE}.json`);
const linkedinIL = loadJSON(`/tmp/linkedin-jobs-${DATE}.json`);
const whatsapp = loadJSON(`/tmp/whatsapp-jobs-${DATE}.json`);
const chromeIL = loadJSON(`/tmp/chrome-israeli-jobs-${DATE}.json`);

const scrapedIntl = loadJSON(`/tmp/scraped-jobs-international-${DATE}.json`);
const linkedinIntl = loadJSON(`/tmp/linkedin-jobs-intl-${DATE}.json`);

// --- Build pipelines ---
let ilEntries = [
  ...scrapedIL.map(e => normalize(e, "secret-tel-aviv")),
  ...linkedinIL.map(e => normalize(e, "LinkedIn IL")),
  ...whatsapp.map(e => normalize(e, "WhatsApp")),
  ...chromeIL.map(e => normalize(e, e.source || "Chrome")),
];
ilEntries = dedup(ilEntries);

let intlEntries = [
  ...scrapedIntl.map(e => normalize(e, e.source || "arbeitnow")),
  ...linkedinIntl.map(e => normalize(e, "LinkedIn Intl")),
];
intlEntries = dedup(intlEntries);

// --- Write outputs ---
fs.writeFileSync(`/tmp/pipeline-il-${DATE}.json`, JSON.stringify(ilEntries, null, 2));
fs.writeFileSync(`/tmp/pipeline-intl-${DATE}.json`, JSON.stringify(intlEntries, null, 2));

// --- Summary ---
const summary = {
  israeli: {
    total: ilEntries.length,
    active: ilEntries.filter(e => e.status === "ACTIVE").length,
    withDescription: ilEntries.filter(e => e.description).length,
    withNotes: ilEntries.filter(e => e.notes).length,
  },
  international: {
    total: intlEntries.length,
    active: intlEntries.filter(e => e.status === "ACTIVE").length,
    withDescription: intlEntries.filter(e => e.description).length,
    withNotes: intlEntries.filter(e => e.notes).length,
  },
  outputFiles: {
    israeli: `/tmp/pipeline-il-${DATE}.json`,
    international: `/tmp/pipeline-intl-${DATE}.json`,
  },
};

console.log(JSON.stringify(summary, null, 2));
