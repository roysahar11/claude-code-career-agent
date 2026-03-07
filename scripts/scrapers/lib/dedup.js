'use strict';

/**
 * Normalize a URL for deduplication: strip utm_* params, trailing slashes,
 * lowercase the hostname.
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Remove utm_* and tracking params
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'refId' || key === 'trackingId') {
        u.searchParams.delete(key);
      }
    }
    // Sort remaining params for consistency
    u.searchParams.sort();
    // Lowercase hostname, strip trailing slash
    let normalized = u.origin.toLowerCase() + u.pathname.replace(/\/+$/, '');
    const qs = u.searchParams.toString();
    if (qs) normalized += '?' + qs;
    return normalized;
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Deduplicate an array of StandardJob objects.
 *
 * Two tiers (conservative — avoids merging distinct roles):
 * 1. Exact URL match (after normalization)
 * 2. Same company + exact title (case-insensitive)
 *
 * When a duplicate is found, keep the entry with more data (longer description).
 */
function dedup(jobs) {
  const urlMap = new Map();    // normalizedUrl -> job
  const companyTitleMap = new Map(); // "company|title" -> job

  const result = [];

  for (const job of jobs) {
    const normUrl = normalizeUrl(job.url);
    const companyTitleKey = `${(job.company || '').toLowerCase().trim()}|${(job.title || '').toLowerCase().trim()}`;

    // Check URL match
    const urlDup = urlMap.get(normUrl);
    if (urlDup) {
      // Keep the one with more data
      if (hasMoreData(job, urlDup)) {
        replaceDup(result, urlDup, job);
        urlMap.set(normUrl, job);
        companyTitleMap.set(companyTitleKey, job);
      }
      continue;
    }

    // Check company + title match
    const ctDup = companyTitleMap.get(companyTitleKey);
    if (ctDup) {
      if (hasMoreData(job, ctDup)) {
        replaceDup(result, ctDup, job);
        urlMap.set(normUrl, job);
        companyTitleMap.set(companyTitleKey, job);
      }
      continue;
    }

    // No duplicate — add
    result.push(job);
    urlMap.set(normUrl, job);
    companyTitleMap.set(companyTitleKey, job);
  }

  return result;
}

function hasMoreData(a, b) {
  const aLen = (a.description || '').length;
  const bLen = (b.description || '').length;
  return aLen > bLen;
}

function replaceDup(arr, oldJob, newJob) {
  const idx = arr.indexOf(oldJob);
  if (idx !== -1) arr[idx] = newJob;
}

module.exports = { dedup, normalizeUrl };
