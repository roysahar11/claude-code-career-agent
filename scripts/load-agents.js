#!/usr/bin/env node
// Reads AGENT.md files from .claude/agents/ and outputs JSON for --agents flag
// Usage: node scripts/load-agents.js [agent-name ...]
// If no names given, loads all agents from .claude/agents/

const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const agentsDir = path.join(projectDir, '.claude', 'agents');

function parseAgentMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const agent = {};

  // Parse YAML frontmatter (simple key-value + list parsing)
  let currentKey = null;
  for (const line of frontmatter.split('\n')) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();
      if (value) {
        agent[currentKey] = value;
      } else {
        agent[currentKey] = [];
      }
    } else if (currentKey && line.match(/^\s+-\s+(.+)$/)) {
      const item = line.match(/^\s+-\s+(.+)$/)[1];
      if (!Array.isArray(agent[currentKey])) agent[currentKey] = [];
      agent[currentKey].push(item);
    }
  }

  // Build the --agents JSON structure
  const result = {
    description: agent.description || '',
    prompt: body,
  };

  if (agent.tools) {
    const tools = agent.tools.split(',').map(t => t.trim());
    // Only set explicit tools if none use wildcards.
    // Wildcard patterns (e.g. mcp__*) aren't expanded by --agents JSON,
    // so omitting tools lets the subagent inherit all parent tools instead.
    const hasWildcard = tools.some(t => t.includes('*'));
    if (!hasWildcard) {
      result.tools = tools;
    }
  }
  if (agent.skills && Array.isArray(agent.skills)) {
    result.skills = agent.skills;
  }

  return { name: agent.name, config: result };
}

function loadAgents(names) {
  const agents = {};

  if (names && names.length > 0) {
    for (const name of names) {
      // Try directory format: agents/name/AGENT.md
      const dirPath = path.join(agentsDir, name, 'AGENT.md');
      // Try flat format: agents/name.md
      const flatPath = path.join(agentsDir, `${name}.md`);

      const filePath = fs.existsSync(dirPath) ? dirPath : fs.existsSync(flatPath) ? flatPath : null;
      if (!filePath) {
        process.stderr.write(`Agent "${name}" not found\n`);
        continue;
      }

      const parsed = parseAgentMd(filePath);
      if (parsed) agents[parsed.name] = parsed.config;
    }
  } else {
    // Load all agents
    if (!fs.existsSync(agentsDir)) {
      process.stderr.write(`Agents directory not found: ${agentsDir}\n`);
      process.exit(1);
    }

    for (const entry of fs.readdirSync(agentsDir)) {
      const dirPath = path.join(agentsDir, entry, 'AGENT.md');
      const flatPath = path.join(agentsDir, entry);

      if (fs.existsSync(dirPath)) {
        const parsed = parseAgentMd(dirPath);
        if (parsed) agents[parsed.name] = parsed.config;
      } else if (entry.endsWith('.md') && !entry.startsWith('.')) {
        const parsed = parseAgentMd(flatPath);
        if (parsed) agents[parsed.name] = parsed.config;
      }
    }
  }

  return agents;
}

const names = process.argv.slice(2);
const agents = loadAgents(names.length > 0 ? names : null);
process.stdout.write(JSON.stringify(agents));
