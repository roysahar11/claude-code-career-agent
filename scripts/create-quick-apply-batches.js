#!/usr/bin/env node
/**
 * create-quick-apply-batches.js
 *
 * Reads master pipeline JSONs and creates batch files for quick-apply.
 * Each batch file contains 5-7 jobs with full descriptions + verdict metadata.
 *
 * Usage (pipeline mode - from daily-fetch):
 *   node scripts/create-quick-apply-batches.js \
 *     --master /tmp/pipeline-il-2026-02-15.json \
 *     --master /tmp/pipeline-intl-2026-02-15.json \
 *     --batch-size 6
 *
 * Usage (standalone mode - from quick-apply skill):
 *   node scripts/create-quick-apply-batches.js \
 *     --jobs '[{"url":"...","title":"...","company":"...","description":"..."}]' \
 *     --batch-size 6
 *
 * Output: /tmp/quick-apply-batch-{N}-{DATE}.md files
 * Stdout: JSON summary of created batch files (for orchestrator to parse with jq)
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    masterFiles: [],
    jobs: null,
    batchSize: 6,
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--master' && argv[i + 1]) {
      args.masterFiles.push(argv[++i]);
    } else if (argv[i] === '--jobs' && argv[i + 1]) {
      args.jobs = argv[++i];
    } else if (argv[i] === '--batch-size' && argv[i + 1]) {
      args.batchSize = parseInt(argv[++i], 10);
    }
  }

  return args;
}

function getDateStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function collectJobsFromMasters(masterFiles) {
  const jobs = [];

  for (const filePath of masterFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`Warning: Master file not found: ${filePath}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const entry of data) {
      if (
        entry.status === 'ACTIVE' &&
        entry.fetchStatus === 'OK' &&
        (entry.verdict === 'RELEVANT' || entry.verdict === 'DISCUSS')
      ) {
        jobs.push(entry);
      }
    }
  }

  return jobs;
}

function collectJobsFromInline(jsonStr) {
  return JSON.parse(jsonStr);
}

function formatJobEntry(job, index) {
  const lines = [];
  lines.push(`### ${index + 1}. ${job.title || 'Unknown Role'} @ ${job.company || 'Unknown Company'}`);
  lines.push('');

  // Location group: multiple locations for the same role
  if (job.locations && job.locations.length > 1) {
    const locParts = job.locations.map(l => `${l.locationCity} (${l.url})`).join(', ');
    lines.push(`- **Locations**: ${locParts}`);
    lines.push(`- **Location Cities**: ${job.locations.map(l => l.locationCity).join(', ')}`);
    lines.push(`- **URL**: ${job.url}`);
  } else {
    if (job.url) lines.push(`- **URL**: ${job.url}`);
    if (job.location) lines.push(`- **Location**: ${job.location}`);
    if (job.locationCity) lines.push(`- **Location City**: ${job.locationCity}`);
  }

  if (job.source) lines.push(`- **Source**: ${job.source}`);
  if (job.verdict) lines.push(`- **Verdict**: ${job.verdict}`);
  if (job.reasoning) lines.push(`- **Reasoning**: ${job.reasoning}`);
  if (job.bestResume) lines.push(`- **Best Resume**: ${job.bestResume}`);
  if (job.resumeScore) lines.push(`- **Resume Score**: ${job.resumeScore}/100`);
  if (job.notes) lines.push(`- **Notes**: ${job.notes}`);
  lines.push('');

  if (job.description) {
    lines.push('**Description:**');
    lines.push('');
    lines.push(job.description);
  } else {
    lines.push('**Description:** Not available');
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Group jobs that share company+title but differ in location.
 * Returns an array of items — each is either a single job or a merged
 * location group (one job with a `locations` array).
 */
function groupByLocation(jobs) {
  const groups = new Map();
  for (const job of jobs) {
    const key = `${(job.company || '').toLowerCase()}||${(job.title || '').toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }

  const result = [];
  for (const entries of groups.values()) {
    if (entries.length === 1) {
      result.push(entries[0]);
    } else {
      // Merge into one entry with locations array
      const primary = entries[0];
      const merged = { ...primary };
      merged.locations = entries.map(e => ({
        location: e.location || '',
        locationCity: e.locationCity || 'Remote',
        url: e.url || '',
      }));
      result.push(merged);
    }
  }
  return result;
}

function createBatches(jobs, batchSize) {
  const batches = [];
  let current = [];
  for (const job of jobs) {
    current.push(job);
    if (current.length >= batchSize) {
      batches.push(current);
      current = [];
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function main() {
  const args = parseArgs(process.argv);
  const date = getDateStr();

  let jobs;
  if (args.masterFiles.length > 0) {
    jobs = collectJobsFromMasters(args.masterFiles);
  } else if (args.jobs) {
    jobs = collectJobsFromInline(args.jobs);
  } else {
    console.error('Error: Provide --master <file> or --jobs <json>');
    process.exit(1);
  }

  if (jobs.length === 0) {
    console.log(JSON.stringify({ batches: [], totalJobs: 0, message: 'No jobs to process' }));
    return;
  }

  // Group same-company+title entries that differ by location
  const grouped = groupByLocation(jobs);
  const batches = createBatches(grouped, args.batchSize);
  const batchFiles = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const filePath = `/tmp/quick-apply-batch-${batchIdx + 1}-${date}.md`;

    const header = [
      `# Quick-Apply Batch ${batchIdx + 1} of ${batches.length}`,
      '',
      `**Date**: ${date}`,
      `**Jobs in batch**: ${batch.length}`,
      '',
      '---',
      '',
    ].join('\n');

    const body = batch.map((job, i) => formatJobEntry(job, i)).join('\n');
    fs.writeFileSync(filePath, header + body);
    batchFiles.push({
      path: filePath,
      jobCount: batch.length,
      jobs: batch.map(j => ({ title: j.title, company: j.company, verdict: j.verdict })),
    });
  }

  const summary = {
    batches: batchFiles,
    totalJobs: jobs.length,
    totalEntries: grouped.length,
    locationGroups: grouped.filter(j => j.locations && j.locations.length > 1).length,
    batchCount: batches.length,
    batchSize: args.batchSize,
  };

  console.log(JSON.stringify(summary));
}

main();
