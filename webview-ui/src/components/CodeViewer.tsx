

interface CodeViewerProps {
    code: string;
    filePath?: string;
    lineStart?: number;
    lineEnd?: number;
    editable?: boolean;
    onChange?: (code: string) => void;
}

/**
 * 代码展示/编辑组件
 */
export function CodeViewer({
    code,
    filePath,
    lineStart,
    lineEnd,
    editable = false,
    onChange,
}: CodeViewerProps) {
    return (
        <div className="code-viewer">
            {filePath && (
                <div className="code-viewer__header">
                    <span className="code-viewer__path">{filePath}</span>
                    {lineStart && lineEnd && (
                        <span className="code-viewer__lines">
                            L{lineStart} - L{lineEnd}
                        </span>
                    )}
                </div>
            )}
            <textarea
                className="code-viewer__content"
                value={code}
                readOnly={!editable}
                onChange={(e) => onChange?.(e.target.value)}
                spellCheck={false}
            />
        </div>
    );
}
