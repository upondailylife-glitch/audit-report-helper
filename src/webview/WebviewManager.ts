// ============================================================================
// Webview 管理器 - 管理 Webview Panel 创建和通信
// ============================================================================

import * as vscode from 'vscode';
import * as path from 'path';
import { llmService } from '../services/llmService';
import type {
    InitData,
    ExtensionToWebviewMessage,
    WebviewToExtensionMessage,
    CallLLMPayload,
    SaveSettingsPayload,
    PromptOptionValues
} from '../types';

/**
 * Webview 管理器类
 */
export class WebviewManager {
    private panel: vscode.WebviewPanel;
    private extensionUri: vscode.Uri;
    private runningController: AbortController | null = null;
    private disposables: vscode.Disposable[] = [];

    constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        initData: InitData
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        // 设置 Webview HTML
        this.panel.webview.html = this.getWebviewHtml();

        // 监听消息
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewToExtensionMessage) => this.handleMessage(message),
            null,
            this.disposables
        );

        // Panel 关闭时清理
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // 监听配置变更，自动推送更新到 Webview
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('auditReportHelper')) {
                    this.sendConfigUpdate();
                }
            })
        );

        // 发送初始化数据
        this.postMessage({ type: 'INIT_DATA', payload: initData });
    }

    /**
     * 发送消息到 Webview
     */
    postMessage(message: ExtensionToWebviewMessage): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * 处理来自 Webview 的消息
     */
    private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
        switch (message.type) {
            case 'CALL_LLM':
                await this.handleCallLLM(message.payload);
                break;

            case 'STOP_GENERATION':
                this.handleStopGeneration();
                break;

            case 'SAVE_TEMPLATE':
                // TODO: 实现模板保存
                break;

            case 'SWITCH_MODEL':
                // 保存用户切换的模型
                await this.handleSaveSettings({
                    provider: message.payload.provider,
                    model: message.payload.model,
                });
                break;

            case 'SAVE_SETTINGS':
                await this.handleSaveSettings(message.payload);
                break;

            case 'OPEN_CONFIGURATION':
                vscode.commands.executeCommand('auditreporthelper.configureProvider');
                break;
        }
    }

    /**
     * 处理 LLM 调用
     */
    private async handleCallLLM(payload: CallLLMPayload): Promise<void> {
        // 取消之前的请求
        if (this.runningController) {
            this.runningController.abort();
        }

        this.runningController = new AbortController();

        await llmService.callStream({
            provider: payload.provider,
            model: payload.model,
            prompt: payload.prompt,
            code: payload.code,
            options: payload.options,
            signal: this.runningController.signal,
            onStart: () => {
                this.postMessage({ type: 'STREAM_START' });
            },
            onChunk: (chunk) => {
                this.postMessage({ type: 'STREAM_CHUNK', payload: chunk });
            },
            onEnd: () => {
                this.postMessage({ type: 'STREAM_END' });
                this.runningController = null;
            },
            onError: (error) => {
                this.postMessage({ type: 'STREAM_ERROR', payload: error });
                this.runningController = null;
            },
        });
    }

    /**
     * 处理停止生成
     */
    private handleStopGeneration(): void {
        if (this.runningController) {
            this.runningController.abort();
            this.runningController = null;
            this.postMessage({ type: 'STREAM_END' });
        }
    }

    /**
     * 保存用户设置
     */
    private async handleSaveSettings(payload: SaveSettingsPayload): Promise<void> {
        try {
            console.log('Received SAVE_SETTINGS payload:', JSON.stringify(payload, null, 2));
            const config = vscode.workspace.getConfiguration('auditReportHelper');

            if (payload.provider) {
                console.log('Updating defaultProvider to:', payload.provider);
                await config.update('defaultProvider', payload.provider, vscode.ConfigurationTarget.Global);
            }

            if (payload.model) {
                console.log('Updating defaultModel to:', payload.model);
                await config.update('defaultModel', payload.model, vscode.ConfigurationTarget.Global);
            }

            if (payload.promptOptions) {
                console.log('Updating savedPromptOptions with:', JSON.stringify(payload.promptOptions));
                const current = config.get<PromptOptionValues>('savedPromptOptions') || {};
                const merged = { ...current, ...payload.promptOptions };
                await config.update('savedPromptOptions', merged, vscode.ConfigurationTarget.Global);
            }
            console.log('Settings updated successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            vscode.window.showErrorMessage(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 发送配置更新到 Webview
     */
    private sendConfigUpdate(): void {
        const { configService } = require('../services/configService');
        const llmConfig = configService.getLLMConfig();
        this.postMessage({ type: 'CONFIG_UPDATE', payload: llmConfig });
    }

    /**
     * 获取 Webview HTML
     */
    private getWebviewHtml(): string {
        const webview = this.panel.webview;

        // 获取构建产物路径
        const webviewBuildPath = vscode.Uri.joinPath(this.extensionUri, 'webview-ui', 'build');

        // 获取资源 URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(webviewBuildPath, 'assets', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(webviewBuildPath, 'assets', 'main.css')
        );

        // CSP nonce
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>AuditReportHelper</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * 生成随机 nonce
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * 清理资源
     */
    dispose(): void {
        if (this.runningController) {
            this.runningController.abort();
        }
        this.disposables.forEach(d => d.dispose());
    }
}

/**
 * 创建 Webview Panel
 */
export function createWebviewPanel(
    context: vscode.ExtensionContext,
    title: string,
    initData: InitData
): WebviewManager {
    const panel = vscode.window.createWebviewPanel(
        'auditReportHelper',
        title,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'build'),
            ],
        }
    );

    return new WebviewManager(panel, context.extensionUri, initData);
}
