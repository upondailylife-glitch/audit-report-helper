// ============================================================================
// Prompt 选项定义
// ============================================================================

import type { PromptOption } from '../types';

/**
 * 内置 Prompt 选项
 */
export const BUILTIN_PROMPT_OPTIONS: PromptOption[] = [
    // ===== 输出类 =====
    {
        id: 'outputLanguage',
        type: 'select',
        label: '输出语言',
        category: 'output',
        order: 1,
        options: [
            { value: 'bilingual', label: '中英对照' },
            { value: 'zh', label: '仅中文' },
            { value: 'en', label: '仅英文' },
        ],
        defaultValue: 'bilingual',
    },
    // {
    //     id: 'detailLevel',
    //     type: 'select',
    //     label: '详细程度',
    //     category: 'output',
    //     order: 2,
    //     options: [
    //         { value: 'concise', label: '简洁' },
    //         { value: 'standard', label: '标准' },
    //         { value: 'detailed', label: '详细' },
    //     ],
    //     defaultValue: 'standard',
    // },

    // ===== 格式类 =====
    {
        id: 'codeRefStyle',
        type: 'select',
        label: '代码引用格式',
        category: 'format',
        order: 1,
        options: [
            { value: 'inline', label: '行内代码' },
            { value: 'block', label: '代码块' },
            { value: 'both', label: '混合使用' },
        ],
        defaultValue: 'both',
    },
    // {
    //     id: 'includeLineNumbers',
    //     type: 'toggle',
    //     label: '包含行号',
    //     description: '在代码引用中显示行号',
    //     category: 'format',
    //     order: 2,
    //     defaultValue: true,
    // },

    // ===== 行为类 =====
    {
        id: 'strictMode',
        type: 'toggle',
        label: '信息不完整时提示而非猜测',
        // description: '信息不完整时提示而非猜测',
        category: 'behavior',
        order: 1,
        defaultValue: false,
    },
    {
        id: 'autoSuggestFix',
        type: 'toggle',
        label: '自动生成修复建议',
        category: 'behavior',
        order: 2,
        defaultValue: true,
    },
];
