import { useRef, useCallback } from 'react';
import type { VsCodeApi, WebviewToExtensionMessage, CallLLMPayload, SaveSettingsPayload, PromptOptionValues } from '../types';

// 获取 VS Code API 的单例
function getVsCodeApi(): VsCodeApi {
    if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
        return (window as unknown as { acquireVsCodeApi: () => VsCodeApi }).acquireVsCodeApi();
    }
    // 开发环境模拟
    return {
        postMessage: (msg) => console.log('[Mock VS Code] postMessage:', msg),
        getState: () => null,
        setState: () => { },
    };
}

const vscodeApi = getVsCodeApi();

/**
 * 封装 VS Code Webview API 的 Hook
 */
export function useVsCode() {
    const apiRef = useRef(vscodeApi);

    const postMessage = useCallback((message: WebviewToExtensionMessage) => {
        apiRef.current.postMessage(message);
    }, []);

    const callLLM = useCallback(
        (payload: CallLLMPayload) => {
            postMessage({ type: 'CALL_LLM', payload });
        },
        [postMessage]
    );

    const stopGeneration = useCallback(() => {
        postMessage({ type: 'STOP_GENERATION' });
    }, [postMessage]);

    const switchModel = useCallback(
        (provider: string, model: string) => {
            postMessage({ type: 'SWITCH_MODEL', payload: { provider, model } });
        },
        [postMessage]
    );

    const saveSettings = useCallback(
        (payload: SaveSettingsPayload) => {
            postMessage({ type: 'SAVE_SETTINGS', payload });
        },
        [postMessage]
    );

    const savePromptOptions = useCallback(
        (promptOptions: PromptOptionValues) => {
            postMessage({ type: 'SAVE_SETTINGS', payload: { promptOptions } });
        },
        [postMessage]
    );

    const openConfiguration = useCallback(() => {
        postMessage({ type: 'OPEN_CONFIGURATION' });
    }, [postMessage]);

    return {
        postMessage,
        callLLM,
        stopGeneration,
        switchModel,
        saveSettings,
        savePromptOptions,
        openConfiguration,
    };
}
