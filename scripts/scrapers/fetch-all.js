#!/usr/bin/env node
'use strict';

/**
 * fetch-all.js — Entry point for running web scrapers.
 *
 * Usage:
 *   node scripts/scrapers/fetch-all.js --scope <israeli|international|all> [--since <epoch>]
 *
 * Runs all scrapers for the given scope in parallel, merges results,
 * deduplicates, writes output to /tmp/scraped-jobs-{scope}-{DATE}.json,
 * updates state, and prints a summary to stdout.
 */

const fs = require('fs');
const path = require('path');
const { dedup } = require('./lib/dedup');
const { setLastFetch } = require('./lib/state');

// --- Scraper Registry ---
// Each entry: { module: relative path, scope: 'israeli' | 'international' }
const SCRAPERS = [
  { module: './international/arbeitnow', scope: 'international' },
  { module: './international/simplify-jobs', scope: 'international' },
  { module: './israeli/secret-tel-aviv', scope: 'israeli' },
];

// --- CLI Parsing ---
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { scope: null, since: null, simplifyCategories: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scope' && args[i + 1]) {
      parsed.scope = args[++i];
    } else if (args[i] === '--since' && args[i + 1]) {
      parsed.since = parseInt(args[++i], 10);
    } else if (args[i] === '--simplify-categories' && args[i + 1]) {
      parsed.simplifyCategories = args[++i].split(',').map(s => s.trim());
    }
  }

  if (!parsed.scope || !['israeli', 'international', 'all'].includes(parsed.scope)) {
    console.error('Usage: node fetch-all.js --scope <israeli|international|all> [--since <epoch>] [--simplify-categories "Software,AI/ML/Data"]');
    process.exit(1);
  }

  // Default --since to 24h ago
  if (!parsed.since) {
    parsed.since = Math.floor(Date.now() / 1000) - 86400;
  }

  return parsed;
}

// --- Main ---
async function main() {
  const { scope, since, simplifyCategories } = parseArgs();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Filter scrapers by scope
  const selected = SCRAPERS.filter(s =>
    scope === 'all' || s.scope === scope
  );

  if (selected.length === 0) {
    console.log(JSON.stringify({ scope, jobs: [], scrapers: [], errors: ['No scrapers for scope: ' + scope] }));
    process.exit(0);
  }

  // Run all selected scrapers in parallel
  const results = await Promise.allSettled(
    selected.map(async (entry) => {
      try {
        const scraperModule = require(entry.module);
        const opts = { since };
        if (entry.module.includes('simplify-jobs') && simplifyCategories) {
          opts.categories = simplifyCategories;
        }
        const result = await scraperModule.fetch(opts);
        return result;
      } catch (err) {
        return {
          source: entry.module,
          jobs: [],
          errors: [`Scraper load/run error: ${err.message}`],
          fetchedAt: Math.floor(Date.now() / 1000),
          stats: { total: 0, filtered: 0, errors: 1 },
        };
      }
    })
  );

  // Collect all jobs and errors
  let allJobs = [];
  const allErrors = [];
  const scraperSummaries = [];

  for (const r of results) {
    const result = r.status === 'fulfilled' ? r.value : {
      source: 'unknown',
      jobs: [],
      errors: [r.reason?.message || 'Unknown error'],
      fetchedAt: Math.floor(Date.now() / 1000),
      stats: { total: 0, filtered: 0, errors: 1 },
    };

    allJobs.push(...result.jobs);
    allErrors.push(...result.errors.map(e => `[${result.source}] ${e}`));

    scraperSummaries.push({
      source: result.source,
      found: result.jobs.length,
      errors: result.errors.length,
    });

    // Update state for successful scrapers
    if (result.errors.length === 0) {
      setLastFetch(result.source, result.fetchedAt);
    }
  }

  // Deduplicate
  const beforeDedup = allJobs.length;
  allJobs = dedup(allJobs);
  const dupsRemoved = beforeDedup - allJobs.length;

  // Write output file(s) — for 'all' scope, write separate files per scope
  const outputPaths = [];
  if (scope === 'all') {
    for (const s of ['israeli', 'international']) {
      const scopeJobs = allJobs.filter(j => {
        const scraperEntry = SCRAPERS.find(sc => sc.module.includes(j.source));
        return scraperEntry && scraperEntry.scope === s;
      });
      if (scopeJobs.length > 0) {
        const outPath = `/tmp/scraped-jobs-${s}-${date}.json`;
        fs.writeFileSync(outPath, JSON.stringify(scopeJobs, null, 2));
        outputPaths.push(outPath);
      }
    }
  } else {
    const outPath = `/tmp/scraped-jobs-${scope}-${date}.json`;
    fs.writeFileSync(outPath, JSON.stringify(allJobs, null, 2));
    outputPaths.push(outPath);
  }

  // Print summary to stdout
  const summary = {
    scope,
    date,
    since: new Date(since * 1000).toISOString(),
    totalJobs: allJobs.length,
    duplicatesRemoved: dupsRemoved,
    scrapers: scraperSummaries,
    errors: allErrors,
    outputFiles: outputPaths,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
