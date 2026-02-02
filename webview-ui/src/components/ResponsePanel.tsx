import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
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
    const previewRef = useRef<HTMLDivElement>(null);
    const [showMarkdown, setShowMarkdown] = useState(false);

    // 自动滚动到底部
    useEffect(() => {
        if (status === 'streaming') {
            if (textareaRef.current) {
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
            if (showMarkdown && previewRef.current) {
                previewRef.current.scrollTop = previewRef.current.scrollHeight;
            }
        }
    }, [content, status, showMarkdown]);

    return (
        <div className="response-panel">
            <div className="response-panel__header">
                <span className="response-panel__title">AI Response</span>
                <StatusIndicator status={status} />
            </div>
            {error && <div className="response-panel__error">{error}</div>}

            {/* Markdown 渲染开关 - 移到内容区域上方 */}
            <div className="response-panel__markdown-toggle">
                <label className="response-panel__toggle-label">
                    <input
                        type="checkbox"
                        checked={showMarkdown}
                        onChange={(e) => setShowMarkdown(e.target.checked)}
                    />
                    <span>预览 Markdown</span>
                </label>
            </div>

            {/* 内容区域：编辑器 + 可选的预览 */}
            <div className={`response-panel__body ${showMarkdown ? 'response-panel__body--split' : ''}`}>
                {/* 始终显示的可编辑区域 */}
                <textarea
                    ref={textareaRef}
                    className="response-panel__content response-panel__editor"
                    value={content}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder="AI response will appear here..."
                />

                {/* 勾选时显示的预览区域 */}
                {showMarkdown && (
                    <div
                        ref={previewRef}
                        className="response-panel__content response-panel__markdown-preview"
                    >
                        <Markdown>{content || '*AI response will appear here...*'}</Markdown>
                    </div>
                )}
            </div>
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

