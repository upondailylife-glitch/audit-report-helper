import { useState, useMemo, useCallback } from 'react';
import type { PromptOption, PromptOptionValues } from '../types';

interface UsePromptOptionsResult {
    values: PromptOptionValues;
    setValue: (id: string, value: boolean | string | number) => void;
    resetToDefaults: () => void;
}

/**
 * 管理 Prompt 选项状态的 Hook
 */
export function usePromptOptions(options: PromptOption[], initialValues?: PromptOptionValues): UsePromptOptionsResult {
    // 计算默认值
    const defaultValues = useMemo(() => {
        const defaults: PromptOptionValues = {};
        options.forEach((opt) => {
            defaults[opt.id] = opt.defaultValue;
        });
        return defaults;
    }, [options]);

    // 合并初始值和默认值
    const [values, setValues] = useState<PromptOptionValues>(() => ({
        ...defaultValues,
        ...initialValues,
    }));

    const setValue = useCallback((id: string, value: boolean | string | number) => {
        setValues((prev) => ({ ...prev, [id]: value }));
    }, []);

    const resetToDefaults = useCallback(() => {
        setValues(defaultValues);
    }, [defaultValues]);

    return { values, setValue, resetToDefaults };
}
