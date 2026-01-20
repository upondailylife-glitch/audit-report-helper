
import type { PromptOption, PromptOptionValues } from '../types';

interface PromptOptionsPanelProps {
    options: PromptOption[];
    values: PromptOptionValues;
    onChange: (id: string, value: boolean | string | number) => void;
    onOpenConfiguration?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    output: '输出设置',
    format: '格式设置',
    behavior: '行为设置',
};

/**
 * Prompt 选项面板组件
 */
export function PromptOptionsPanel({ options, values, onChange, onOpenConfiguration }: PromptOptionsPanelProps) {
    // 按分类分组
    const categories = [...new Set(options.map((o) => o.category))];
    const optionsByCategory = categories.map((category) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        options: options
            .filter((o) => o.category === category)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));

    return (
        <div className="prompt-options-panel">
            {optionsByCategory.map(({ category, label, options: categoryOptions }) => (
                <div key={category} className="prompt-options-panel__category">
                    <h4 className="prompt-options-panel__category-label">{label}</h4>
                    <div className="prompt-options-panel__options">
                        {categoryOptions.map((option) => (
                            <OptionRenderer
                                key={option.id}
                                option={option}
                                value={values[option.id]}
                                onChange={(value) => onChange(option.id, value)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* 配置按钮 */}
            {onOpenConfiguration && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--vscode-panel-border)', paddingTop: '12px' }}>
                    <button
                        onClick={onOpenConfiguration}
                        style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '0.9em',
                            background: 'transparent',
                            border: '1px solid var(--vscode-button-border, transparent)',
                            color: 'var(--vscode-textLink-foreground)',
                            cursor: 'pointer',
                        }}
                    >
                        ⚙ 配置 LLM API Key
                    </button>
                </div>
            )}
        </div>
    );
}

interface OptionRendererProps {
    option: PromptOption;
    value: boolean | string | number | undefined;
    onChange: (value: boolean | string | number) => void;
}

function OptionRenderer({ option, value, onChange }: OptionRendererProps) {
    switch (option.type) {
        case 'toggle':
            return (
                <div className="option-item option-item--toggle">
                    <label className="option-item__label">
                        <input
                            type="checkbox"
                            checked={Boolean(value ?? option.defaultValue)}
                            onChange={(e) => onChange(e.target.checked)}
                        />
                        <span>{option.label}</span>
                    </label>
                    {option.description && (
                        <span className="option-item__description">{option.description}</span>
                    )}
                </div>
            );

        case 'select':
            return (
                <div className="option-item option-item--select">
                    <label className="option-item__label">{option.label}</label>
                    <select
                        className="option-item__select"
                        value={String(value ?? option.defaultValue)}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        {option.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            );

        case 'number':
            return (
                <div className="option-item option-item--number">
                    <label className="option-item__label">{option.label}</label>
                    <input
                        type="number"
                        className="option-item__input"
                        value={Number(value ?? option.defaultValue)}
                        min={option.min}
                        max={option.max}
                        step={option.step}
                        onChange={(e) => onChange(Number(e.target.value))}
                    />
                </div>
            );

        case 'text':
            return (
                <div className="option-item option-item--text">
                    <label className="option-item__label">{option.label}</label>
                    <input
                        type="text"
                        className="option-item__input"
                        value={String(value ?? option.defaultValue)}
                        placeholder={option.placeholder}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            );

        default:
            return null;
    }
}
