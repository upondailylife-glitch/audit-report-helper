import { useState, useEffect } from 'react';
import { FindingPage, ProcessPage, ResolutionPage } from './pages';
import type { InitData, ExtensionToWebviewMessage } from './types';
import './styles/index.css';

/**
 * 根组件 - 根据初始化数据渲染对应页面
 */
export function App() {
    const [initData, setInitData] = useState<InitData | null>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
            const message = event.data;
            if (message.type === 'INIT_DATA') {
                setInitData(message.payload);
            } else if (message.type === 'CONFIG_UPDATE') {
                // 配置更新时，更新 llmConfig
                setInitData((prev) => prev ? { ...prev, llmConfig: message.payload } : null);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 等待初始化数据
    if (!initData) {
        return (
            <div className="app-loading">
                <span>Loading...</span>
            </div>
        );
    }

    // 根据页面类型渲染
    switch (initData.pageType) {
        case 'finding':
            return <FindingPage initData={initData} />;
        case 'process':
            return <ProcessPage initData={initData} />;
        case 'resolution':
            return <ResolutionPage initData={initData} />;
        default:
            return <div className="app-error">Unknown page type</div>;
    }
}
