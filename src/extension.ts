import * as vscode from 'vscode';
import { PROMPT_FINDING_GENERATE, PROMPT_PARTICIPANT_PROCESS, PROMPT_FINDING_STRICT_GENERATE } from './prompt';

// 用于存储每个 Panel 对应的 AbortController，以便随时停止请求
const runningTasks = new WeakMap<vscode.WebviewPanel, AbortController>();

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "auditreporthelper" is now active!');

    const disposable = vscode.commands.registerCommand('auditreporthelper.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AuditReportHelper!');
    });

    // =========================================================================
    // Finding 信息生成
    // =========================================================================
    const reportHelper = vscode.commands.registerCommand('auditreporthelper.reportWrite', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const text = editor.document.getText(selection);
        const filePath = editor.document.fileName;
        const lineStart = selection.start.line + 1;
        const lineEnd = selection.end.line + 1;

        if (!text) {
            vscode.window.showWarningMessage('Please select some code first.');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'askAI', 'Finding 信息生成', vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        const savedTemplates = context.globalState.get('promptTemplates', [
            { name: "生成 Finding 描述", content: PROMPT_FINDING_STRICT_GENERATE },
            { name: "生成 Finding 描述-懒人模式", content: PROMPT_FINDING_GENERATE },
        ]);

        panel.webview.html = getWebviewContent(text, filePath, lineStart, lineEnd, savedTemplates);

        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'callLLM':
                    const controller = new AbortController();
                    runningTasks.set(panel, controller);
                    await handleCallLLMStream(panel, message.prompt, message.code, controller.signal);
                    break;
                case 'stopGeneration':
                    const task = runningTasks.get(panel);
                    if (task) {
                        task.abort();
                        runningTasks.delete(panel);
                        panel.webview.postMessage({ command: 'streamEnd' });
                    }
                    break;
            }
        }, undefined, context.subscriptions);
    });

    // =========================================================================
    // Process 生成
    // =========================================================================
    const processHelper = vscode.commands.registerCommand('auditreporthelper.generateParticipantProcess', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("请先打开一个代码文件。");
            return;
        }

        const fullCode = editor.document.getText();
        const fileName = editor.document.fileName.split(/[/\\]/).pop() || 'current file';

        const newProcessPanel = vscode.window.createWebviewPanel(
            'participantProcess', 
            `Process: ${fileName}`, 
            vscode.ViewColumn.Beside, 
            { enableScripts: true, retainContextWhenHidden: true }
        );

        newProcessPanel.webview.html = getProcessWebviewContent(fullCode, fileName, PROMPT_PARTICIPANT_PROCESS);

        newProcessPanel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'callLLM':
                    const controller = new AbortController();
                    runningTasks.set(newProcessPanel, controller);
                    await handleCallLLMStream(newProcessPanel, message.prompt, message.code, controller.signal);
                    break;
                case 'stopGeneration':
                    const task = runningTasks.get(newProcessPanel);
                    if (task) {
                        task.abort();
                        runningTasks.delete(newProcessPanel);
                        newProcessPanel.webview.postMessage({ command: 'streamEnd' });
                    }
                    break;
            }
        }, undefined, context.subscriptions);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(reportHelper);
    context.subscriptions.push(processHelper);
}

