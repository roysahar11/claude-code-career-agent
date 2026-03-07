'use strict';

const RssParser = require('rss-parser');
const { makeJob, makeResult } = require('../lib/types');

const SOURCE = 'secret-tel-aviv';
const FEED_URL = 'https://jobs.secrettelaviv.com/wpjobboard/xml/rss/?filter=active&hide_filled%5B0%5D=1&sort_order=t1.is_featured+DESC%2C+t1.job_created_at+DESC%2C+t1.id+DESC';

const parser = new RssParser({
  customFields: {
    item: ['company_name', 'company_city'],
  },
});

/**
 * Strip HTML tags from RSS description content.
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
 * Extract a slug from the job URL to use as sourceId.
 */
function extractSlug(url) {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    // /job/some-job-title/ → some-job-title
    const match = pathname.match(/\/job\/([^/]+)/);
    return match ? match[1] : pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-');
  } catch {
    return url;
  }
}

/**
 * Convert an RSS item to StandardJob.
 */
function toStandardJob(item) {
  const categories = Array.isArray(item.categories) ? item.categories : [];
  const slug = extractSlug(item.link);

  return makeJob({
    id: `${SOURCE}:${slug}`,
    source: SOURCE,
    title: item.title || '',
    company: item.company_name || '',
    location: item.company_city || 'Israel',
    url: item.link || '',
    description: stripHtml(item.contentSnippet || item.content || item['content:encoded'] || ''),
    remote: categories.some(c => c.toLowerCase().includes('remote')),
    tags: categories,
    postedAt: item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : null,
    visaSponsorship: null,
    experienceLevel: null,
  });
}

/**
 * Main fetch function.
 *
 * @param {Object} options
 * @param {number} options.since - Unix epoch cutoff
 */
async function fetch({ since }) {
  let feed;
  try {
    feed = await parser.parseURL(FEED_URL);
  } catch (err) {
    return makeResult(SOURCE, [], [`Failed to fetch RSS: ${err.message}`]);
  }

  const jobs = (feed.items || [])
    .filter(item => {
      if (!item.link) return false;
      // Filter by date
      if (item.pubDate) {
        const posted = Math.floor(new Date(item.pubDate).getTime() / 1000);
        if (posted < since) return false;
      }
      return true;
    })
    .map(toStandardJob);

  return makeResult(SOURCE, jobs);
}

module.exports = { fetch };
