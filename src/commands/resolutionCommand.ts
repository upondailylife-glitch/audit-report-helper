// ============================================================================
// Resolution 生成命令
// ============================================================================

import * as vscode from 'vscode';
import { createWebviewPanel } from '../webview/WebviewManager';
import { configService } from '../services/configService';
import { DEFAULT_RESOLUTION_TEMPLATES } from '../constants/prompts';
import type { InitData } from '../types';

/**
 * 注册 Resolution 生成命令
 */
export function registerResolutionCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('auditreporthelper.generateResolution', () => {
        // 获取 LLM 配置
        const llmConfig = configService.getLLMConfig();

        // 构建初始化数据（不要求必须有活跃编辑器）
        const initData: InitData = {
            code: '',
            filePath: '',
            templates: DEFAULT_RESOLUTION_TEMPLATES,
            pageType: 'resolution',
            llmConfig,
            promptOptions: [],
        };

        // 创建 Webview
        createWebviewPanel(context, 'Finding Resolution 生成', initData);
    });
}
