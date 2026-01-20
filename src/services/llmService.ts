// ============================================================================
// LLM 服务 - 封装 LLM API 调用
// ============================================================================

import * as vscode from 'vscode';
import { configService } from './configService';
import type { LLMProvider, PromptOptionValues } from '../types';

export interface LLMCallOptions {
    provider: string;
    model: string;
    prompt: string;
    code: string;
    options: PromptOptionValues;
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

/**
 * LLM 服务类
 */
export class LLMService {
    private static instance: LLMService;

    private constructor() { }

    static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    /**
     * 调用 LLM API（流式）
     */
    async callStream(options: LLMCallOptions): Promise<void> {
        const { provider: providerName, model, prompt, code, signal, onChunk, onStart, onEnd, onError } = options;

        // 获取 Provider 配置
        const provider = configService.getProvider(providerName);
        if (!provider) {
            onError?.(`Provider "${providerName}" not found`);
            return;
        }

        if (!provider.apiKey) {
            onError?.('API Key 未配置');
            const action = await vscode.window.showErrorMessage('未检测到 API Key！', '去配置');
            if (action === '去配置') {
                await vscode.commands.executeCommand('auditreporthelper.configureProvider');
            }
            return;
        }

        // 构建请求 URL
        const fetchUrl = this.buildFetchUrl(provider);

        // 构建完整 Prompt
        const fullContent = this.buildFullPrompt(prompt, code, options.options);

        onStart?.();

        try {
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: fullContent }],
                    stream: true,
                }),
                signal,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errText}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            await this.processStream(response.body, onChunk);
            onEnd?.();

        } catch (error: any) {
            if (error.name === 'AbortError') {
                onEnd?.();
            } else {
                onError?.(error.message || 'Unknown error');
            }
        }
    }

    /**
     * 构建请求 URL
     */
    private buildFetchUrl(provider: LLMProvider): string {
        let baseUrl = provider.baseUrl;
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        if (baseUrl.includes('/chat/completions')) {
            return baseUrl;
        }

        return `${baseUrl}/chat/completions`;
    }

    /**
     * 构建完整 Prompt
     */
    private buildFullPrompt(prompt: string, code: string, options: PromptOptionValues): string {
        // 根据选项调整 Prompt
        let adjustedPrompt = prompt;

        // 处理输出语言选项
        if (options.outputLanguage === 'zh') {
            adjustedPrompt = adjustedPrompt.replace(/你的输出要中英对照.*?格式：/s, '你的输出只需要中文，格式：');
        } else if (options.outputLanguage === 'en') {
            adjustedPrompt = adjustedPrompt.replace(/你的输出要中英对照.*?格式：/s, '你的输出只需要英文，格式：');
        }

        // 处理详细程度
        if (options.detailLevel === 'concise') {
            adjustedPrompt += '\n\n请尽量简洁，省略不必要的细节。';
        } else if (options.detailLevel === 'detailed') {
            adjustedPrompt += '\n\n请提供详细的分析和解释。';
        }

        // 处理严格模式
        if (options.strictMode) {
            adjustedPrompt += '\n\n如果信息不完整，请明确指出缺少哪些信息，不要猜测。';
        }

        return `${adjustedPrompt}\n\n代码片段:\n\`\`\`\n${code}\n\`\`\``;
    }

    /**
     * 处理流式响应
     */
    private async processStream(
        body: ReadableStream<Uint8Array>,
        onChunk?: (chunk: string) => void
    ): Promise<void> {
        const reader = body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    const deltaContent = json.choices?.[0]?.delta?.content;

                    if (deltaContent) {
                        onChunk?.(deltaContent);
                    }
                } catch (e) {
                    // JSON 解析错误，忽略
                }
            }
        }
    }
}

// 导出单例
export const llmService = LLMService.getInstance();
