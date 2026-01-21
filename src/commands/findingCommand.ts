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

        const selections = editor.selections;
        const filePath = editor.document.fileName;
        const fileName = filePath.split(/[/\\]/).pop() || filePath;

        // 过滤非空选择并构建代码块
        const validSelections = selections.filter(sel => !sel.isEmpty);

        if (validSelections.length === 0) {
            vscode.window.showWarningMessage('请先选择一些代码');
            return;
        }

        // 拼接代码：filename L行号-行号\ncode
        const codeBlocks = validSelections.map(sel => {
            const text = editor.document.getText(sel);
            const startLine = sel.start.line + 1;
            const endLine = sel.end.line + 1;
            return `${fileName} L${startLine}-L${endLine}\n${text}`;
        });

        const code = codeBlocks.join('\n\n');

        // 行号范围取所有选择的最小起始行和最大结束行
        const lineStart = Math.min(...validSelections.map(s => s.start.line)) + 1;
        const lineEnd = Math.max(...validSelections.map(s => s.end.line)) + 1;

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
