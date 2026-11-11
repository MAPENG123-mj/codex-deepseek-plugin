# Contributing

Issues and pull requests are welcome. Keep changes portable across Windows, macOS, and Linux.

## Development

Requirements: Node.js 22 or newer and a local DeepSeek Harness installation for end-to-end checks.

```sh
npm test
```

Before submitting a pull request:

- Run the complete test suite.
- Validate edited JSON manifests with a JSON parser.
- Do not commit API keys, access tokens, Harness credential files, local session data, or machine-specific configuration.
- Keep read-only and workspace-write behavior distinct and covered by tests.
- Describe any checks that require an installed Harness runtime and could not be run locally.
