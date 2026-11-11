# Generic Codex Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the local Harness bridge into a portable Codex desktop plugin that can be shared from GitHub.

**Architecture:** Package a portable plugin manifest, repo marketplace entry, and workflow skill around one dependency-light stdio MCP server. The server uses the user's Harness SDK CLI, user-owned provider configuration, strict workspace roots, and persisted SDK session IDs.

**Tech Stack:** Node.js 22+, Codex desktop plugins, MCP JSON-RPC over stdio, DeepSeek Harness SDK JSON-RPC.

**Spec:** `docs/superpowers/specs/2026-11-06-generic-codex-plugin.md`

## Global Constraints

- Do not bundle or print API keys, tokens, or credential files.
- Do not push or publish the repository.
- Keep task writes restricted to explicitly configured workspace roots.
- Keep the current Windows installation usable through local environment configuration.
- Use one `harness` tool with `research`, `review`, and `execute` intents.

## Review Focus

- A missing CLI executable must surface a startup failure without printing secrets; provider configuration remains delegated to Harness.
- A path outside configured roots must be rejected after real-path resolution; test the outside-root case.
- `research` and `review` must not receive write permission; test the intent-to-permission mapping.
- A failed Harness turn with no assistant message must remain failed; test retry and error events.
- Session continuation must resume the exact session and return only new output; test request ordering and IDs.

---

### Task 1: Portable Plugin Packaging

**Files:**
- Create: `plugin.json`
- Create: `mcp.json`
- Create: `.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `skills/deepseek-harness/SKILL.md`
- Create: `.gitignore`, `LICENSE`, and `CONTRIBUTING.md`
- Modify: `package.json`, `README.md`
- Test: `test/plugin.test.mjs`

- [x] **Step 1: Write failing manifest and workflow tests**
- [x] **Step 2: Confirm the manifest checks fail before files exist**
- [x] **Step 3: Add portable plugin, MCP, compatibility, and marketplace manifests**
- [x] **Step 4: Add the orchestration skill and repository contribution/license files**
- [x] **Step 5: Run focused tests and validate all JSON**

### Task 2: Generic Harness Runtime Configuration

**Files:**
- Create: `src/config.mjs`
- Modify: `src/harness.mjs`, `src/server.mjs`, `src/web-catalog.mjs`
- Create: `test/config.test.mjs`
- Modify: `test/core.test.mjs`, `test/server.test.mjs`

- [x] **Step 1: Add failing tests for env configuration, CLI launch, provider defaults, and permission mapping**
- [x] **Step 2: Confirm tests fail for the missing generic behavior**
- [x] **Step 3: Support PATH-based `dsh`, explicit command/argument overrides, and Windows command shims**
- [x] **Step 4: Use Harness SDK profile settings by default, with optional user-owned profile patches**
- [x] **Step 5: Keep per-user secrets in the environment or Harness credential store**
- [x] **Step 6: Run focused tests**

### Task 3: Unified Harness Tool and Session Continuation

**Files:**
- Modify: `src/server.mjs`, `src/harness.mjs`
- Modify: `test/server.test.mjs`, `test/core.test.mjs`

- [x] **Step 1: Add failing tests for all three intents and session continuation**
- [x] **Step 2: Confirm the intent tests fail before implementation**
- [x] **Step 3: Expose one `harness` tool with `research`, `review`, and `execute` intents**
- [x] **Step 4: Resume a supplied session ID, submit the next prompt, and return raw answer plus structured status**
- [x] **Step 5: Preserve model-list tool and enforce allowed workspace roots**
- [x] **Step 6: Run focused intent and MCP tests**

### Task 4: Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`, `skills/deepseek-harness/SKILL.md`

- [x] **Step 1: Document clean install, environment setup, model/provider configuration, and GitHub marketplace installation**
- [x] **Step 2: Document local desktop limitations, approval behavior, security boundaries, and troubleshooting**
- [x] **Step 3: Run the complete test suite and manifest checks**
- [x] **Step 4: Exercise the installed local Harness with a read-only prompt and verify returned route/session/status fields**
- [x] **Step 5: Confirm no credentials or machine-specific paths appear in distributable files**
