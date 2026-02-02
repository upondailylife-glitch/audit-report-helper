// ============================================================================
// 配置服务 - 管理 VS Code Settings 中的配置
// ============================================================================

import * as vscode from 'vscode';
import type { LLMProvider, LLMConfig } from '../types';

const CONFIG_SECTION = 'auditReportHelper';

/**
 * 默认 LLM Provider 配置
 */
const DEFAULT_PROVIDERS: LLMProvider[] = [
    {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    },
];

/**
 * 配置服务类
 */
export class ConfigService {
    private static instance: ConfigService;

    private constructor() { }

    static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * 获取 LLM 配置
     */
    getLLMConfig(): LLMConfig {
        const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

        // 尝试从新配置读取
        let providers = config.get<LLMProvider[]>('providers');

        // TODO:remove 
        // 如果没有新配置，尝试兼容旧配置
        if (!providers || providers.length === 0) {
            const oldConfig = vscode.workspace.getConfiguration('codeAskAI');
            // const oldApiKey = oldConfig.get<string>('apiKey');
            const oldBaseUrl = oldConfig.get<string>('baseUrl') || 'https://api.deepseek.com';
            const oldModel = oldConfig.get<string>('model') || 'deepseek-coder';

            providers = DEFAULT_PROVIDERS;
        }

        const defaultProvider = config.get<string>('defaultProvider') || providers[0]?.name || 'OpenAI';
        const defaultModel = config.get<string>('defaultModel') || providers[0]?.models[0] || 'gpt-4o';

        return {
            providers,
            defaultProvider,
            defaultModel,
        };
    }

    /**
     * 获取指定 Provider
     */
    getProvider(name: string): LLMProvider | undefined {
        const config = this.getLLMConfig();
        return config.providers.find(p => p.name === name);
    }

    /**
     * 监听配置变更
     */
    onConfigChange(callback: (config: LLMConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CONFIG_SECTION) || e.affectsConfiguration('codeAskAI')) {
                callback(this.getLLMConfig());
            }
        });
    }

    /**
     * 获取保存的 Prompt 选项值
     */
    getSavedPromptOptions(): Record<string, boolean | string | number> {
        const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
        return config.get<Record<string, boolean | string | number>>('savedPromptOptions') || {};
    }
}

// 导出单例
export const configService = ConfigService.getInstance();
