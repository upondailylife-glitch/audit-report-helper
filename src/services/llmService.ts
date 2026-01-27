// ============================================================================
// LLM 服务 - 封装 LLM API 调用
// ============================================================================

import * as vscode from 'vscode';
import { configService } from './configService';
import type { LLMProvider, PromptOptionValues } from '../types';
import {
    PROMPT_SECTION_ROLE,
    PROMPT_SECTION_TITLE_RULES,
    PROMPT_SECTION_DESC_RULES,
    PROMPT_SECTION_CODE_REF_RULES,
    PROMPT_SECTION_REPAIR_RULES,
    PROMPT_SECTION_OUTPUT_FORMAT_BILINGUAL,
    PROMPT_SECTION_OUTPUT_FORMAT_ZH,
    PROMPT_SECTION_OUTPUT_FORMAT_EN,
    PROMPT_SECTION_NO_REPAIR_RULES
} from '../constants/prompts';

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

        // console.log(options.options);

        // 构建完整 Prompt
        const fullContent = this.buildFullPrompt(prompt, code, options.options);

        // 打印完整 Prompt 到控制台 (Debug)
        console.log('--- Full Prompt Start ---');
        console.log(fullContent);
        console.log('--- Full Prompt End ---');

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
    private buildFullPrompt(basePrompt: string, code: string, options: PromptOptionValues): string {
        switch (options.type) {
            case 'process':
                return this.buildProcessPrompt(basePrompt, code, options);
            case 'finding':
                return this.buildFindingPrompt(basePrompt, code, options);
            default:
                return this.buildFindingPrompt(basePrompt, code, options);
        }
    }

    private buildProcessPrompt(basePrompt: string, code: string, options: PromptOptionValues): string {
        return `${basePrompt}\n\n目标代码片段:\n\`\`\`\n${code}\n\`\`\``;
    }

    private buildFindingPrompt(basePrompt: string, code: string, options: PromptOptionValues): string {
        // 默认 Finding 生成任务
        const parts: string[] = [];
        // 1. 角色定义
        parts.push(PROMPT_SECTION_ROLE);
        // 2. 标题规则
        parts.push(PROMPT_SECTION_TITLE_RULES);
        // 3. 问题描述规则
        parts.push(PROMPT_SECTION_DESC_RULES);
        // 4. 代码引用规则
        parts.push(PROMPT_SECTION_CODE_REF_RULES);
        if (options.codeRefStyle === 'inline') {
            parts.push(`**引用补充**：请优先使用行内代码格式（如 \`variable\`）引用变量或函数名。`);
        } else if (options.codeRefStyle === 'block') {
            parts.push(`**引用补充**：请优先使用代码块格式引用代码逻辑。`);
        }

        if (options.includeLineNumbers) {
            parts.push(`**引用补充**：在引用多行代码时，请尽可能保留或标注行号以便定位。`);
        }
        if (options.autoSuggestFix !== false) {
            parts.push(PROMPT_SECTION_REPAIR_RULES);
        } else {
            parts.push(PROMPT_SECTION_NO_REPAIR_RULES);
        }

        // 6. 输出格式要求
        const lang = options.outputLanguage;
        if (lang === 'bilingual' || !lang) {
            parts.push(PROMPT_SECTION_OUTPUT_FORMAT_BILINGUAL);
        } else if (lang === 'zh') {
            parts.push(PROMPT_SECTION_OUTPUT_FORMAT_ZH);
        } else if (lang === 'en') {
            parts.push(PROMPT_SECTION_OUTPUT_FORMAT_EN);
        }

        // 8. 严格模式 (部分已经在 Input Placeholder 中涵盖，这里做补充)
        if (options.strictMode) {
            parts.push(`**重要提醒**：请严格基于提供的代码证据，严禁猜测。`);
        }
        parts.push(basePrompt);

        parts.push(`\n\n目标代码片段:\n\`\`\`\n${code}\n\`\`\``);

        return parts.join('\n\n');
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
