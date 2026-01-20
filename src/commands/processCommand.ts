// ============================================================================
// Process 生成命令
// ============================================================================

import * as vscode from 'vscode';
import { createWebviewPanel } from '../webview/WebviewManager';
import { configService } from '../services/configService';
import { DEFAULT_PROCESS_TEMPLATES } from '../constants/prompts';
import type { InitData } from '../types';

/**
 * 注册 Process 生成命令
 */
export function registerProcessCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('auditreporthelper.generateParticipantProcess', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('请先打开一个代码文件');
            return;
        }

        const code = editor.document.getText();
        const filePath = editor.document.fileName;
        const fileName = filePath.split(/[/\\]/).pop() || 'current file';

        // 获取 LLM 配置
        const llmConfig = configService.getLLMConfig();

        // 构建初始化数据
        const initData: InitData = {
            code,
            filePath,
            templates: DEFAULT_PROCESS_TEMPLATES,
            pageType: 'process',
            llmConfig,
            promptOptions: [], // Process 页面暂不使用选项
        };

        // 创建 Webview
        createWebviewPanel(context, `Process: ${fileName}`, initData);
    });
}
