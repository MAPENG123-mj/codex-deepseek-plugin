import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';

export function buildWebLaunch(config, platform = config.platform ?? process.platform) {
  if (config.installDir && platform === 'win32') {
    const cliEntry = path.join(config.installDir, 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-desktop-host', 'lib', 'cli.js');
    const args = ['--expose-internals', cliEntry, '--profile', config.webProfile ?? 'web', '--no-open', '--port', '0'];
    if (config.webPatchPath ?? config.patchPath) args.splice(4, 0, '--patch', config.webPatchPath ?? config.patchPath);
    return {
      command: path.join(config.installDir, 'DeepSeek Harness.exe'),
      args,
      electronNode: true,
    };
  }

  return {
    command: config.dshCommand ?? (platform === 'win32' ? 'dsh.cmd' : 'dsh'),
    args: [
      ...(config.dshArgs ?? []),
      '--profile', config.webProfile ?? 'web',
      ...((config.webPatchPath ?? config.patchPath) ? ['--patch', config.webPatchPath ?? config.patchPath] : []),
      '--no-open', '--port', '0',
    ],
    electronNode: false,
  };
}

function spawnWeb(config, args, cwd) {
  const launch = buildWebLaunch(config);
  const windowsShim = config.platform === 'win32' && /\.(cmd|bat)$/i.test(launch.command);
  return spawn(launch.command, [...launch.args, ...args], {
    cwd,
    env: {
      ...process.env,
      ...(launch.electronNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      DSH_HOME: config.dshHome ?? config.userData,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: windowsShim,
  });
}

function waitForUrl(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const lines = createInterface({ input: child.stdout });
    const timer = setTimeout(() => {
      lines.close();
      child.kill();
      reject(new Error('Harness Web service did not start in time.'));
    }, timeoutMs);
    const onLine = (line) => {
      const marker = 'dsh web:';
      const index = line.indexOf(marker);
      if (index < 0) return;
      const candidate = line.slice(index + marker.length).trim().split(/\s/)[0];
      if (!candidate.startsWith('http://127.0.0.1:') && !candidate.startsWith('http://localhost:')) return;
      clearTimeout(timer);
      lines.close();
      resolve(new URL(candidate));
    };
    lines.on('line', onLine);
    child.once('error', (error) => {
      clearTimeout(timer);
      lines.close();
      reject(error);
    });
  });
}

export function catalogModelsForProvider(catalog, provider) {
  const group = catalog?.groups?.find((item) => item.id === provider);
  if (!group || !catalog?.routableProviders?.includes(provider)) {
    throw new Error(`Harness provider "${provider}" is not routable in the current model catalog.`);
  }
  return [...new Set(group.models.flatMap((model) => {
    if (typeof model === 'string') return model.trim() ? [model.trim()] : [];
    const id = typeof model?.id === 'string' ? model.id.trim() : '';
    return id ? [id] : [];
  }))];
}

export async function listHarnessModels(config) {
  const { timeoutMs = 45000, provider } = config;
  const child = spawnWeb(config, [], process.cwd());

  try {
    const launchUrl = await waitForUrl(child, timeoutMs);
    const token = launchUrl.searchParams.get('token');
    if (!token) throw new Error('Harness Web did not provide a local session token.');

    const bootstrap = new URL('/', launchUrl.origin);
    bootstrap.searchParams.set('token', token);
    const bootstrapResponse = await fetch(bootstrap, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const setCookie = bootstrapResponse.headers.get('set-cookie');
    const cookie = setCookie?.split(';', 1)[0];
    if (!cookie) throw new Error('Harness Web did not establish a local session.');

    const endpoint = new URL('/api/session/modelCatalog', launchUrl.origin);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: 'codex-model-catalog', method: 'session/modelCatalog', payload: { args: {} } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Harness model catalog returned HTTP ${response.status}.`);
    const envelope = await response.json();
    if (!envelope?.result?.ok) throw new Error(envelope?.result?.error?.message ?? 'Harness model catalog request failed.');
    const catalog = envelope.result.value;
    const selectedProvider = provider || catalog?.default?.provider;
    if (!selectedProvider) throw new Error('Harness model catalog has no default provider.');
    return {
      provider: selectedProvider,
      defaultModel: config.defaultModel || (catalog.default.provider === selectedProvider ? catalog.default.model : undefined),
      models: catalogModelsForProvider(catalog, selectedProvider),
    };
  } finally {
    if (child.exitCode === null) child.kill();
    if (child.exitCode === null) await new Promise((resolve) => child.once('close', resolve));
  }
}
