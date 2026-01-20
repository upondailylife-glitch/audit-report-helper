
import type { PromptTemplate } from '../types';

interface PromptSelectorProps {
    templates: PromptTemplate[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    userInput: string;
    onUserInputChange: (value: string) => void;
}

/**
 * Prompt 模板选择器组件
 */
export function PromptSelector({
    templates,
    selectedIndex,
    onSelect,
    userInput,
    onUserInputChange,
}: PromptSelectorProps) {
    return (
        <div className="prompt-selector">
            <div className="prompt-selector__template">
                <label className="prompt-selector__label">Prompt 模板</label>
                <select
                    className="prompt-selector__select"
                    value={selectedIndex}
                    onChange={(e) => onSelect(Number(e.target.value))}
                >
                    {templates.map((template, index) => (
                        <option key={index} value={index}>
                            {template.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="prompt-selector__input">
                <label className="prompt-selector__label">补充说明</label>
                <textarea
                    className="prompt-selector__textarea"
                    value={userInput}
                    onChange={(e) => onUserInputChange(e.target.value)}
                    placeholder="输入额外的描述信息..."
                    rows={3}
                />
            </div>
        </div>
    );
}
