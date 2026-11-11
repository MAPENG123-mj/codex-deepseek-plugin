# DeepSeek Harness for Codex

A local Codex desktop plugin that delegates research, code review, and implementation tasks to the DeepSeek Harness installation on your computer. Harness returns its raw response and run status; Codex can then inspect the workspace diff and run tests independently.

This plugin includes a local stdio MCP server. It does not upload your repository to a hosted bridge, bundle Harness, or contain any API keys. It is intended for Codex desktop and local execution; it is not a cloud plugin. GitHub marketplace distribution is sufficient; this project does not target the official public plugin directory.

## What It Does

The main `harness` tool infers the task type from natural language; users do not need to choose or pass an intent. Internally it applies one of three permission modes:

| Intent | Permission | Use |
| --- | --- | --- |
| `research` | Read-only | Ask questions, inspect a project, or assess feasibility |
| `review` | Read-only | Review a diff or implementation without changing files |
| `execute` | Workspace write | Clearly requested implementation or repair inside an explicitly allowed workspace |

The tool returns `rawAnswer`, `status`, `sessionId`, selected provider/model, and workspace. If Harness asks a follow-up question or reports a recoverable failure, pass the returned `sessionId` to continue that same Harness conversation. A non-success status is incomplete and must not be presented as completed work.

Questions, explanations, project assessments, and reviews are read-only. Clear requests to add, change, fix, or remove files are treated as execute. Ambiguous requests default to read-only; Codex asks before writing only when the intended change cannot be inferred.

Codex should keep Harness's raw response separate from its own assessment. After `execute`, Codex should inspect the actual diff and run relevant tests; Harness's completion message alone is not verification.

`list_harness_models` reads the model catalog from the locally configured Harness provider and returns model IDs only.

## Requirements

- Codex desktop with local plugin/MCP support
- Node.js 22 or newer available as `node`
- DeepSeek Harness installed locally, with its `dsh` CLI/runtime available
- A provider, model, and credentials configured in your Harness SDK profile or Harness credential store
- An explicitly configured set of allowed workspace roots before using `execute`

The exact Harness command and SDK profile packaging can differ between Harness releases and operating systems. The bridge supports `DSH_CLI` to select the executable. On Windows, the default is `dsh.cmd`; on macOS and Linux it is `dsh`. Set `DSH_CLI_ARGS` to newline-separated launcher arguments if your installation needs a wrapper or custom SDK profile.

## Install From GitHub

Replace `<owner>/<repo>` with the GitHub repository path after you publish this repository:

```sh
codex plugin marketplace add <owner>/<repo> --ref main
codex plugin add deepseek-harness@deepseek-harness-local
```

Start a new Codex desktop conversation after installation so the plugin's tool and skill are loaded. To install from a local checkout during development, add the checkout path as a marketplace source and install the same plugin name.

### Local Checkout on Windows

To test this checkout from PowerShell, resolve the currently installed Codex CLI from `PATH`:

```powershell
$codex = (Get-Command codex.exe -ErrorAction Stop).Source
& $codex plugin marketplace add 'D:\codex\workspaces\deepseek-harness-bridge'
& $codex plugin add deepseek-harness@deepseek-harness-local
& $codex plugin list
```

Do not add `--ref main` to a local filesystem path. `--ref` is only for GitHub/Git marketplace sources. Resolving `codex.exe` from `PATH` also avoids stale versioned executable paths.

## Configure Your Machine

Set environment variables in the environment used to launch Codex, then restart Codex. Keep secrets in the Harness credential store or in a secret manager/environment variable; never put secrets in this repository or paste them into a chat.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_CLI` | Harness CLI executable or wrapper path | `dsh.cmd` on Windows, `dsh` elsewhere |
| `DSH_CLI_ARGS` | Newline-separated arguments for a custom CLI wrapper | empty |
| `DSH_HOME` | Harness data and credential directory | `~/.deepseek-harness` |
| `DSH_INSTALL_DIR` | Optional desktop-install directory when using its bundled runtime | empty |
| `DSH_SDK_PATCH` | Optional Harness SDK profile patch file | none |
| `HARNESS_SDK_PROFILE` | Harness SDK profile name | `sdk` |
| `HARNESS_PROVIDER` | Optional provider route override | Harness SDK profile default |
| `HARNESS_DEFAULT_MODEL` | Optional model route override | Harness SDK profile default |
| `HARNESS_REASONING_EFFORT` | Optional provider-supported reasoning effort | Harness/model default |
| `HARNESS_WORKSPACE_ROOTS` | Allowed root directories (`;` on Windows, `:` on macOS/Linux) | none |
| `HARNESS_WEB_PROFILE` | Harness profile used to read the model catalog | `web` |
| `HARNESS_WEB_PATCH` | Optional patch for the temporary local model-catalog service | none |

By default, the plugin uses the active Harness SDK profile's provider, model, and reasoning defaults. Set provider/model overrides only when you intentionally want the plugin to use a route different from the profile default. For other endpoint or credential routing, configure the SDK profile patch with Harness's supported provider settings; keep secret values in environment variables or Harness credential storage.

The plugin does not guess an allowed workspace root. Configure `HARNESS_WORKSPACE_ROOTS` before `execute`; paths are resolved and checked against these roots. Research/review also use the configured root when a local workspace is supplied. Avoid granting roots that contain unrelated private data.

## Example Requests

Research a repository and show Harness's report before Codex's assessment:

```text
Use the harness tool to inspect this repository at <path> and assess its architecture and main risks. Return evidence and uncertainties. Show Harness's rawAnswer separately, then give your independent Codex assessment.
```

Implement a requirement, then have Codex verify it:

```text
Use the harness tool to implement <requirement> in <path>. After Harness returns, inspect the actual diff and run relevant tests independently. If a test fails, continue the same sessionId with the failure and ask Harness to fix it, then verify again.
```

Continue after Harness asks a question:

```text
Continue the Harness session <sessionId>. The user clarified: <answer>. Apply that constraint and report the remaining questions or completion status.
```

## Development

```sh
npm test
npm start
```

The test suite does not require API credentials. A live end-to-end check requires a working local Harness installation and configured model credentials. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## Troubleshooting

- **CLI not found:** put `dsh` on the Codex launch environment's `PATH`, or set `DSH_CLI` to its full path. On Windows, use the `.cmd` shim when applicable.
- **SDK runtime does not start:** verify the installed Harness version includes the SDK profile and its SDK JSON-RPC server plugin. Use `DSH_CLI_ARGS` for a vendor-specific wrapper; do not point it at a Web-only profile.
- **No model route or credentials:** configure the provider/model in the Harness SDK profile or its profile patch, then restart Codex. Do not expose the key while diagnosing.
- **Workspace rejected:** set the appropriate allowed root in `HARNESS_WORKSPACE_ROOTS`; the connector rejects paths outside it after resolving the path.
- **Tools missing in an existing chat:** start a new Codex conversation or restart the desktop app to reload the installed plugin.
- **Harness returns a question or error:** use the returned `sessionId` to continue the same Harness conversation. Report any non-success status as incomplete.

## License

MIT. See [LICENSE](LICENSE).
