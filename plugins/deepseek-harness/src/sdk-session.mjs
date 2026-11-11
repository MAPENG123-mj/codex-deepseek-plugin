import { randomUUID } from 'node:crypto';

export async function runSdkSession({ runtime, task, workspacePath, provider, model, reasoningEffort, sessionId: requestedSessionId }) {
  const sessionId = requestedSessionId ?? randomUUID();
  const initialized = await runtime.request('initialize', {
    cwd: workspacePath,
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  });

  if (requestedSessionId) await runtime.request('session/resume', { sessionId });
  await runtime.request('session/prompt', {
    sessionId,
    contentBlocks: [{ type: 'text', text: task }],
  });
  await runtime.request('session/wait', { sessionId });

  const events = runtime.notifications
    .filter((notification) => notification.method === 'session.event' && notification.params?.sessionId === sessionId)
    .map((notification) => notification.params.event);
  const route = [...events].reverse().find((event) => event?.type === 'request/context')?.data;

  return {
    sessionId,
    server: initialized?.serverInfo,
    provider: route?.provider ?? provider,
    model: route?.model ?? model,
    events,
  };
}
