import os from 'node:os';
import path from 'node:path';

function splitList(value, delimiter) {
  return String(value ?? '').split(delimiter).map((item) => item.trim()).filter(Boolean);
}

export function loadConfig(env = process.env, platform = process.platform) {
  const userData = env.DSH_HOME || env.DEEPSEEK_HARNESS_HOME || path.join(os.homedir(), '.deepseek-harness');
  const installDir = env.DSH_INSTALL_DIR || env.DEEPSEEK_HARNESS_INSTALL_DIR || '';
  const dshCommand = env.DSH_CLI || env.DEEPSEEK_HARNESS_CLI || (platform === 'win32' ? 'dsh.cmd' : 'dsh');
  const dshArgs = splitList(env.DSH_CLI_ARGS || env.DEEPSEEK_HARNESS_CLI_ARGS, '\n');
  const patchPath = env.DSH_SDK_PATCH || '';
  const provider = env.HARNESS_PROVIDER || '';
  const defaultModel = env.HARNESS_DEFAULT_MODEL || '';
  const separator = platform === 'win32' ? ';' : ':';
  const allowedRoots = splitList(env.HARNESS_WORKSPACE_ROOTS || env.DEEPSEEK_HARNESS_WORKSPACE_ROOTS, separator);

  return {
    platform,
    userData,
    dshHome: userData,
    installDir,
    dshCommand,
    dshArgs,
    sdkProfile: env.HARNESS_SDK_PROFILE || 'sdk',
    webProfile: env.HARNESS_WEB_PROFILE || 'web',
    webPatchPath: env.HARNESS_WEB_PATCH || env.DSH_SDK_PATCH || '',
    patchPath,
    provider,
    defaultModel,
    reasoningEffort: env.HARNESS_REASONING_EFFORT || '',
    allowedRoots,
  };
}
