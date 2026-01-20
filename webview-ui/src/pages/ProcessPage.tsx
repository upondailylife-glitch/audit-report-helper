import { useState } from 'react';
import {
    CodeViewer,
    ModelSelector,
    ResponsePanel,
    ActionButtons,
} from '../components';
import { useVsCode } from '../hooks/useVsCode';
import { useLLMStream } from '../hooks/useLLMStream';
import type { InitData } from '../types';

interface ProcessPageProps {
    initData: InitData;
}

/**
 * Process 生成页面
 */
export function ProcessPage({ initData }: ProcessPageProps) {
    const { callLLM, stopGeneration, switchModel } = useVsCode();
    const { content, status, error } = useLLMStream();

    // 代码状态
    const [code, setCode] = useState(initData.code);

    // 模型选择状态
    const [selectedProvider, setSelectedProvider] = useState(initData.llmConfig.defaultProvider);
    const [selectedModel, setSelectedModel] = useState(initData.llmConfig.defaultModel);

    // 源码折叠状态
    const [showSourceCode, setShowSourceCode] = useState(false);

    // 获取文件名
    const fileName = initData.filePath.split(/[/\\]/).pop() || 'current file';

    // 切换 Provider 并保存
    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        const providerConfig = initData.llmConfig.providers.find(p => p.name === provider);
        const newModel = providerConfig?.models[0] || selectedModel;
        setSelectedModel(newModel);
        switchModel(provider, newModel);
    };

    // 切换模型并保存
    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        switchModel(selectedProvider, model);
    };

    const handleGenerate = () => {
        // Process 页面使用固定的 Prompt 模板
        const template = initData.templates[0];

        callLLM({
            prompt: template.content,
            code,
            provider: selectedProvider,
            model: selectedModel,
            options: {},
        });
    };

    return (
        <div className="process-page">
            <h2 className="process-page__title">Process Generator: {fileName}</h2>

            {/* 模型选择 */}
            <ModelSelector
                config={initData.llmConfig}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
            />

            {/* 源码折叠区 */}
            <details
                className="process-page__source"
                open={showSourceCode}
                onToggle={(e) => setShowSourceCode((e.target as HTMLDetailsElement).open)}
            >
                <summary className="process-page__source-summary">
                    View Source Code
                </summary>
                <CodeViewer
                    code={code}
                    editable={true}
                    onChange={setCode}
                />
            </details>

            {/* 操作按钮 */}
            <ActionButtons
                status={status}
                onGenerate={handleGenerate}
                onStop={stopGeneration}
                generateLabel="Start Generation"
            />

            {/* 响应面板 */}
            <ResponsePanel content={content} status={status} error={error} />
        </div>
    );
}
