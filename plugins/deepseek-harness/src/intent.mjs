const writeVerbs = '实现|修复|修改|改|编写|写|添加|新增|加入|加上|加|创建|删除|移除|替换|重构|更新|编辑|补充|补上|改造|构建|开发|处理|implement|fix|add|create|delete|remove|replace|refactor|update|edit|write|build|modify|change';
const writeAtStart = new RegExp(`^(?:请|please)?\\s*(?:${writeVerbs})`, 'i');
const writeDirective = new RegExp(`(?:帮我|请帮我|请你(?:直接)?|麻烦(?:你)?(?:直接)?|直接(?:帮我)?|我要你|希望你|让(?:harness|你))[^。！？!?]{0,12}(?:${writeVerbs})`, 'i');
const englishDirective = new RegExp(`\\b(?:please|i want you to|i need you to|can you|could you)\\s+(?:(?:please)\\s+)?(?:${writeVerbs})\\b`, 'i');
const imperativeTarget = /把[^。！？!?]{1,60}(?:改|替换|添加|新增|删除|重写)|\b(?:implement|fix|add|create|delete|remove|replace|refactor|update|edit|write|build|modify|change)\b.{0,24}\b(?:code|file|feature|bug|test|module|readme)\b/i;
const projectWrite = new RegExp(`(?:在|为)[^。！？!?]{0,32}(?:${writeVerbs})`, 'i');
const followUpWrite = /(?:然后|并(?:且)?|之后|再)(?:帮我|请)?\s*(?:修复|修改|新增|添加|删除|创建|重构|更新|实现|改造|补上|补充|fix|modify|add|remove|refactor|update|implement)/i;
const reviewTerms = /审查|审核|评审|review|audit/i;
const explanationQuestion = /^(?:请问\s*)?(?:怎么|如何|怎样|为什么|为啥|what\b|how\b|why\b|can you explain\b|could you explain\b)/i;
const questionRequest = /(?:怎么|如何|怎样|为什么|为啥|要不要|是否应该|能不能|可以吗|how to|how do i|what if|should i)/i;

export function inferHarnessIntent(task) {
  const text = String(task ?? '').trim();
  if (explanationQuestion.test(text) || questionRequest.test(text)) return 'research';
  if (writeAtStart.test(text) || writeDirective.test(text) || englishDirective.test(text) || imperativeTarget.test(text) || projectWrite.test(text) || followUpWrite.test(text)) {
    if (!/^(?:怎么|如何|怎样|为什么|为啥|what|how|why)\b/i.test(text)) return 'execute';
  }
  if (reviewTerms.test(text)) return 'review';
  return 'research';
}

export function assertWorkspaceWriteRoots(intent, allowedRoots) {
  if (intent === 'execute' && allowedRoots.length === 0) {
    throw new Error('Set HARNESS_WORKSPACE_ROOTS before using execute intent.');
  }
}

export function prepareHarnessRequest({ intent, task, workspacePath, sessionId }) {
  const selectedIntent = intent ?? inferHarnessIntent(task);
  if (!['research', 'review', 'execute'].includes(selectedIntent)) throw new Error('intent must be research, review, or execute.');
  if (typeof task !== 'string' || !task.trim()) throw new Error('task must be a non-empty string.');
  if (selectedIntent === 'review' && !workspacePath) throw new Error('workspacePath is required for review intent.');
  if (selectedIntent === 'execute' && !workspacePath) throw new Error('workspacePath is required for execute intent.');
  if (sessionId && !workspacePath) throw new Error('workspacePath is required when continuing a Harness session.');

  const permissionMode = selectedIntent === 'execute' ? 'workspace-write' : 'read-only';
  const instruction = selectedIntent === 'research' || selectedIntent === 'review'
    ? `${task}\n\nThis is a read-only ${selectedIntent} task. Do not modify files or perform write operations.`
    : task;

  return {
    intent: selectedIntent,
    task: instruction,
    workspacePath,
    permissionMode,
    sessionId,
  };
}
