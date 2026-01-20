
import type { LLMConfig } from '../types';

interface ModelSelectorProps {
    config: LLMConfig;
    selectedProvider: string;
    selectedModel: string;
    onProviderChange: (provider: string) => void;
    onModelChange: (model: string) => void;
}

/**
 * LLM 模型选择器组件
 */
export function ModelSelector({
    config,
    selectedProvider,
    selectedModel,
    onProviderChange,
    onModelChange,
}: ModelSelectorProps) {
    const currentProvider = config.providers.find((p) => p.name === selectedProvider);
    const availableModels = currentProvider?.models || [];

    const handleProviderChange = (providerName: string) => {
        onProviderChange(providerName);
        // 切换 Provider 时自动选择第一个模型
        const provider = config.providers.find((p) => p.name === providerName);
        if (provider && provider.models.length > 0) {
            onModelChange(provider.models[0]);
        }
    };

    return (
        <div className="model-selector">
            <div className="model-selector__group">
                <label className="model-selector__label">Provider</label>
                <select
                    className="model-selector__select"
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                >
                    {config.providers.map((provider) => (
                        <option key={provider.name} value={provider.name}>
                            {provider.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="model-selector__group">
                <label className="model-selector__label">Model</label>
                <select
                    className="model-selector__select"
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                >
                    {availableModels.map((model) => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
