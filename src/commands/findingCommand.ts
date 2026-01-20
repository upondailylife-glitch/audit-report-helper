// ============================================================================
// Finding 生成命令
// ============================================================================

import * as vscode from 'vscode';
import { createWebviewPanel } from '../webview/WebviewManager';
import { configService } from '../services/configService';
import { DEFAULT_FINDING_TEMPLATES } from '../constants/prompts';
import { BUILTIN_PROMPT_OPTIONS } from '../constants/promptOptions';
import type { InitData } from '../types';

/**
 * 注册 Finding 生成命令
 */
export function registerFindingCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('auditreporthelper.reportWrite', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个代码文件');
            return;
        }

        const selection = editor.selection;
        const code = editor.document.getText(selection);
        const filePath = editor.document.fileName;
        const lineStart = selection.start.line + 1;
        const lineEnd = selection.end.line + 1;

        if (!code) {
            vscode.window.showWarningMessage('请先选择一些代码');
            return;
        }

        // 获取 LLM 配置
        const llmConfig = configService.getLLMConfig();

        // 获取保存的选项值
        const savedOptionValues = configService.getSavedPromptOptions();

        // 构建初始化数据
        const initData: InitData = {
            code,
            filePath,
            lineStart,
            lineEnd,
            templates: DEFAULT_FINDING_TEMPLATES,
            pageType: 'finding',
            llmConfig,
            promptOptions: BUILTIN_PROMPT_OPTIONS,
            savedOptionValues,
        };

        // 创建 Webview
        createWebviewPanel(context, 'Finding 信息生成', initData);
    });
}
