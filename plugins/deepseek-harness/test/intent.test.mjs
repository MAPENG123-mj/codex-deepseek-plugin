import assert from 'node:assert/strict';
import test from 'node:test';
import { assertWorkspaceWriteRoots, inferHarnessIntent, prepareHarnessRequest } from '../src/intent.mjs';

test('infers read-only research for questions and project assessments', () => {
  assert.equal(inferHarnessIntent('问 Harness 今天几号'), 'research');
  assert.equal(inferHarnessIntent('看下这个项目，评估一下'), 'research');
  assert.equal(inferHarnessIntent('How do I implement this feature?'), 'research');
  assert.equal(inferHarnessIntent('这个功能怎么实现？'), 'research');
});

test('infers execute only for clear requests to change files or code', () => {
  assert.equal(inferHarnessIntent('帮我实现这个需求'), 'execute');
  assert.equal(inferHarnessIntent('帮我写个脚本'), 'execute');
  assert.equal(inferHarnessIntent('在这个项目里添加重试逻辑'), 'execute');
  assert.equal(inferHarnessIntent('帮我在这个仓库加一个分页功能'), 'execute');
  assert.equal(inferHarnessIntent('把标题改一下'), 'execute');
  assert.equal(inferHarnessIntent('Could you implement input validation?'), 'execute');
  assert.equal(inferHarnessIntent('修复登录 bug'), 'execute');
  assert.equal(inferHarnessIntent('Please add validation to this module'), 'execute');
});

test('infers review for explicit diff or implementation review requests', () => {
  assert.equal(inferHarnessIntent('审查当前 diff，只指出问题'), 'review');
  assert.equal(inferHarnessIntent('Review this implementation without editing files'), 'review');
});

test('research and review use read-only permissions', () => {
  const base = { task: 'inspect', workspacePath: 'C:/repo' };
  assert.equal(prepareHarnessRequest({ ...base, intent: 'research' }).permissionMode, 'read-only');
  assert.equal(prepareHarnessRequest({ ...base, intent: 'review' }).permissionMode, 'read-only');
});

test('execute requires an explicit workspace and allows workspace writes', () => {
  assert.throws(() => prepareHarnessRequest({ intent: 'execute', task: 'edit' }), /workspacePath/);
  assert.equal(prepareHarnessRequest({ intent: 'execute', task: 'edit', workspacePath: 'C:/repo' }).permissionMode, 'workspace-write');
});

test('review requires a workspace and stays read-only', () => {
  assert.throws(() => prepareHarnessRequest({ intent: 'review', task: 'review diff' }), /workspacePath/);
  assert.equal(prepareHarnessRequest({ intent: 'review', task: 'review diff', workspacePath: 'C:/repo' }).permissionMode, 'read-only');
});

test('invalid intent is rejected', () => {
  assert.throws(() => prepareHarnessRequest({ intent: 'delete', task: 'x', workspacePath: 'C:/repo' }), /intent/);
});

test('continuation requires an explicit workspace', () => {
  assert.throws(() => prepareHarnessRequest({ intent: 'research', task: 'follow up', sessionId: 'session-1' }), /workspacePath/);
});

test('infers intent when the caller does not provide one', () => {
  assert.equal(prepareHarnessRequest({ task: '问 Harness 今天几号' }).intent, 'research');
  assert.equal(prepareHarnessRequest({ task: '帮我修复这个 bug', workspacePath: 'C:/repo' }).intent, 'execute');
});

test('requires configured allowed roots after automatic execute inference', () => {
  const request = prepareHarnessRequest({ task: '帮我修复这个 bug', workspacePath: 'C:/repo' });
  assert.equal(request.intent, 'execute');
  assert.throws(() => assertWorkspaceWriteRoots(request.intent, []), /HARNESS_WORKSPACE_ROOTS/);
  assert.doesNotThrow(() => assertWorkspaceWriteRoots(request.intent, ['C:/repo']));
});
