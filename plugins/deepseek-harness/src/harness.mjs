import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { runSdkSession } from './sdk-session.mjs';

function launchHarness({ cwd, config, permissionMode = 'workspace-write' }) {
  const desktopRuntime = Boolean(config.installDir && config.platform === 'win32');
  const executable = desktopRuntime ? path.join(config.installDir, 'DeepSeek Harness.exe') : config.dshCommand;
  const cliEntry = desktopRuntime
    ? path.join(config.installDir, 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js')
    : null;
  const args = desktopRuntime
    ? ['--expose-internals', cliEntry, '--profile', 'sdk']
    : [...(config.dshArgs ?? []), '--profile', config.sdkProfile ?? 'sdk'];
  if (config.patchPath) args.push('--patch', config.patchPath);
  const windowsShim = config.platform === 'win32' && /\.(cmd|bat)$/i.test(executable);
  const child = spawn(executable, args, {
    cwd,
    env: {
      ...process.env,
      ...(desktopRuntime ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      DSH_HOME: config.dshHome ?? config.userData,
      DSH_PERMISSION_MODE: permissionMode,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: windowsShim,
  });

  let nextId = 0;
  let stdoutBuffer = '';
  const pending = new Map();
  const notifications = [];
  let stderr = '';
  let closed = false;
  let rejectPending;
  const closedPromise = new Promise((resolve) => child.once('close', (code) => {
    closed = true;
    rejectPending?.(new Error(stderr.trim() || `Harness exited with code ${code}.`));
    resolve();
  }));

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');
    while (true) {
      const newline = stdoutBuffer.indexOf('\n');
      if (newline < 0) break;
      const line = stdoutBuffer.slice(0, newline).trim();
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id !== undefined && pending.has(message.id)) {
        const settle = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) settle.reject(new Error(message.error.message ?? 'Harness SDK request failed.'));
        else settle.resolve(message.result);
      } else if (message.method) {
        notifications.push(message);
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString('utf8')).slice(-4000); });
  child.on('error', (error) => {
    closed = true;
    for (const settle of pending.values()) settle.reject(error);
    pending.clear();
  });
  child.on('close', (code) => {
    for (const settle of pending.values()) {
      settle.reject(new Error(stderr.trim() || `Harness exited with code ${code}.`));
    }
    pending.clear();
  });

  const request = (method, params) => new Promise((resolve, reject) => {
    if (closed) return reject(new Error('Harness SDK process is not running.'));
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })}\n`);
  });

  const close = async () => {
    if (closed) return;
    try { await request('shutdown'); } catch {}
    child.stdin.end();
    let closeTimeout;
    const closeTimer = new Promise((resolve) => { closeTimeout = setTimeout(resolve, 3000); });
    await Promise.race([closedPromise, closeTimer]);
    clearTimeout(closeTimeout);
    if (!closed) child.kill();
  };

  rejectPending = (error) => {
    for (const settle of pending.values()) settle.reject(error);
    pending.clear();
  };

  const abort = (error) => {
    rejectPending(error);
    child.kill();
  };

  return {
    notifications,
    request,
    close,
    abort,
  };
}

export function assistantText(events) {
  const chunks = [];
  for (const event of events) {
    if (event?.type !== 'assistant/message') continue;
    for (const block of event.data?.message?.content ?? []) {
      if (block?.type === 'text' && typeof block.text === 'string') chunks.push(block.text);
    }
  }
  return chunks.join('\n').trim();
}

export function runStatus(events) {
  const failure = events.find((event) => event?.type === 'agent/error');
  if (failure) {
    const detail = failure.data?.message ?? failure.data?.error?.message ?? 'Harness agent reported an error.';
    return { status: 'failed', error: sanitizeError(detail) };
  }
  if (!events.some((event) => event?.type === 'turn/end')) return { status: 'running', error: null };
  if (assistantText(events)) return { status: 'succeeded', error: null };

  const failedAttempt = [...events].reverse().find((event) => event?.type === 'llm/retry' && event.data?.failure);
  if (failedAttempt) {
    const failureDetail = failedAttempt.data.failure;
    const code = failureDetail.code ?? 'LLM';
    const message = failureDetail.message ?? 'Model request failed.';
    return { status: 'failed', error: sanitizeError(`Harness ended without an assistant response after ${code}: ${message}`) };
  }
  return { status: 'failed', error: 'Harness ended without an assistant response.' };
}

function sanitizeError(value) {
  return String(value)
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api[_-]?key|token|secret)\s*[:=]\s*)[^\s,;"']+/gi, '$1[REDACTED]');
}

export async function runHarnessTask({ task, workspacePath, model, provider, reasoningEffort, config, timeoutSeconds = 900, permissionMode = 'workspace-write', sessionId: requestedSessionId }) {
  const sessionId = requestedSessionId ?? randomUUID();
  const runtime = launchHarness({
    cwd: workspacePath,
    config,
    permissionMode,
  });
  const timer = setTimeout(() => runtime.abort(new Error(`Harness task exceeded ${timeoutSeconds} seconds.`)), timeoutSeconds * 1000);

  try {
    const run = await runSdkSession({
      runtime,
      task,
      workspacePath,
      provider,
      model,
      reasoningEffort,
      sessionId: requestedSessionId,
    });
    const events = run.events;
    const answer = assistantText(events);
    const status = runStatus(events);
    return {
      sessionId: run.sessionId,
      server: run.server,
      provider: run.provider,
      model: run.model,
      ...status,
      answer,
    };
  } finally {
    clearTimeout(timer);
    await runtime.close();
  }
}
