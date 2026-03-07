'use strict';

const https = require('https');
const { makeJob, makeResult } = require('../lib/types');

const SOURCE = 'arbeitnow';
const API_BASE = 'https://www.arbeitnow.com/api/job-board-api';
const PER_PAGE = 25;
const MAX_PAGES = 20; // Safety limit

/**
 * Fetch a single page from the Arbeitnow API.
 */
function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}?page=${page}`;
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.data || []);
        } catch (err) {
          reject(new Error(`JSON parse error on page ${page}: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Strip HTML tags from a string. Basic approach — sufficient for job descriptions.
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Determine experience level from job_types array.
 */
function parseExperienceLevel(jobTypes) {
  if (!Array.isArray(jobTypes)) return null;
  const joined = jobTypes.join(' ').toLowerCase();
  if (joined.includes('intern') || joined.includes('student')) return 'entry';
  if (joined.includes('junior') || joined.includes('entry') || joined.includes('graduate')) return 'entry';
  if (joined.includes('senior') || joined.includes('lead') || joined.includes('principal')) return 'senior';
  if (joined.includes('mid') || joined.includes('professional') || joined.includes('experienced')) return 'mid';
  return null;
}

/**
 * Convert an Arbeitnow API job object to StandardJob.
 */
function toStandardJob(raw) {
  return makeJob({
    id: `${SOURCE}:${raw.slug}`,
    source: SOURCE,
    title: raw.title || '',
    company: raw.company_name || '',
    location: raw.location || '',
    url: raw.url || `https://www.arbeitnow.com/view/${raw.slug}`,
    description: stripHtml(raw.description),
    remote: !!raw.remote,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    postedAt: raw.created_at || null,
    visaSponsorship: null, // Not available in API
    experienceLevel: parseExperienceLevel(raw.job_types),
  });
}

/**
 * Main fetch function. Paginates through the API, collecting jobs newer than `since`.
 *
 * @param {Object} options
 * @param {number} options.since - Unix epoch cutoff — skip jobs older than this
 */
async function fetch({ since }) {
  const errors = [];
  const jobs = [];
  let page = 1;
  let reachedOldJobs = false;

  while (page <= MAX_PAGES && !reachedOldJobs) {
    let pageJobs;
    try {
      pageJobs = await fetchPage(page);
    } catch (err) {
      // HTML response on high page numbers means end of data, not an error
      if (err.message.includes('Unexpected token')) break;
      errors.push(`Page ${page}: ${err.message}`);
      break;
    }

    if (!pageJobs || pageJobs.length === 0) break;

    for (const raw of pageJobs) {
      // Skip jobs older than cutoff
      if (raw.created_at && raw.created_at < since) {
        reachedOldJobs = true;
        continue;
      }
      jobs.push(toStandardJob(raw));
    }

    // If we got fewer than a full page, we're at the end
    if (pageJobs.length < PER_PAGE) break;

    page++;
  }

  return makeResult(SOURCE, jobs, errors);
}

module.exports = { fetch };
