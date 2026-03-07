'use strict';

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(__dirname, '..', '..', '..', 'state');
const STATE_FILE = path.join(STATE_DIR, 'scraper-state.json');

/**
 * Read the full state object. Returns {} if file doesn't exist.
 */
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write the full state object.
 */
function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Get lastFetch timestamp for a source. Returns 0 if never fetched.
 */
function getLastFetch(source) {
  const state = readState();
  return (state[source] && state[source].lastFetch) || 0;
}

/**
 * Update lastFetch timestamp for a source.
 */
function setLastFetch(source, timestamp) {
  const state = readState();
  state[source] = { ...state[source], lastFetch: timestamp || Math.floor(Date.now() / 1000) };
  writeState(state);
}

module.exports = { readState, writeState, getLastFetch, setLastFetch, STATE_FILE };
