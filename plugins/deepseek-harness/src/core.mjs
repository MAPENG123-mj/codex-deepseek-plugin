import fs from 'node:fs';
import path from 'node:path';

export function selectModel(models, requested, defaultModel) {
  const selected = requested ?? defaultModel;
  if (!selected) throw new Error('No Harness model is configured.');
  if (!models.includes(selected)) throw new Error(`Model "${selected}" is not available from the configured provider.`);
  return selected;
}

export function resolveWorkspacePath(requested, allowedRoots) {
  if (!requested) throw new Error('workspacePath is required.');
  if (!Array.isArray(allowedRoots) || allowedRoots.length === 0) {
    throw new Error('No allowed workspace roots are configured.');
  }

  const workspace = fs.realpathSync(path.resolve(requested));
  if (!fs.statSync(workspace).isDirectory()) throw new Error('workspacePath must be a directory.');

  const allowed = allowedRoots.some((root) => {
    const resolvedRoot = fs.realpathSync(path.resolve(root));
    const relative = path.relative(resolvedRoot, workspace);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  });
  if (!allowed) throw new Error('workspacePath is outside the configured allowed roots.');
  return workspace;
}

