// ============================================================================
// Provider 配置命令 - 友好的配置向导
// ============================================================================

import * as vscode from 'vscode';
import { configService } from '../services/configService';
import type { LLMProvider } from '../types';

// 预设的 Provider 模板
const PROVIDER_TEMPLATES: Record<string, Omit<LLMProvider, 'apiKey'>> = {
    'DeepSeek': {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    },
    'OpenAI': {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    'OpenAI Compatible': {
        name: 'OpenAI Compatible',
        baseUrl: '',
        models: [],
    },
};

/**
 * 注册 Provider 配置命令
 */
export function registerConfigureProviderCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('auditreporthelper.configureProvider', async () => {
        await showProviderConfigWizard();
    });
}

/**
 * 显示 Provider 配置向导
 */
async function showProviderConfigWizard() {
    // 步骤1: 选择操作
    const action = await vscode.window.showQuickPick(
        [
            { label: '$(add) 添加新的 Provider', value: 'add' },
            { label: '$(edit) 编辑现有 Provider', value: 'edit' },
            { label: '$(trash) 删除 Provider', value: 'delete' },
        ],
        {
            title: 'LLM Provider 配置',
            placeHolder: '选择操作',
        }
    );

    if (!action) return;

    switch (action.value) {
        case 'add':
            await addProvider();
            break;
        case 'edit':
            await editProvider();
            break;
        case 'delete':
            await deleteProvider();
            break;
    }
}

/**
 * 添加新 Provider
 */
async function addProvider() {
    // 选择 Provider 类型
    const providerType = await vscode.window.showQuickPick(
        [
            { label: '$(cloud) DeepSeek', description: '只需输入 API Key', value: 'DeepSeek' },
            { label: '$(cloud) OpenAI', description: '输入 Base URL 和 API Key', value: 'OpenAI' },
            { label: '$(settings) OpenAI 兼容', description: '自定义 Base URL、API Key 和模型', value: 'OpenAI Compatible' },
        ],
        {
            title: '选择 Provider 类型',
            placeHolder: '选择要添加的 LLM Provider',
        }
    );

    if (!providerType) return;

    const template = PROVIDER_TEMPLATES[providerType.value];
    let baseUrl = template.baseUrl;
    let models = template.models;
    let name = template.name;

    // OpenAI 或 OpenAI Compatible 需要输入 Base URL
    if (providerType.value === 'OpenAI' || providerType.value === 'OpenAI Compatible') {
        const inputUrl = await vscode.window.showInputBox({
            title: '输入 API Base URL',
            prompt: 'OpenAI API 的 Base URL',
            value: template.baseUrl || 'https://api.openai.com/v1',
            placeHolder: 'https://api.openai.com/v1',
            validateInput: (value) => {
                if (!value) return 'Base URL 不能为空';
                if (!value.startsWith('http://') && !value.startsWith('https://')) {
                    return 'URL 必须以 http:// 或 https:// 开头';
                }
                return null;
            },
        });

        if (!inputUrl) return;
        baseUrl = inputUrl;
    }

    // OpenAI Compatible 需要输入自定义名称和模型
    if (providerType.value === 'OpenAI Compatible') {
        const inputName = await vscode.window.showInputBox({
            title: '输入 Provider 名称',
            prompt: '给这个 Provider 取一个名称',
            placeHolder: '例如: Azure OpenAI, Groq, Together AI',
            validateInput: (value) => {
                if (!value) return '名称不能为空';
                return null;
            },
        });

        if (!inputName) return;
        name = inputName;

        const inputModels = await vscode.window.showInputBox({
            title: '输入可用模型列表',
            prompt: '多个模型用逗号分隔',
            placeHolder: '例如: gpt-4, gpt-3.5-turbo',
            validateInput: (value) => {
                if (!value) return '至少需要一个模型';
                return null;
            },
        });

        if (!inputModels) return;
        models = inputModels.split(',').map(m => m.trim()).filter(m => m);
    }

    // 输入 API Key
    const apiKey = await vscode.window.showInputBox({
        title: `输入 ${name} API Key`,
        prompt: '请输入 API Key',
        password: true,
        placeHolder: 'sk-xxxxxxxxxxxxxxxx',
        validateInput: (value) => {
            if (!value) return 'API Key 不能为空';
            return null;
        },
    });

    if (!apiKey) return;

    // 保存配置
    const newProvider: LLMProvider = {
        name,
        baseUrl,
        apiKey,
        models,
    };

    await saveProvider(newProvider);
    vscode.window.showInformationMessage(`✅ ${name} 配置已保存！`);
}

