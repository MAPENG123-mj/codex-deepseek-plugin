<<<<<<< HEAD
# codex-deepseek-plugin
在codex调用deep seek harness。
=======
# DeepSeek Harness for Codex

A Codex desktop plugin that lets Codex delegate research, code review, and workspace-scoped implementation to a local DeepSeek Harness installation. The plugin returns Harness's raw answer and session status so Codex can present the original result separately from its independent review.

The plugin package lives in [`plugins/deepseek-harness`](plugins/deepseek-harness/). It uses a local stdio MCP server, so tasks and repository files stay on the user's computer. Harness and its provider credentials are installed/configured separately.

## Install From GitHub

After this repository is pushed, replace `<owner>/<repo>` with its GitHub path:

```sh
codex plugin marketplace add <owner>/<repo> --ref main
codex plugin add deepseek-harness@deepseek-harness-local
```

Then configure the local Harness CLI and allowed workspace roots as described in the [plugin README](plugins/deepseek-harness/README.md). Start a new Codex conversation after installation.

## Test This Local Checkout on Windows

In PowerShell, locate the current Codex CLI instead of copying a versioned `codex.exe` path that can become stale:

```powershell
$codex = (Get-Command codex.exe -ErrorAction Stop).Source
& $codex plugin marketplace add 'D:\codex\workspaces\deepseek-harness-bridge'
& $codex plugin add deepseek-harness@deepseek-harness-local
& $codex plugin list
```

For a local path, omit `--ref`; use `--ref main` only with a GitHub marketplace source.

## Local Development

```sh
npm test
```

The marketplace manifest at `.agents/plugins/marketplace.json` points to `./plugins/deepseek-harness`, following the Codex repository marketplace layout. This repository has not been pushed or published.

## License

MIT. See [LICENSE](LICENSE).
>>>>>>> 240a432 (Initial release: DeepSeek Harness Codex plugin)
