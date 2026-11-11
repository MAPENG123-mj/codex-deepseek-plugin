# DeepSeek Harness for Codex

在 Codex 中把调研、代码审查或实现任务交给本机的 DeepSeek Harness。插件通过本地 MCP 启动 Harness SDK 会话，把 Harness 的原始回复交回 Codex；Codex 可以再检查实际 diff 和测试结果。

**当前版本使用后台 SDK 会话。**它不是 Harness 桌面聊天窗口，也不会为需要人工审批的操作打开 Harness Web 页面。Harness 要求额外审批时，当前桥接可能无法继续该操作；不要把任务超时或失败当作已经获批。后续计划另做可见 Web 会话与审批流程。

## 快速开始

需要：支持本地插件的 Codex、Node.js 22+、本机 DeepSeek Harness（包含 `dsh --profile sdk`）、已配置可用的 Harness 模型和凭据。

在终端安装插件：

```sh
codex plugin marketplace add MAPENG123-mj/codex-deepseek-plugin --ref main
codex plugin add deepseek-harness@deepseek-harness-local
codex plugin list
```

Windows PowerShell 可以直接用以下写法，避免 Codex 更新后可执行文件路径变化：

```powershell
$codex = (Get-Command codex.exe -ErrorAction Stop).Source
& $codex plugin marketplace add MAPENG123-mj/codex-deepseek-plugin --ref main
& $codex plugin add deepseek-harness@deepseek-harness-local
& $codex plugin list
```

看到 `deepseek-harness@deepseek-harness-local` 为 `installed, enabled` 后，重启 Codex 或新建对话，让 MCP 工具和 skill 加载。

**先做一个只读测试：**

```text
用 DeepSeek Harness 回答今天是几号。只把 Harness 的原始回复发给我。
```

无需写 `research intent` 或 `execute intent`。插件根据任务文字自动区分只读调研、只读审核和明确要求修改文件的执行任务。措辞不明确时默认只读。

## 配置 Harness

插件不附带 Harness 或 API Key。它默认调用 `dsh`（Windows 为 `dsh.cmd`）的 `sdk` profile，并通过 Harness 本地 Web 模型目录读取当前 provider 和默认模型。请先在 Harness 中配置好模型和凭据；不要把密钥写进这个仓库或聊天消息。

如果 `dsh` 不在 Codex 进程的 `PATH`，设置 `DSH_CLI` 为 Harness CLI 的绝对路径。Windows 桌面安装可改为设置 `DSH_INSTALL_DIR` 指向包含 `DeepSeek Harness.exe` 的安装目录；设置 `DSH_HOME` 指向该安装使用的数据目录。自定义 SDK profile 时可设置 `DSH_SDK_PATCH` 指向**本机私有**的 profile patch。修改环境变量后重启 Codex。

例如 Windows PowerShell 中，按**你自己的实际路径**设置用户级环境变量（仅是路径配置，不要在这里写 API Key）：

```powershell
[Environment]::SetEnvironmentVariable('DSH_INSTALL_DIR', 'D:\你的Harness安装目录', 'User')
[Environment]::SetEnvironmentVariable('DSH_HOME', 'D:\你的Harness数据目录', 'User')
[Environment]::SetEnvironmentVariable('HARNESS_WORKSPACE_ROOTS', 'D:\你的项目根目录', 'User')
```

设置完成后**退出并重新打开 Codex**。如果 Harness CLI 已在 PATH 中，可省略 `DSH_INSTALL_DIR`。`DSH_HOME` 要与你的 Harness 实际数据目录一致。插件使用的是 Harness 的 `sdk` profile；仅在桌面 `desktop` profile 里选了模型，不保证 SDK profile 也有相同路由。需要时在本机准备 SDK profile patch，并用 `DSH_SDK_PATCH` 指向它；详见[插件配置说明](plugins/deepseek-harness/README.md)。

**允许改代码前，还要配置工作区边界：**设置 `HARNESS_WORKSPACE_ROOTS` 为允许 Harness 写入的根目录。Windows 多个根目录用 `;` 分隔，macOS/Linux 用 `:` 分隔。插件会解析实际路径并拒绝越界请求。只读问答不需要配置可写根目录。

完整环境变量表和 Windows 本地检出安装方法见 [插件说明](plugins/deepseek-harness/README.md)。

## 在 Codex 里怎么说

以下是自然语言示例，`<项目路径>` 换成你实际打开的项目目录：

| 你对 Codex 说 | 插件的行为 |
| --- | --- |
| `让 DeepSeek Harness 看看 <项目路径>，评估架构和主要风险。先展示 Harness 原文，再给你的独立判断。` | Harness 只读调研；Codex 单独给出审核意见 |
| `让 DeepSeek Harness 审查 <项目路径> 的当前 diff，只列出问题，不要改文件。` | Harness 只读审核 |
| `让 DeepSeek Harness 在 <项目路径> 实现重试逻辑。完成后你检查 diff 并运行测试。` | Harness 在允许的工作区内执行；Codex 独立验收 |
| `继续刚才的 Harness 会话：必须兼容 Node.js 22，请按这个约束继续。` | Codex 用上次返回的 `sessionId` 续接会话 |

工具返回 `rawAnswer`、`status`、`sessionId`、provider、model 和工作区路径。`rawAnswer` 是 Harness 的文本；Codex 的判断应单独标明。`status=succeeded` 只表示 Harness 这一轮结束，**不等于代码已通过 Codex 验收**。执行类任务还需检查实际文件变化与测试。

如果 Harness 提出澄清问题，Codex 应把问题交给你，得到答案后用同一 `sessionId` 继续。需要人工批准的 Harness 操作在当前后台 SDK 版尚无前台审批通道；遇到此类失败请不要反复重试或放宽权限。

## 更新与卸载

发布新版本后，刷新 GitHub marketplace 并重新安装插件：

```sh
codex plugin marketplace upgrade deepseek-harness-local
codex plugin add deepseek-harness@deepseek-harness-local
```

卸载插件：

```sh
codex plugin remove deepseek-harness@deepseek-harness-local
codex plugin marketplace remove deepseek-harness-local
```

## 开发与安全边界

插件位于 [`plugins/deepseek-harness/`](plugins/deepseek-harness/)，仓库 marketplace 位于 [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json)。运行测试：

```sh
npm test
```

仓库与任务内容由本机 Harness 按你配置的模型服务发送给相应 provider；本项目没有托管中转服务。个人 `config/sdk-overrides.yml`、本地 `.env` 和验证缓存被忽略，不应提交。许可证为 [MIT](LICENSE)。
