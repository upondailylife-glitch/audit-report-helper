import { useState, useEffect, useCallback } from 'react';
import type { ExtensionToWebviewMessage } from '../types';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

interface UseLLMStreamResult {
    content: string;
    status: StreamStatus;
    error: string | null;
    reset: () => void;
}

/**
 * 处理 LLM 流式响应的 Hook
 */
export function useLLMStream(): UseLLMStreamResult {
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<StreamStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
            const message = event.data;

            switch (message.type) {
                case 'STREAM_START':
                    setContent('');
                    setStatus('streaming');
                    setError(null);
                    break;

                case 'STREAM_CHUNK':
                    setContent((prev) => prev + message.payload);
                    break;

                case 'STREAM_END':
                    setStatus('done');
                    break;

                case 'STREAM_ERROR':
                    setStatus('error');
                    setError(message.payload);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const reset = useCallback(() => {
        setContent('');
        setStatus('idle');
        setError(null);
    }, []);

    return { content, status, error, reset };
}
