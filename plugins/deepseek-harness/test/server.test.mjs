import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startClient() {
  const child = spawn(process.execPath, [path.join(root, 'src', 'server.mjs')], {
    cwd: root,
    env: { ...process.env, HARNESS_WORKSPACE_ROOTS: root, OPENAI_API_KEY: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = createInterface({ input: child.stdout });
  const pending = new Map();
  lines.on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const resolve = pending.get(message.id);
    if (resolve) {
      pending.delete(message.id);
      resolve(message);
    }
  });

  let id = 0;
  return {
    child,
    request(method, params) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`Timed out waiting for ${method}.`));
        }, 3000);
        pending.set(requestId, (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, ...(params ? { params } : {}) })}\n`);
      });
    },
    notify(method, params) {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
  };
}

test('MCP server exposes model listing and task tools and rejects an outside workspace', async () => {
  const client = await startClient();
  try {
    const initialized = await client.request('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    assert.equal(initialized.result.serverInfo.name, 'local-deepseek-harness-bridge');
    client.notify('notifications/initialized');

    const listed = await client.request('tools/list');
    assert.deepEqual(listed.result.tools.map((tool) => tool.name), ['list_harness_models', 'harness']);
    assert.equal(listed.result.tools[1].annotations.readOnlyHint, false);
    assert.equal(listed.result.tools[1].inputSchema.properties.intent, undefined);
    assert.deepEqual(listed.result.tools[1].inputSchema.required, ['task']);
    assert.equal(listed.result.tools[1].inputSchema.required.includes('intent'), false);
    assert.ok(listed.result.tools[1].inputSchema.properties.sessionId);

    const rejected = await client.request('tools/call', {
      name: 'harness',
      arguments: { intent: 'execute', task: 'No-op', workspacePath: 'D:\\dsh\\home' },
    });
    assert.equal(rejected.result.isError, true);
    assert.match(rejected.result.content[0].text, /outside the configured allowed roots/);
  } finally {
    client.child.kill();
  }
});
