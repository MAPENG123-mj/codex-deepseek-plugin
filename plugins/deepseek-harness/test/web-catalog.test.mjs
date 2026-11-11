import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { buildWebLaunch, catalogModelsForProvider } from '../src/web-catalog.mjs';

test('launches the generic Harness CLI with the selected profile and optional patch', () => {
  const launch = buildWebLaunch({
    platform: 'linux',
    dshCommand: '/opt/harness/bin/dsh',
    dshArgs: ['--verbose'],
    webProfile: 'sdk',
    webPatchPath: '/home/user/harness.yml',
  });
  assert.deepEqual(launch, {
    command: '/opt/harness/bin/dsh',
    args: ['--verbose', '--profile', 'sdk', '--patch', '/home/user/harness.yml', '--no-open', '--port', '0'],
    electronNode: false,
  });
});

test('uses a PATH-resolved dsh command without embedding a machine path', () => {
  const launch = buildWebLaunch({ platform: 'darwin' });
  assert.equal(launch.command, 'dsh');
  assert.equal(launch.args.includes('--profile'), true);
  assert.equal(launch.args.includes('--patch'), false);
});

test('retains the explicitly configured Windows desktop runtime compatibility route', () => {
  const launch = buildWebLaunch({ installDir: 'C:/Apps/Harness', webProfile: 'sdk' }, 'win32');
  assert.equal(launch.command, path.win32.join('C:/Apps/Harness', 'DeepSeek Harness.exe'));
  assert.equal(launch.args[0], '--expose-internals');
  assert.equal(launch.args.includes('--no-open'), true);
  assert.equal(launch.args.at(-1), '0');
  assert.equal(launch.electronNode, true);
});

test('filters the model catalog to routable models for the selected provider', () => {
  assert.deepEqual(catalogModelsForProvider({
    routableProviders: ['deepseek-official', 'openai'],
    groups: [
      { id: 'deepseek-official', models: [{ id: 'deepseek-chat' }] },
      { id: 'openai', models: [{ id: 'external-model' }] },
    ],
  }, 'deepseek-official'), ['deepseek-chat']);
});
