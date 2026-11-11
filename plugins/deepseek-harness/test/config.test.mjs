import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';

test('uses portable defaults for a clean plugin installation', () => {
  const config = loadConfig({}, 'linux');
  assert.equal(config.dshCommand, 'dsh');
  assert.equal(config.provider, '');
  assert.equal(config.defaultModel, '');
  assert.equal(config.patchPath, '');
  assert.deepEqual(config.allowedRoots, []);
});

test('loads user model, provider, credential-env name, and roots without reading secret values', () => {
  const config = loadConfig({
    HARNESS_PROVIDER: 'openai',
    HARNESS_DEFAULT_MODEL: 'custom-model',
    HARNESS_WORKSPACE_ROOTS: '/repo-a:/repo-b',
  }, 'linux');
  assert.equal(config.provider, 'openai');
  assert.equal(config.defaultModel, 'custom-model');
  assert.deepEqual(config.allowedRoots, ['/repo-a', '/repo-b']);
});

test('uses the desktop command shim on Windows unless configured explicitly', () => {
  assert.equal(loadConfig({}, 'win32').dshCommand, 'dsh.cmd');
  assert.equal(loadConfig({ DSH_CLI: 'C:/Harness/dsh.cmd' }, 'win32').dshCommand, 'C:/Harness/dsh.cmd');
});

test('leaves Harness route defaults to its SDK profile unless user overrides them', () => {
  const config = loadConfig({ HARNESS_PROVIDER: 'openai', HARNESS_DEFAULT_MODEL: 'my-model' }, 'linux');
  assert.equal(config.provider, 'openai');
  assert.equal(config.defaultModel, 'my-model');
});
