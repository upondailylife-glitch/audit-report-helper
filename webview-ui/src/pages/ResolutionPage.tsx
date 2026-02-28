import { useState } from 'react';
import {
    ModelSelector,
    ResponsePanel,
    ActionButtons,
} from '../components';
import { useVsCode } from '../hooks/useVsCode';
import { useLLMStream } from '../hooks/useLLMStream';
import type { InitData, ResolutionType, HashType } from '../types';

interface ResolutionPageProps {
    initData: InitData;
}

/**
 * Finding Resolution 生成页面
 */
export function ResolutionPage({ initData }: ResolutionPageProps) {
    const { callLLM, stopGeneration, switchModel } = useVsCode();
    const { content, status, error, setContent } = useLLMStream();

    // 模型选择状态
    const [selectedProvider, setSelectedProvider] = useState(initData.llmConfig.defaultProvider);
    const [selectedModel, setSelectedModel] = useState(initData.llmConfig.defaultModel);

    // Resolution 类型
    const [resolutionType, setResolutionType] = useState<ResolutionType>('fixed');

    // Hash 类型与值
    const [hashType, setHashType] = useState<HashType>('none');
    const [hashValue, setHashValue] = useState('');

    // 动态字段
    const [showImprovementDesc, setShowImprovementDesc] = useState(false); // 控制改进描述是否显示
    const [improvementDesc, setImprovementDesc] = useState('');  // Fixed / Partially Fixed
    const [residualIssues, setResidualIssues] = useState('');    // Partially Fixed
    const [clientStatement, setClientStatement] = useState('');  // Ack / Partially Fixed

    // Finding 上下文（可选）
    const [showFindingContext, setShowFindingContext] = useState(false);
    const [findingContext, setFindingContext] = useState('');

    // 补充说明
    const [userNote, setUserNote] = useState('');

    // 切换 Provider
    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        const providerConfig = initData.llmConfig.providers.find(p => p.name === provider);
        const newModel = providerConfig?.models[0] || selectedModel;
        setSelectedModel(newModel);
        switchModel(provider, newModel);
    };

    // 切换模型
    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        switchModel(selectedProvider, model);
    };

    // 切换 Resolution 类型时重置无关字段
    const handleResolutionTypeChange = (type: ResolutionType) => {
        setResolutionType(type);
        setImprovementDesc('');
        setShowImprovementDesc(false);
        setResidualIssues('');
        setClientStatement('');
    };

    const handleGenerate = () => {
        const template = initData.templates[0];

        const options: Record<string, string | boolean | number> = {
            type: 'resolution',
            resolutionType,
            hashType,
        };

        if (hashType !== 'none' && hashValue) {
            options.hashValue = hashValue;
        }
        if (showImprovementDesc && improvementDesc) {
            options.improvementDesc = improvementDesc;
        }
        if (residualIssues) {
            options.residualIssues = residualIssues;
        }
        if (clientStatement) {
            options.clientStatement = clientStatement;
        }
        if (showFindingContext && findingContext) {
            options.findingContext = findingContext;
        }
        if (userNote) {
            options.userNote = userNote;
        }

        callLLM({
            prompt: template.content,
            code: '',
            provider: selectedProvider,
            model: selectedModel,
            options,
        });
    };


    return (
        <div className="resolution-page">
            <h2 className="resolution-page__title">Finding Resolution 生成</h2>

            {/* 模型选择 */}
            <ModelSelector
                config={initData.llmConfig}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
            />

            {/* Resolution 类型 */}
            <div className="resolution-page__section">
                <label className="resolution-page__label">Resolution 类型</label>
                <div className="resolution-page__type-group">
                    {(
                        [
                            { value: 'fixed', label: 'Fixed' },
                            { value: 'ack', label: 'Ack' },
                            { value: 'partially_fixed', label: 'Partially Fixed' },
                        ] as { value: ResolutionType; label: string }[]
                    ).map(({ value, label }) => (
                        <label key={value} className="resolution-page__radio-label">
                            <input
                                type="radio"
                                name="resolutionType"
                                value={value}
                                checked={resolutionType === value}
                                onChange={() => handleResolutionTypeChange(value)}
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Hash 类型（Fixed / Partially Fixed 时才有意义，但 Ack 也可能有，统一显示） */}
            {resolutionType !== 'ack' && (
                <div className="resolution-page__section">
                    <label className="resolution-page__label">Hash 类型</label>
                    <div className="resolution-page__type-group">
                        {(
                            [
                                { value: 'none', label: '无 Hash' },
                                { value: 'commit', label: 'Commit Hash' },
                                { value: 'code', label: 'Code Hash（压缩包）' },
                            ] as { value: HashType; label: string }[]
                        ).map(({ value, label }) => (
                            <label key={value} className="resolution-page__radio-label">
                                <input
                                    type="radio"
                                    name="hashType"
                                    value={value}
                                    checked={hashType === value}
                                    onChange={() => setHashType(value)}
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>

                    {/* Hash 值输入框（选了 commit 或 code 才显示） */}
                    {hashType !== 'none' && (
                        <input
                            className="resolution-page__input"
                            type="text"
                            placeholder={hashType === 'commit' ? '输入 commit hash，如 abc1234' : '输入代码压缩包 hash'}
                            value={hashValue}
                            onChange={e => setHashValue(e.target.value)}
                            style={{ marginTop: '8px' }}
                        />
                    )}
                </div>
            )}

            {/* 动态输入区：改进描述（Fixed / Partially Fixed） */}
            {(resolutionType === 'fixed' || resolutionType === 'partially_fixed') && (
                <div className="resolution-page__section">
                    <label className="resolution-page__toggle-label">
                        <input
                            type="checkbox"
                            checked={showImprovementDesc}
                            onChange={e => setShowImprovementDesc(e.target.checked)}
                        />
                        <span>提供项目方修复描述（不勾选此项则默认使用 implementing the recommended fix）</span>
                    </label>
                    {showImprovementDesc && (
                        <textarea
                            className="resolution-page__textarea"
                            rows={3}
                            placeholder="描述客户如何修改了此问题（自然语言即可，LLM 会润色）"
                            value={improvementDesc}
                            onChange={e => setImprovementDesc(e.target.value)}
                            style={{ marginTop: '8px' }}
                        />
                    )}
                </div>
            )}

            {/* 动态输入区：遗留问题（Partially Fixed） */}
            {resolutionType === 'partially_fixed' && (
                <div className="resolution-page__section">
                    <label className="resolution-page__label">遗留问题</label>
                    <textarea
                        className="resolution-page__textarea"
                        rows={3}
                        placeholder="描述仍然存在的问题"
                        value={residualIssues}
                        onChange={e => setResidualIssues(e.target.value)}
                    />
                </div>
            )}

            {/* 动态输入区：客户说明（Ack / Partially Fixed） */}
            {(resolutionType === 'ack' || resolutionType === 'partially_fixed') && (
                <div className="resolution-page__section">
                    <label className="resolution-page__label">
                        客户说明（WHY）
                    </label>
                    <textarea
                        className="resolution-page__textarea"
                        rows={3}
                        placeholder="客户为什么不修复此问题"
                        value={clientStatement}
                        onChange={e => setClientStatement(e.target.value)}
                    />
                </div>
            )}

            {/* 可选：Finding 上下文 */}
            <div className="resolution-page__section">
                <label className="resolution-page__toggle-label">
                    <input
                        type="checkbox"
                        checked={showFindingContext}
                        onChange={e => setShowFindingContext(e.target.checked)}
                    />
                    <span>提供原始 Finding 描述（供 LLM 参考上下文）</span>
                </label>
                {showFindingContext && (
                    <textarea
                        className="resolution-page__textarea"
                        rows={4}
                        placeholder="粘贴原始 Finding 描述..."
                        value={findingContext}
                        onChange={e => setFindingContext(e.target.value)}
                        style={{ marginTop: '8px' }}
                    />
                )}
            </div>

            {/* 补充说明 */}
            <div className="resolution-page__section">
                <label className="resolution-page__label">补充说明</label>
                <textarea
                    className="resolution-page__textarea"
                    rows={2}
                    placeholder="如果 Resolution 不符合你的要求，可在此填写额外要求，LLM 会以此为准..."
                    value={userNote}
                    onChange={e => setUserNote(e.target.value)}
                />
            </div>

            {/* 操作按钮 */}
            <ActionButtons
                status={status}
                onGenerate={handleGenerate}
                onStop={stopGeneration}
                generateLabel="Generate Resolution"
            />

            {/* 响应面板 */}
            <ResponsePanel content={content} status={status} error={error} onChange={setContent} />
        </div>
    );
}
