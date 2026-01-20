
import type { StreamStatus } from '../hooks/useLLMStream';

interface ActionButtonsProps {
    status: StreamStatus;
    onGenerate: () => void;
    onStop: () => void;
    generateLabel?: string;
}

/**
 * 操作按钮组件
 */
export function ActionButtons({
    status,
    onGenerate,
    onStop,
    generateLabel = 'Generate',
}: ActionButtonsProps) {
    const isStreaming = status === 'streaming';

    return (
        <div className="action-buttons">
            {!isStreaming ? (
                <button className="action-buttons__generate" onClick={onGenerate}>
                    🚀 {generateLabel}
                </button>
            ) : (
                <button className="action-buttons__stop" onClick={onStop}>
                    🛑 Stop
                </button>
            )}
        </div>
    );
}
