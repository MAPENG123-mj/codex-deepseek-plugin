---
name: deepseek-harness
description: Delegate research, code review, and workspace-scoped implementation to the user's local DeepSeek Harness runtime. Use when the user asks to use Harness, asks for Harness's original response, or asks for independent agent implementation/review.
---

# DeepSeek Harness Workflow

Use the `deepseek-harness` MCP tools. The main tool is `harness`. Infer the permission level from the user's natural-language request; the user does not provide an intent or mode.

## Intents

- Questions, explanations, project investigation, feasibility assessments, and reviews run with read-only permissions. Include a workspace path when inspecting a local repository.
- Clear requests to implement, add, fix, edit, delete, or otherwise change files run with workspace-write permissions. Always provide the exact workspace path. The connector checks it against the user's configured allowed roots.
- If the wording is ambiguous about whether files should change, treat it as read-only. Ask the user only when the requested outcome truly depends on making a change.

The connector infers intent from the task text. The MCP schema intentionally does not expose an intent parameter.

## Delegation and Follow-up

1. Clarify the task from the conversation context. Ask the user only when a decision materially affects the result and cannot be inferred.
2. Call `harness` with a concise, complete task, the target workspace when applicable, and an optional model selected from `list_harness_models`. Do not require the user to name a mode.
3. Preserve the returned `sessionId`. If Harness asks a question, returns a recoverable failure, or needs more constraints, ask the user or resolve the issue, then call `harness` again with that `sessionId` and the new prompt. Keep the same intent and workspace for the resumed run.
4. Treat a returned `status` other than `succeeded` as incomplete. Report its status and error; do not describe the run as successful.

## Reporting Harness Output

- The MCP `rawAnswer` is Harness's response text. When the user asks for the original or verbatim response, return `rawAnswer` unchanged and do not prepend a summary.
- For research and review requests, show the Harness result separately from Codex's assessment. Attribute observations to Harness and verify important claims against local source or other available evidence before endorsing them.
- Do not present the connector's metadata or Codex's own analysis as Harness-authored text.

## Independent Review After Execution

After a successful `execute` run:

1. Independently inspect the actual workspace diff; the Harness status alone is not proof of completion.
2. Run the relevant tests and checks independently.
3. If you find a defect, either repair it directly or continue the same Harness session with the specific issue and verification expectation.
4. Report the Harness raw response separately when useful, then give Codex's review findings and verification results.

## Model Selection

Use the configured default model unless the user chooses another. Before selecting a non-default model, call `list_harness_models` and only choose a model listed for the currently configured provider.