// =========================================================================
// 核心：流式 LLM 调用处理函数
// =========================================================================
async function handleCallLLMStream(
    panel: vscode.WebviewPanel, 
    prompt: string, 
    code: string, 
    signal: AbortSignal
) {
    const config = vscode.workspace.getConfiguration('codeAskAI');
    const apiKey = config.get<string>('apiKey');
    
    let baseUrl = config.get<string>('baseUrl') || "https://api.deepseek.com";
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let fetchUrl = `${baseUrl}/chat/completions`;
    if (baseUrl.includes('/chat/completions')) fetchUrl = baseUrl;

    const model = config.get<string>('model') || "deepseek-coder";

    if (!apiKey) {
        panel.webview.postMessage({ command: 'error', text: '请先配置 API Key。' });
        const action = await vscode.window.showErrorMessage('未检测到 API Key！', '去配置');
        if (action === '去配置') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'codeAskAI.apiKey');
        }
        return;
    }

    panel.webview.postMessage({ command: 'thinking' });

    try {
        const fullContent = `${prompt}\n\n代码片段:\n\`\`\`\n${code}\n\`\`\``;

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: fullContent }],
                stream: true
            }),
            signal: signal
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; 

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data: ")) continue;
                
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") continue;

                try {
                    const json = JSON.parse(dataStr);
                    const deltaContent = json.choices?.[0]?.delta?.content;
                    
                    if (deltaContent) {
                        panel.webview.postMessage({ command: 'streamUpdate', text: deltaContent });
                    }
                } catch (e) {
                    console.error("JSON parse error", e);
                }
            }
        }
        panel.webview.postMessage({ command: 'streamEnd' });

    } catch (error: any) {
        if (error.name === 'AbortError') {
            panel.webview.postMessage({ command: 'streamEnd' }); 
        } else {
            panel.webview.postMessage({ command: 'error', text: `请求失败: ${error.message}` });
        }
    } finally {
        runningTasks.delete(panel);
    }
}

// =========================================================================
// 【重要修复】安全序列化函数
// 专门把 < 符号转义，防止 </script> 截断脚本
// =========================================================================
function safeJsonStringify(obj: any) {
    return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

// =========================================================================
// HTML 模板 1: Finding Generator
// =========================================================================
function getWebviewContent(code: string, path: string, start: number, end: number, templates: any[]) {
    // 使用 safeJsonStringify 替代 JSON.stringify
    const templatesJson = safeJsonStringify(templates);
    const codeJson = safeJsonStringify(code);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
        .info-box { font-size: 0.85em; color: var(--vscode-descriptionForeground); margin-bottom: 10px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 5px; }
        select, textarea, input { width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 5px; box-sizing: border-box; margin-bottom: 10px; font-family: var(--vscode-font-family); }
        #code-snippet { font-family: 'Courier New', monospace; white-space: pre; overflow-x: auto; min-height: 120px; resize: vertical; }
        #response-text { min-height: 200px; resize: vertical; line-height: 1.5; }
        .control-group { margin-bottom: 15px; border: 1px solid var(--vscode-input-border); padding: 10px; border-radius: 4px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        .btn-group { display: flex; gap: 10px; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; flex: 1; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        #stop-btn { background: #d32f2f; display: none; } 
        #stop-btn:hover { background: #b71c1c; }
        #status-msg { margin-top: 10px; margin-bottom: 5px; min-height: 20px;}
        .loading { color: var(--vscode-textLink-activeForeground); font-style: italic; }
        .error { color: #f48771; }
    </style>
</head>
<body>
    <div class="info-box"><strong>File:</strong> ${path}#L${start} - ${end}</div>
    <label>Selected Code:</label>
    <textarea id="code-snippet"></textarea>

    <div class="control-group">
        <label>Prompt Template:</label>
        <select id="template-select"></select>
        <label>Your Input:</label>
        <textarea id="user-input" rows="3"></textarea>
        
        <div class="btn-group">
            <button id="ask-btn">Generate Finding</button>
            <button id="stop-btn">Stop Generation ⏹️</button>
        </div>
    </div>

    <div id="status-msg"></div>
    <label>AI Response:</label>
    <textarea id="response-text" placeholder="AI response will stream here..."></textarea>

    <script>
        const vscode = acquireVsCodeApi();
        const templates = ${templatesJson};
        
        document.getElementById('code-snippet').value = ${codeJson};

        const select = document.getElementById('template-select');
        templates.forEach((t, i) => {
            const opt = document.createElement('option');
            opt.value = i; opt.text = t.name; select.appendChild(opt);
        });

        const askBtn = document.getElementById('ask-btn');
        const stopBtn = document.getElementById('stop-btn');
        const statusDiv = document.getElementById('status-msg');
        const responseText = document.getElementById('response-text');

        askBtn.addEventListener('click', () => {
            const tpl = templates[select.value].content;
            const userIn = document.getElementById('user-input').value;
            const code = document.getElementById('code-snippet').value;
            vscode.postMessage({ command: 'callLLM', prompt: tpl + " " + userIn, code: code });
        });

        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'stopGeneration' });
            statusDiv.innerHTML = '<span style="color:orange">Stopping...</span>';
            stopBtn.disabled = true;
        });

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'thinking':
                    responseText.value = ''; 
                    statusDiv.innerHTML = '<span class="loading">Thinking & Streaming...</span>';
                    askBtn.style.display = 'none';
                    stopBtn.style.display = 'block';
                    stopBtn.disabled = false;
                    break;
                case 'streamUpdate':
                    responseText.value += msg.text;
                    responseText.scrollTop = responseText.scrollHeight;
                    break;
                case 'streamEnd':
                    statusDiv.innerHTML = '✅ Done.';
                    askBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                    break;
                case 'error':
                    statusDiv.innerHTML = '<span class="error">Error: ' + msg.text + '</span>';
                    askBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                    break;
            }
        });
    </script>
