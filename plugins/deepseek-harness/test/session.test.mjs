import assert from 'node:assert/strict';
import test from 'node:test';
import { runSdkSession } from '../src/sdk-session.mjs';
import { assistantText, runStatus } from '../src/harness.mjs';

function createRuntime() {
  const calls = [];
  const runtime = {
    notifications: [],
    async request(method, params) {
      calls.push({ method, params });
      if (method === 'initialize') return { serverInfo: { name: 'test-runtime' } };
      if (method === 'session/prompt') {
        const sessionId = params.sessionId;
        runtime.notifications.push(
          { method: 'session.event', params: { sessionId, event: { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'new answer' }] } } } } },
          { method: 'session.event', params: { sessionId, event: { type: 'turn/end', data: {} } } },
          { method: 'session.event', params: { sessionId: 'other-session', event: { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'unrelated' }] } } } } },
        );
        return { messageId: 'prompt-1' };
      }
      return {};
    },
  };
  return { runtime, calls };
}

test('new SDK session initializes, prompts, and waits without resume', async () => {
  const { runtime, calls } = createRuntime();
  const result = await runSdkSession({
    runtime,
    task: 'answer this',
    workspacePath: 'C:/repo',
    provider: 'openai',
    model: 'model-a',
    reasoningEffort: 'medium',
  });

  assert.deepEqual(calls.map(({ method }) => method), ['initialize', 'session/prompt', 'session/wait']);
  assert.match(result.sessionId, /^[0-9a-f-]{36}$/i);
  assert.equal(calls[1].params.sessionId, result.sessionId);
  assert.equal(assistantText(result.events), 'new answer');
  assert.equal(runStatus(result.events).status, 'succeeded');
});

test('omits provider and model when the user wants Harness profile defaults', async () => {
  const { runtime, calls } = createRuntime();
  await runSdkSession({ runtime, task: 'Question', workspacePath: '/repo' });
  assert.deepEqual(calls[0].params, { cwd: '/repo' });
});

test('continuation resumes the exact session before prompting and returns only its new events', async () => {
  const { runtime, calls } = createRuntime();
  const result = await runSdkSession({
    runtime,
    task: 'answer the follow-up',
    workspacePath: 'C:/repo',
    provider: 'openai',
    model: 'model-a',
    reasoningEffort: 'medium',
    sessionId: 'persisted-session',
  });

  assert.deepEqual(calls.map(({ method }) => method), ['initialize', 'session/resume', 'session/prompt', 'session/wait']);
  assert.deepEqual(calls[1].params, { sessionId: 'persisted-session' });
  assert.deepEqual(calls[2].params.contentBlocks, [{ type: 'text', text: 'answer the follow-up' }]);
  assert.equal(calls[2].params.sessionId, 'persisted-session');
  assert.equal(result.sessionId, 'persisted-session');
  assert.equal(assistantText(result.events), 'new answer');
  assert.equal(runStatus(result.events).status, 'succeeded');
});