/**
 * 编辑现有 Provider
 */
async function editProvider() {
    const config = configService.getLLMConfig();

    if (config.providers.length === 0) {
        vscode.window.showWarningMessage('没有可编辑的 Provider，请先添加一个。');
        return;
    }

    // 选择要编辑的 Provider
    const selected = await vscode.window.showQuickPick(
        config.providers.map(p => ({
            label: p.name,
            description: p.baseUrl,
            provider: p,
        })),
        {
            title: '选择要编辑的 Provider',
            placeHolder: '选择一个 Provider',
        }
    );

    if (!selected) return;

    const provider = selected.provider;

    // 编辑 API Key
    const newApiKey = await vscode.window.showInputBox({
        title: `编辑 ${provider.name} API Key`,
        prompt: '输入新的 API Key（留空保持不变）',
        password: true,
        placeHolder: '留空保持当前值',
    });

    // 如果用户取消了，不做任何更改
    if (newApiKey === undefined) return;

    // 编辑 Base URL
    const newBaseUrl = await vscode.window.showInputBox({
        title: `编辑 ${provider.name} Base URL`,
        prompt: '输入新的 Base URL',
        value: provider.baseUrl,
        validateInput: (value) => {
            if (!value) return 'Base URL 不能为空';
            return null;
        },
    });

    if (!newBaseUrl) return;

    // 更新配置
    const updatedProvider: LLMProvider = {
        ...provider,
        baseUrl: newBaseUrl,
        apiKey: newApiKey || provider.apiKey,
    };

    await updateProvider(provider.name, updatedProvider);
    vscode.window.showInformationMessage(`✅ ${provider.name} 配置已更新！`);
}

/**
 * 删除 Provider
 */
async function deleteProvider() {
    const config = configService.getLLMConfig();

    if (config.providers.length === 0) {
        vscode.window.showWarningMessage('没有可删除的 Provider。');
        return;
    }

    // 选择要删除的 Provider
    const selected = await vscode.window.showQuickPick(
        config.providers.map(p => ({
            label: p.name,
            description: p.baseUrl,
            provider: p,
        })),
        {
            title: '选择要删除的 Provider',
            placeHolder: '选择一个 Provider',
        }
    );

    if (!selected) return;

    // 确认删除
    const confirm = await vscode.window.showWarningMessage(
        `确定要删除 ${selected.provider.name} 吗？`,
        { modal: true },
        '删除'
    );

    if (confirm !== '删除') return;

    await removeProvider(selected.provider.name);
    vscode.window.showInformationMessage(`✅ ${selected.provider.name} 已删除！`);
}

/**
 * 保存新 Provider 到配置
 */
async function saveProvider(provider: LLMProvider) {
    const config = vscode.workspace.getConfiguration('auditReportHelper');
    const providers = config.get<LLMProvider[]>('providers') || [];

    // 检查是否已存在同名 Provider
    const existingIndex = providers.findIndex(p => p.name === provider.name);
    if (existingIndex >= 0) {
        providers[existingIndex] = provider;
    } else {
        providers.push(provider);
    }

    await config.update('providers', providers, vscode.ConfigurationTarget.Global);
}

/**
 * 更新 Provider
 */
async function updateProvider(oldName: string, provider: LLMProvider) {
    const config = vscode.workspace.getConfiguration('auditReportHelper');
    const providers = config.get<LLMProvider[]>('providers') || [];

    const index = providers.findIndex(p => p.name === oldName);
    if (index >= 0) {
        providers[index] = provider;
        await config.update('providers', providers, vscode.ConfigurationTarget.Global);
    }
}

/**
 * 删除 Provider
 */
async function removeProvider(name: string) {
    const config = vscode.workspace.getConfiguration('auditReportHelper');
    const providers = config.get<LLMProvider[]>('providers') || [];

    const filtered = providers.filter(p => p.name !== name);
    await config.update('providers', filtered, vscode.ConfigurationTarget.Global);
}
