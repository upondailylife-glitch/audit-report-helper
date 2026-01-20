import { useState } from 'react';
import {
    CodeViewer,
    PromptSelector,
    ModelSelector,
    PromptOptionsPanel,
    ResponsePanel,
    ActionButtons,
} from '../components';
import { useVsCode } from '../hooks/useVsCode';
import { useLLMStream } from '../hooks/useLLMStream';
import { usePromptOptions } from '../hooks/usePromptOptions';
import type { InitData } from '../types';

interface FindingPageProps {
    initData: InitData;
}

/**
 * Finding 信息生成页面
 */
export function FindingPage({ initData }: FindingPageProps) {
    const { callLLM, stopGeneration, switchModel, savePromptOptions } = useVsCode();
    const { content, status, error } = useLLMStream();

    // 代码状态
    const [code, setCode] = useState(initData.code);

    // Prompt 模板状态
    const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
    const [userInput, setUserInput] = useState('');

    // 模型选择状态
    const [selectedProvider, setSelectedProvider] = useState(initData.llmConfig.defaultProvider);
    const [selectedModel, setSelectedModel] = useState(initData.llmConfig.defaultModel);

    // Prompt 选项状态
    const { values: optionValues, setValue: setOptionValue } = usePromptOptions(
        initData.promptOptions,
        initData.savedOptionValues
    );

    // 是否显示选项面板
    const [showOptions, setShowOptions] = useState(false);

    // 切换 Provider 并保存
    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        // 找到该 Provider 的第一个模型
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

    // 修改选项并保存
    const handleOptionChange = (id: string, value: boolean | string | number) => {
        setOptionValue(id, value);
        savePromptOptions({ [id]: value });
    };

    const handleGenerate = () => {
        const template = initData.templates[selectedTemplateIndex];
        const fullPrompt = userInput ? `${template.content}\n\n${userInput}` : template.content;

        callLLM({
            prompt: fullPrompt,
            code,
            provider: selectedProvider,
            model: selectedModel,
            options: optionValues,
        });
    };

    return (
        <div className="finding-page">
            {/* 文件信息 */}
            <div className="finding-page__header">
                <span className="finding-page__file-info">
                    {initData.filePath}
                    {initData.lineStart && initData.lineEnd && (
                        <span className="finding-page__line-range">
                            #L{initData.lineStart}-{initData.lineEnd}
                        </span>
                    )}
                </span>
            </div>

            {/* 代码展示 */}
            <CodeViewer
                code={code}
                editable={true}
                onChange={setCode}
            />

            {/* 模型选择 */}
            <ModelSelector
                config={initData.llmConfig}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
            />

            {/* Prompt 模板选择 */}
            <PromptSelector
                templates={initData.templates}
                selectedIndex={selectedTemplateIndex}
                onSelect={setSelectedTemplateIndex}
                userInput={userInput}
                onUserInputChange={setUserInput}
            />

            {/* 选项面板开关 */}
            <div className="finding-page__options-toggle">
                <button
                    className="options-toggle-btn"
                    onClick={() => setShowOptions(!showOptions)}
                >
                    {showOptions ? '▼ 隐藏选项' : '▶ 显示更多选项'}
                </button>
            </div>

            {/* Prompt 选项 */}
            {showOptions && (
                <PromptOptionsPanel
                    options={initData.promptOptions}
                    values={optionValues}
                    onChange={handleOptionChange}
                />
            )}

            {/* 操作按钮 */}
            <ActionButtons
                status={status}
                onGenerate={handleGenerate}
                onStop={stopGeneration}
                generateLabel="Generate Finding"
            />

            {/* 响应面板 */}
            <ResponsePanel content={content} status={status} error={error} />
        </div>
    );
}
