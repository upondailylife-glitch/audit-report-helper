// ============================================================================
// 共享类型定义 - Extension 后端
// ============================================================================

// ===== LLM Provider 配置 =====
export interface LLMProvider {
    name: string;
    baseUrl: string;
    apiKey: string;
    models: string[];
}

export interface LLMConfig {
    providers: LLMProvider[];
    defaultProvider: string;
    defaultModel: string;
}

// ===== Prompt 选项类型 =====
export type PromptOptionType = 'toggle' | 'select' | 'number' | 'text';

export interface BasePromptOption {
    id: string;
    label: string;
    description?: string;
    category: string;
    order?: number;
}

export interface ToggleOption extends BasePromptOption {
    type: 'toggle';
    defaultValue: boolean;
}

export interface SelectOption extends BasePromptOption {
    type: 'select';
    options: { value: string; label: string }[];
    defaultValue: string;
}

export interface NumberOption extends BasePromptOption {
    type: 'number';
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
}

export interface TextOption extends BasePromptOption {
    type: 'text';
    placeholder?: string;
    defaultValue: string;
}

export type PromptOption = ToggleOption | SelectOption | NumberOption | TextOption;

export type PromptOptionValues = Record<string, boolean | string | number>;

// ===== Prompt 模板 =====
export interface PromptTemplate {
    name: string;
    content: string;
}

// ===== 前后端消息类型 =====

// Extension -> Webview
export type ExtensionToWebviewMessage =
    | { type: 'INIT_DATA'; payload: InitData }
    | { type: 'STREAM_START' }
    | { type: 'STREAM_CHUNK'; payload: string }
    | { type: 'STREAM_END' }
    | { type: 'STREAM_ERROR'; payload: string }
    | { type: 'CONFIG_UPDATE'; payload: LLMConfig };

// Webview -> Extension
export type WebviewToExtensionMessage =
    | { type: 'CALL_LLM'; payload: CallLLMPayload }
    | { type: 'STOP_GENERATION' }
    | { type: 'SAVE_TEMPLATE'; payload: PromptTemplate }
    | { type: 'SWITCH_MODEL'; payload: { provider: string; model: string } }
    | { type: 'SAVE_SETTINGS'; payload: SaveSettingsPayload }
    | { type: 'OPEN_CONFIGURATION' };

// 保存设置参数
export interface SaveSettingsPayload {
    provider?: string;
    model?: string;
    promptOptions?: PromptOptionValues;
}

// LLM 调用参数
export interface CallLLMPayload {
    prompt: string;
    code: string;
    provider: string;
    model: string;
    options: PromptOptionValues;
}

// 初始化数据
export interface InitData {
    code: string;
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
    templates: PromptTemplate[];
    pageType: 'finding' | 'process';
    llmConfig: LLMConfig;
    promptOptions: PromptOption[];
    savedOptionValues?: PromptOptionValues;
}
