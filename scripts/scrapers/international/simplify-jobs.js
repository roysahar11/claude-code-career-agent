'use strict';

const https = require('https');
const { makeJob, makeResult } = require('../lib/types');

const SOURCE = 'simplify-jobs';
const DATA_URL = 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json';


/**
 * Fetch the full listings JSON from GitHub.
 */
function fetchListings() {
  return new Promise((resolve, reject) => {
    https.get(DATA_URL, { headers: { 'Accept': 'application/json', 'User-Agent': 'job-search-personal' } }, (res) => {
      // Handle redirects (GitHub raw sometimes redirects)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, { headers: { 'Accept': 'application/json', 'User-Agent': 'job-search-personal' } }, (res2) => {
          let body = '';
          res2.on('data', chunk => body += chunk);
          res2.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
          });
        }).on('error', reject);
        return;
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

/**
 * Map sponsorship field to our visa boolean.
 */
function parseSponsorship(val) {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower === 'does not sponsor' || lower === 'no') return false;
  if (lower === 'sponsors' || lower === 'yes') return true;
  return null; // "Other", unknown
}

/**
 * Convert a SimplifyJobs listing to StandardJob.
 */
function toStandardJob(raw) {
  const locations = Array.isArray(raw.locations) ? raw.locations.join('; ') : '';

  return makeJob({
    id: `${SOURCE}:${raw.id}`,
    source: SOURCE,
    title: raw.title || '',
    company: raw.company_name || '',
    location: locations,
    url: raw.url || '',
    description: null, // SimplifyJobs doesn't include descriptions
    remote: locations.toLowerCase().includes('remote'),
    tags: raw.category ? [raw.category] : [],
    postedAt: raw.date_posted || null,
    visaSponsorship: parseSponsorship(raw.sponsorship),
    experienceLevel: 'entry', // This is the New-Grad repo — all are entry-level
  });
}

/**
 * Main fetch function.
 *
 * @param {Object} options
 * @param {number} options.since - Unix epoch cutoff
 * @param {string[]} options.categories - Categories to include (required — read from config/search.md)
 */
async function fetch({ since, categories }) {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return makeResult(SOURCE, [], [
      'Missing required "categories" parameter. Read the SimplifyJobs relevant categories from config/search.md and pass them via --simplify-categories.'
    ]);
  }
  const relevantCategories = new Set(categories);
  const errors = [];
  let listings;

  try {
    listings = await fetchListings();
  } catch (err) {
    return makeResult(SOURCE, [], [`Failed to fetch listings: ${err.message}`]);
  }

  if (!Array.isArray(listings)) {
    return makeResult(SOURCE, [], ['Listings data is not an array']);
  }

  const jobs = listings
    .filter(l => {
      // Must be active and visible
      if (!l.active || !l.is_visible) return false;
      // Must be in a relevant category
      if (!relevantCategories.has(l.category)) return false;
      // Must be newer than since cutoff
      if (l.date_posted && l.date_posted < since) return false;
      // Must have a URL
      if (!l.url) return false;
      return true;
    })
    .map(toStandardJob);

  return makeResult(SOURCE, jobs, errors);
}

module.exports = { fetch };
