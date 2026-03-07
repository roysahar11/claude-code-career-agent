'use strict';

/**
 * StandardJob — the lean schema all sources output.
 *
 * Fields exist for programmatic operations (dedup, filtering, directory naming).
 * Everything else goes in a free-text `notes` field for LLM consumption.
 *
 * @typedef {Object} StandardJob
 * @property {string} url           - Direct link to job posting (dedup, linking)
 * @property {string} title         - Job title (dedup, title filter)
 * @property {string} company       - Company name (dedup; empty string if unknown)
 * @property {string} source        - Source identifier (tracking)
 * @property {string} location      - Location string (dedup; empty string if unknown)
 * @property {string|null} description - Full description text, or null if unavailable
 * @property {string|null} notes    - Free-text source metadata for LLM (optional)
 * @property {string} [downloadUrl] - WhatsApp doc attachment URL (optional)
 * @property {string} [fileName]    - WhatsApp doc attachment filename (optional)
 */

/**
 * ScraperResult — what each scraper function returns.
 *
 * @typedef {Object} ScraperResult
 * @property {string} source      - Source identifier
 * @property {StandardJob[]} jobs - Array of jobs found
 * @property {string[]} errors    - Any errors encountered
 * @property {number} fetchedAt   - Unix timestamp of when the fetch ran
 * @property {{ total: number, filtered: number, errors: number }} stats
 */

const REQUIRED_JOB_FIELDS = ['source', 'title', 'url'];

/**
 * Validate a StandardJob object. Returns an array of error strings (empty = valid).
 */
function validateJob(job) {
  const errors = [];
  for (const field of REQUIRED_JOB_FIELDS) {
    if (!job[field] || typeof job[field] !== 'string' || !job[field].trim()) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }
  if (job.url && !/^https?:\/\//i.test(job.url)) {
    errors.push(`Invalid URL: ${job.url}`);
  }
  return errors;
}

/**
 * Build a StandardJob with defaults for optional fields.
 *
 * Accepts the same structured fields scrapers have always passed (remote, tags,
 * postedAt, visaSponsorship, experienceLevel) and converts them into the `notes`
 * free-text string. Scrapers don't need to change their call sites.
 */
function makeJob(fields) {
  const noteLines = [];
  if (fields.remote) noteLines.push('Remote position');
  if (fields.visaSponsorship === true) noteLines.push('Visa sponsorship offered');
  if (fields.visaSponsorship === false) noteLines.push('No visa sponsorship');
  if (fields.experienceLevel) noteLines.push(`Experience level: ${fields.experienceLevel}`);
  if (fields.tags && fields.tags.length) noteLines.push(`Tags: ${fields.tags.join(', ')}`);
  if (fields.postedAt) noteLines.push(`Posted: ${new Date(fields.postedAt * 1000).toISOString().slice(0, 10)}`);
  if (fields.notes) noteLines.push(fields.notes);

  return {
    url: fields.url,
    title: fields.title,
    company: fields.company || '',
    source: fields.source,
    location: fields.location || '',
    description: fields.description || null,
    notes: noteLines.length ? noteLines.join('\n') : null,
    ...(fields.downloadUrl ? { downloadUrl: fields.downloadUrl, fileName: fields.fileName } : {}),
  };
}

/**
 * Build a ScraperResult.
 */
function makeResult(source, jobs, errors = []) {
  return {
    source,
    jobs,
    errors,
    fetchedAt: Math.floor(Date.now() / 1000),
    stats: {
      total: jobs.length + errors.length,
      filtered: jobs.length,
      errors: errors.length,
    },
  };
}

module.exports = { validateJob, makeJob, makeResult, REQUIRED_JOB_FIELDS };
