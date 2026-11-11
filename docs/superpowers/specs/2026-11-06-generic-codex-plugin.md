# Generic DeepSeek Harness Codex Plugin

## Goal

Package the local Harness bridge as a reusable, GitHub-distributable Codex desktop plugin that delegates one unified `harness` tool to each user's local DeepSeek Harness installation.

## User Workflows

- `research`: answer questions and inspect projects with Harness read-only access.
- `review`: review a diff or implementation without changing files.
- `execute`: implement or repair work inside a configured workspace root.
- Continue a Harness conversation by supplying the prior `sessionId` after clarification or a recoverable failure.
- Return the raw Harness answer, status, session ID, selected provider/model, and workspace so Codex can report it separately from its own review.

## Portability

- Do not bake in a machine-specific installation directory, provider endpoint, model, API key, or workspace path.
- Resolve the Harness CLI and settings from documented environment variables; use the Harness SDK profile defaults when provider settings are omitted.
- Support Windows, macOS, and Linux launch conventions.
- Keep secrets in Harness credential storage or user-provided environment variables. Never put keys in plugin files, logs, or MCP results.
- Use the current Codex desktop plugin manifest and local stdio MCP format, plus a repo marketplace entry for GitHub-based installation.

## Boundaries

- A local stdio MCP plugin runs only in a local Codex desktop context.
- `execute` must require an explicit workspace path and validate it against configured allowed roots.
- `research` and `review` run Harness with read-only permissions.
- GitHub distribution is in scope; pushing to GitHub and submission to an official public plugin directory are not.

## Acceptance Criteria

- A clean checkout has valid plugin, MCP, and marketplace JSON manifests.
- The MCP advertises one `harness` tool plus a model-list tool.
- Intent selection maps to read-only versus workspace-write Harness modes.
- `sessionId` continuation resumes the persisted Harness SDK session and returns only new output.
- Harness failures return structured status instead of being presented as successful answers.
- Tests cover schema, intent authorization, workspace scope, raw output, model selection, and session continuation.
- README explains platform prerequisites, user configuration, GitHub marketplace installation, troubleshooting, and limits.
