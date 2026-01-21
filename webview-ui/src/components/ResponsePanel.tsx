import { useRef, useEffect } from 'react';
import type { StreamStatus } from '../hooks/useLLMStream';

interface ResponsePanelProps {
    content: string;
    status: StreamStatus;
    error: string | null;
    onChange?: (content: string) => void;
}

/**
 * AI 响应展示面板
 */
export function ResponsePanel({ content, status, error, onChange }: ResponsePanelProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (textareaRef.current && status === 'streaming') {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [content, status]);

    return (
        <div className="response-panel">
            <div className="response-panel__header">
                <span className="response-panel__title">AI Response</span>
                <StatusIndicator status={status} />
            </div>
            {error && <div className="response-panel__error">{error}</div>}
            <textarea
                ref={textareaRef}
                className="response-panel__content"
                value={content}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder="AI response will appear here..."
            />
        </div>
    );
}

function StatusIndicator({ status }: { status: StreamStatus }) {
    const statusConfig: Record<StreamStatus, { text: string; className: string }> = {
        idle: { text: '', className: '' },
        streaming: { text: '⏳ Generating...', className: 'status--streaming' },
        done: { text: '✅ Done', className: 'status--done' },
        error: { text: '❌ Error', className: 'status--error' },
    };

    const config = statusConfig[status];
    if (!config.text) return null;

    return <span className={`response-panel__status ${config.className}`}>{config.text}</span>;
}
