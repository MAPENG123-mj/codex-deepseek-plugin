import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectModel, resolveWorkspacePath } from '../src/core.mjs';
import { assistantText, runStatus } from '../src/harness.mjs';
import { catalogModelsForProvider } from '../src/web-catalog.mjs';

test('selects the current model by default and accepts an available explicit model', () => {
  const models = ['gpt-6-sol', 'deepseek-chat'];
  assert.equal(selectModel(models, undefined, 'gpt-6-sol'), 'gpt-6-sol');
  assert.equal(selectModel(models, 'deepseek-chat', 'gpt-6-sol'), 'deepseek-chat');
});

test('rejects a model that is not available from the configured provider', () => {
  assert.throws(() => selectModel(['gpt-6-sol'], 'missing-model', 'gpt-6-sol'), /not available/);
});

test('resolves a workspace inside an allowed root', () => {
  assert.equal(resolveWorkspacePath(process.cwd(), [process.cwd()]), process.cwd());
});

test('rejects a workspace outside an allowed root', () => {
  const testDirectory = path.dirname(fileURLToPath(import.meta.url));
  assert.throws(() => resolveWorkspacePath(process.cwd(), [testDirectory]), /outside/);
});

test('extracts assistant text from Harness assistant/message event data', () => {
  assert.equal(assistantText([
    { type: 'user/message', data: { content: [{ type: 'text', text: 'ignore' }] } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'OK' }] } } },
  ]), 'OK');
});

test('reports agent errors instead of treating turn/end as success', () => {
  assert.deepEqual(runStatus([
    { type: 'agent/error', data: { message: 'provider rejected request' } },
    { type: 'turn/end', data: {} },
  ], ''), { status: 'failed', error: 'provider rejected request' });
});

test('reports a transport failure when retries end without an assistant response', () => {
  assert.deepEqual(runStatus([
    { type: 'llm/retry', data: { failure: { code: 'TRANSPORT', message: 'Connection error.' } } },
    { type: 'turn/end', data: {} },
  ], ''), { status: 'failed', error: 'Harness ended without an assistant response after TRANSPORT: Connection error.' });
});

test('requires turn/end and assistant text before reporting a Harness run as successful', () => {
  assert.deepEqual(runStatus([
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'OK' }] } } },
    { type: 'turn/end', data: {} },
  ], 'OK'), { status: 'succeeded', error: null });
});

test('catalog selection only returns models for the configured provider', () => {
  const catalog = {
    groups: [
      { id: 'deepseek-account', models: [{ id: 'deepseek-flash' }] },
      { id: 'openai', models: [{ id: 'gpt-6-sol' }, { id: 'gpt-5.6-sol' }] },
    ],
    routableProviders: ['deepseek-account', 'openai'],
  };
  assert.deepEqual(catalogModelsForProvider(catalog, 'openai'), ['gpt-6-sol', 'gpt-5.6-sol']);
});
