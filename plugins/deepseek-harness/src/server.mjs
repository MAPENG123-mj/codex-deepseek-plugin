import { createInterface } from 'node:readline';
import { resolveWorkspacePath, selectModel } from './core.mjs';
import { loadConfig } from './config.mjs';
import { runHarnessTask } from './harness.mjs';
import { listHarnessModels as listModelsFromHarness } from './web-catalog.mjs';
import { assertWorkspaceWriteRoots, prepareHarnessRequest } from './intent.mjs';

const config = loadConfig();

const toolDefinitions = [
  {
    name: 'list_harness_models',
    description: 'List model IDs exposed by the active Harness provider route.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'harness',
    description: 'Delegate a natural-language request to DeepSeek Harness. Intent is inferred automatically: questions/research/reviews are read-only; clear requests to edit files use workspace-write. Include workspacePath when a local project is involved. Pass sessionId to continue a previous conversation.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', minLength: 1 },
        workspacePath: { type: 'string', minLength: 1 },
        model: { type: 'string' },
        timeoutSeconds: { type: 'integer', minimum: 30, maximum: 1800 },
        sessionId: { type: 'string', minLength: 1 },
      },
      required: ['task'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
];

async function listModels() {
  const catalog = await listModelsFromHarness(config);
  if (catalog.models.length === 0) throw new Error('Harness returned an empty model catalog.');
  return catalog;
}

async function callTool(name, args) {
  if (name === 'list_harness_models') {
    return listModels();
  }

  if (name !== 'harness') throw new Error(`Unknown tool: ${name}`);
  if (typeof args?.task !== 'string' || !args.task.trim()) throw new Error('task must be a non-empty string.');
  if (args.timeoutSeconds !== undefined && (!Number.isInteger(args.timeoutSeconds) || args.timeoutSeconds < 30 || args.timeoutSeconds > 1800)) {
    throw new Error('timeoutSeconds must be an integer from 30 through 1800.');
  }

  const request = prepareHarnessRequest(args);
  const requestedWorkspace = request.workspacePath ?? config.allowedRoots[0] ?? process.cwd();
  assertWorkspaceWriteRoots(request.intent, config.allowedRoots);
  const roots = config.allowedRoots.length > 0 ? config.allowedRoots : [process.cwd()];
  const workspacePath = resolveWorkspacePath(requestedWorkspace, roots);
  const permissionMode = request.permissionMode;
  const catalog = await listModels();
  const provider = config.provider || catalog.provider;
  const model = selectModel(catalog.models, args.model, config.defaultModel || catalog.defaultModel);
  const result = await runHarnessTask({
    task: request.task,
    workspacePath,
    model,
    provider,
    reasoningEffort: config.reasoningEffort,
    timeoutSeconds: args.timeoutSeconds,
    config,
    permissionMode,
    sessionId: request.sessionId,
  });
  return {
    intent: request.intent,
    status: result.status,
    error: result.error,
    sessionId: result.sessionId,
    provider,
    model,
    workspacePath,
    rawAnswer: result.answer,
  };
}

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return;
  if (message.id === undefined) return;

  try {
    let result;
    switch (message.method) {
      case 'initialize':
        result = {
          protocolVersion: message.params?.protocolVersion ?? '2025-03-26',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'local-deepseek-harness-bridge', version: '0.1.0' },
        };
        break;
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: toolDefinitions };
        break;
      case 'tools/call': {
        const value = await callTool(message.params?.name, message.params?.arguments ?? {});
        result = { content: [{ type: 'text', text: JSON.stringify(value) }] };
        break;
      }
      default:
        write({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found.' } });
        return;
    }
    write({ jsonrpc: '2.0', id: message.id, result });
  } catch (error) {
    if (message.method === 'tools/call') {
      write({ jsonrpc: '2.0', id: message.id, result: { isError: true, content: [{ type: 'text', text: error.message }] } });
    } else {
      write({ jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message } });
    }
  }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on('line', (line) => {
  try { void handle(JSON.parse(line)); } catch { /* Ignore malformed frames. */ }
});
