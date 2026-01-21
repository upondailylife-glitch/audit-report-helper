# AuditReportHelper

审计报告辅助工具 - 基于 LLM 的智能代码审计报告生成器

## ✨ 功能特性

- **Finding 描述生成**: 选中代码后，自动生成标准化的漏洞描述（标题、问题描述、修复建议）
- **Participant Process 生成**: 分析合约代码，自动识别各角色及其可操作的函数
- **多 LLM Provider 支持**: 支持 OpenAI、DeepSeek 等多种 LLM 服务商，可自由切换
- **模型切换**: 在同一 Provider 下可选择不同模型
- **Prompt 选项自定义**: 支持输出语言、修复建议开关、代码引用格式等多种选项
- **设置持久化**: 用户偏好自动保存，下次打开无需重新配置
- **流式响应**: 实时显示 AI 生成内容，支持中途停止
- **结果可编辑**: AI 生成的内容可直接在面板中修改

## 📦 安装

### 从 VSIX 安装

1. 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 `.vsix` 文件

## 🚀 快速开始

### 1. 配置 API Key

首次使用前，需要配置 LLM Provider 的 API Key：

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `配置 LLM Provider` 并选择
3. 按提示输入 API Key

或者在设置中手动配置：
- 打开 VS Code 设置 (`Ctrl+,`)
- 搜索 `auditReportHelper`
- 在 `Providers` 中配置 API Key

### 2. 生成 Finding 描述

1. 在代码编辑器中 **选中** 需要分析的代码片段
2. 右键点击，选择 **"Finding 信息生成"**
3. 在弹出的面板中：
   - 选择 LLM Provider 和模型
   - 选择 Prompt 模板（标准模式 / 懒人模式）
   - 可选：在输入框中添加补充描述
   - 点击 **"Generate Finding"** 开始生成

### 3. 生成 Participant Process

1. 打开需要分析的合约文件
2. 右键点击编辑器，选择 **"生成 Participant Process"**
3. 等待 AI 分析并输出各角色及其可操作函数

## ⚙️ 配置项

在 VS Code 设置中搜索 `auditReportHelper`：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `providers` | LLM Provider 配置列表 | OpenAI, DeepSeek |
| `defaultProvider` | 默认使用的 Provider | OpenAI |
| `defaultModel` | 默认使用的模型 | deepseek-chat |

### Provider 配置示例

```json
{
  "auditReportHelper.providers": [
    {
      "name": "OpenAI",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-xxx",
      "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
    },
    {
      "name": "DeepSeek",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "sk-xxx",
      "models": ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]
    }
  ]
}
```

## 🎛️ Prompt 选项

在 Finding 生成页面，点击 **"显示更多选项"** 可配置：

- **输出语言**: 中英对照 / 仅中文 / 仅英文
- **自动修复建议**: 是否在输出中包含修复建议
- **代码引用格式**: 行内代码 / 代码块 / 自动
- **包含行号**: 是否在代码引用中标注行号
- **严格模式**: 严格基于代码证据，禁止猜测

## 📝 输出格式

### Finding 描述

```
标题

英文标题
中文标题

英文问题描述
中文问题描述

英文修复建议
中文修复建议
```

### Participant Process

```
**Admin**
- Admin can xxx through the `xxx()` function.

**User**
- User can xxx through the `xxx()` function.
```

## 🔧 开发

```bash
# 安装依赖
npm install
cd webview-ui && npm install

# 构建
npm run build

# 打包
npx vsce package --no-dependencies
```

## 📄 License

MIT License