</body>
</html>`;
}

// =========================================================================
// HTML 模板 2: Process Generator
// =========================================================================
function getProcessWebviewContent(code: string, fileName: string, prompt: string) {
    // 使用 safeJsonStringify 替代 JSON.stringify
    const codeJson = safeJsonStringify(code);
    const promptJson = safeJsonStringify(prompt);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: var(--vscode-font-family); padding: 15px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        details { margin-bottom: 15px; border: 1px solid var(--vscode-panel-border); }
        summary { padding: 8px; cursor: pointer; background: var(--vscode-sideBar-background); }
        #source-code-viewer { width: 100%; height: 200px; font-family: 'Courier New', monospace; white-space: pre; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: none; padding: 10px; resize: vertical; }
        .btn-group { display: flex; gap: 10px; margin-bottom: 15px; }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 12px; cursor: pointer; flex: 1; border-radius: 4px; font-size: 1.1em;}
        button:hover { background: var(--vscode-button-hoverBackground); }
        #stop-btn { background: #d32f2f; display: none; }
        #stop-btn:hover { background: #b71c1c; }
        .result-container { flex-grow: 1; display: flex; flex-direction: column; }
        #result-editor { flex-grow: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 15px; font-family: var(--vscode-editor-font-family); line-height: 1.6; resize: none; }
        #status-box { margin-bottom: 10px; min-height: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <h2>Process Generator: ${fileName}</h2>
    <details>
        <summary>View Source Code</summary>
        <textarea id="source-code-viewer"></textarea>
    </details>

    <div class="btn-group">
        <button id="generate-btn">🚀 Start Generation</button>
        <button id="stop-btn">🛑 Stop</button>
    </div>

    <div id="status-box"></div>
    <div class="result-container">
        <textarea id="result-editor" placeholder="Result will stream here..."></textarea>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        // 使用转义后的 JSON，避免 HTML 结构破坏
        document.getElementById('source-code-viewer').value = ${codeJson};
        const prompt = ${promptJson};

        const genBtn = document.getElementById('generate-btn');
        const stopBtn = document.getElementById('stop-btn');
        const status = document.getElementById('status-box');
        const editor = document.getElementById('result-editor');

        genBtn.addEventListener('click', () => {
            // 这里我们传回后端的还是原始的 codeJson (包含 Unicode 转义的)，
            // 但后端其实只关心它的内容。为了保险，我们在前端取 value 发送更稳妥
            const currentCode = document.getElementById('source-code-viewer').value;
            vscode.postMessage({ command: 'callLLM', prompt: prompt, code: currentCode });
        });

        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'stopGeneration' });
            stopBtn.disabled = true;
            status.innerHTML = 'Stopping...';
        });

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'thinking':
                    editor.value = '';
                    status.innerText = 'Analyzing & Streaming...';
                    genBtn.style.display = 'none';
                    stopBtn.style.display = 'block';
                    stopBtn.disabled = false;
                    break;
                case 'streamUpdate':
                    editor.value += msg.text;
                    editor.scrollTop = editor.scrollHeight;
                    break;
                case 'streamEnd':
                    status.innerText = '✅ Complete.';
                    genBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                    break;
                case 'error':
                    status.innerText = 'Error: ' + msg.text;
                    genBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                    break;
            }
        });
    </script>
</body>
</html>`;
}

export function deactivate() {}