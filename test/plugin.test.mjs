import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('plugin manifests expose the local MCP without machine-specific paths or credentials', async () => {
  const plugin = await json('../plugins/deepseek-harness/plugin.json');
  const pluginPackage = await json('../plugins/deepseek-harness/package.json');
  const mcp = await json('../plugins/deepseek-harness/mcp.json');
  const marketplace = await json('../.agents/plugins/marketplace.json');
  assert.equal(plugin.name, 'deepseek-harness');
  assert.equal(plugin.version, pluginPackage.version);
  assert.equal(mcp.mcpServers['deepseek-harness'].command, 'node');
  assert.equal(marketplace.plugins[0].source.path, './plugins/deepseek-harness');
  const serialized = JSON.stringify({ plugin, mcp, marketplace });
  assert.doesNotMatch(serialized, /D:\\\\|C:\\\\Users\\\\|api\\.724ai\\.org|OPENAI_API_KEY\s*[:=]/i);
});

test('workflow skill describes raw Harness results and independent Codex review', async () => {
  const skill = await readFile(new URL('../plugins/deepseek-harness/skills/deepseek-harness/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /rawAnswer/);
  assert.match(skill, /independently inspect/i);
  assert.match(skill, /sessionId/);
  assert.match(skill, /does not provide an intent or mode/i);
});
