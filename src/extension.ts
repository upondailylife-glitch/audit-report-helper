// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PROMPT_FINDING_GENERATE,PROMPT_PARTICIPANT_PROCESS } from './prompt';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "auditreporthelper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('auditreporthelper.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from AuditReportHelper!');
	});

	const reportHelper = vscode.commands.registerCommand('auditreporthelper.reportWrite',() => {
		const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

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
            'askAI',
            'Finding 信息生成',
            vscode.ViewColumn.Two, // 在侧边打开
            { enableScripts: true,
			  retainContextWhenHidden: true
			}
        );

		const savedTemplates = context.globalState.get('promptTemplates', [
            { name: "生成 Finding 描述", content: PROMPT_FINDING_GENERATE },
            // { name: "寻找Bug", content: "请帮我找出这段代码中的潜在Bug：" },
            // { name: "代码优化", content: "请帮我优化这段代码，使其更高效：" }
        ]);

		panel.webview.html = getWebviewContent(text, filePath, lineStart, lineEnd, savedTemplates);

		panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'callLLM':
                        await handleCallLLM(panel, message.prompt, message.code);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

	const processHelper = vscode.commands.registerCommand('auditreporthelper.generateParticipantProcess', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("请先打开一个代码文件。");
            return;
        }

        // 1. 获取全文
        const fullCode = editor.document.getText();
        const fileName = editor.document.fileName.split(/[/\\]/).pop() || 'current file';

        // 2. 强制创建新面板 (注意：这里定义的 panel 变量在函数内部，每次运行都是新的)
        const newProcessPanel = vscode.window.createWebviewPanel(
            'participantProcess', // 内部 viewType
            `Process: ${fileName}`, // 标题带上文件名，方便区分
            vscode.ViewColumn.Beside, // 在旁边打开，方便对照
            {
                enableScripts: true,
                retainContextWhenHidden: true // 切换标签不丢失内容
            }
        );
        newProcessPanel.webview.html = getProcessWebviewContent(fullCode, fileName, PROMPT_PARTICIPANT_PROCESS);

        // 5. 为这个新面板绑定消息监听
        newProcessPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'callLLM':
                        // 复用通用的 LLM 调用函数
                        await handleCallLLM(newProcessPanel, message.prompt, message.code);
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

	context.subscriptions.push(disposable);
	context.subscriptions.push(reportHelper);
	context.subscriptions.push(processHelper);
}

// 处理 LLM 调用 (DeepSeek 专版)
async function handleCallLLM(panel: vscode.WebviewPanel, prompt: string, code: string) {
    // 1. 只获取 API Key，其他参数我们直接写死 DeepSeek 的标准值
    const config = vscode.workspace.getConfiguration('codeAskAI');
    const apiKey = config.get<string>('apiKey');

    // DeepSeek 官方配置
    const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
    const DEEPSEEK_MODEL = "deepseek-coder"; // 或者 "deepseek-coder"

    if (!apiKey) {
        panel.webview.postMessage({ command: 'error', text: '请在 VS Code 设置中配置 DeepSeek API Key (codeAskAI.apiKey)。' });
        return;
    }

    // 发送 "思考中" 状态给前端
    panel.webview.postMessage({ command: 'thinking' });

    try {
        // 拼接提示词
        const fullContent = `${prompt}\n\n代码片段:\n\`\`\`\n${code}\n\`\`\``;
        
        // 2. 发起请求
        const response = await fetch(DEEPSEEK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // DeepSeek 使用 Bearer Token 认证
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: [
                    // { role: "system", content: "你是一个专业的代码助手。" }, // 加个 system prompt 效果更好
                    { role: "user", content: fullContent }
                ],
                stream: false // 为了简化代码，暂时不使用流式
            })
        });

        const data: any = await response.json();
        
        // 3. 错误处理
        if (data.error) {
             throw new Error(data.error.message || JSON.stringify(data.error));
        }

        // 4. 获取返回内容
        const reply = data.choices[0].message.content;
        
        // 发送结果回 Webview
        panel.webview.postMessage({ command: 'result', text: reply });

    } catch (error: any) {
        console.error(error); // 在调试控制台打印详细错误
        panel.webview.postMessage({ command: 'error', text: `请求失败: ${error.message}` });
    }
}


function getWebviewContent(code: string, path: string, start: number, end: number, templates: any[]) {
    const templatesJson = JSON.stringify(templates);
    const codeJson = JSON.stringify(code);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Assistant</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 10px; 
            color: var(--vscode-editor-foreground); 
            background-color: var(--vscode-editor-background); 
        }
        
        .info-box { 
            font-size: 0.85em; 
            color: var(--vscode-descriptionForeground); 
            margin-bottom: 10px; 
            border-bottom: 1px solid var(--vscode-panel-border); 
            padding-bottom: 5px; 
        }

        /* 输入框通用样式 */
        select, textarea, input { 
            width: 100%; 
            background: var(--vscode-input-background); 
            color: var(--vscode-input-foreground); 
            border: 1px solid var(--vscode-input-border); 
            padding: 5px; 
            box-sizing: border-box; 
            margin-bottom: 10px; 
            font-family: var(--vscode-font-family);
        }

        /* 代码编辑框样式 */
        #code-snippet {
            font-family: 'Courier New', monospace;
            white-space: pre;
            overflow-x: auto;
            min-height: 120px;
            resize: vertical; 
        }

        /* AI 回复编辑框样式 (新加) */
        #response-text {
            min-height: 200px; /* 给回复多一点空间 */
            resize: vertical;
            line-height: 1.5;
        }
        
        .control-group { 
            margin-bottom: 15px; 
            border: 1px solid var(--vscode-input-border); 
            padding: 10px; 
            border-radius: 4px; 
        }
        
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        
        button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 8px 12px; 
            cursor: pointer; 
            width: 100%;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        
        /* 状态提示样式 */
        #status-msg { margin-top: 10px; margin-bottom: 5px; }
        .loading { color: var(--vscode-textLink-activeForeground); font-style: italic; }
        .error { color: #f48771; }
    </style>
</head>
<body>

    <div class="info-box">
        <strong>File:</strong> ${path}#L${start} - ${end}<br>
    </div>

    <label>Selected Code (Editable):</label>
    <textarea id="code-snippet" placeholder="Code will appear here..."></textarea>

    <div class="control-group">
        <label>Prompt Template:</label>
        <select id="template-select"></select>
        
        <label>Your Input (Will append to template):</label>
        <textarea id="user-input" rows="3" placeholder="Additional requirements..."></textarea>
        
        <button id="ask-btn">Generate Finding</button>
    </div>

    <div id="status-msg"></div>

    <label>AI Response (Editable):</label>
    <textarea id="response-text" placeholder="AI response will be generated here..."></textarea>

    <script>
        const vscode = acquireVsCodeApi();
        
        const templates = ${templatesJson};
        const initialCode = ${codeJson};

        // 初始化代码框
        const codeInput = document.getElementById('code-snippet');
        codeInput.value = initialCode;

        // 初始化模板
        function renderTemplates() {
            const select = document.getElementById('template-select');
            select.innerHTML = '';
            templates.forEach((t, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.text = t.name;
                select.appendChild(opt);
            });
        }
        renderTemplates();

        // 点击发送
        document.getElementById('ask-btn').addEventListener('click', () => {
            const selectedIdx = document.getElementById('template-select').value;
            const tplContent = templates[selectedIdx].content;
            const userInput = document.getElementById('user-input').value;
            const currentCode = document.getElementById('code-snippet').value;

            const finalPrompt = tplContent + " " + userInput;

            vscode.postMessage({
                command: 'callLLM',
                prompt: finalPrompt,
                code: currentCode 
            });
        });

        // 接收消息
        window.addEventListener('message', event => {
            const message = event.data;
            const statusDiv = document.getElementById('status-msg');
            const responseText = document.getElementById('response-text');
            
            switch (message.command) {
                case 'thinking':
                    // 清空之前的回复，显示思考中
                    responseText.value = ''; 
                    statusDiv.innerHTML = '<span class="loading">Generating Finding Info... (Please wait)</span>';
                    break;

                case 'result':
                    // 隐藏状态信息，将结果填入 Textarea
                    statusDiv.innerHTML = ''; 
                    responseText.value = message.text;
                    break;

                case 'error':
                    // 显示错误信息
                    statusDiv.innerHTML = '<span class="error">Error: ' + message.text + '</span>';
                    break;
            }
        });
    </script>
</body>
</html>`;
}

function getProcessWebviewContent(code: string, fileName: string, prompt: string) {
    const codeJson = JSON.stringify(code);
    const promptJson = JSON.stringify(prompt);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate Process</title>
    <style>
        /* 使用 VS Code 原生变量，确保主题统一 */
        body { 
            font-family: var(--vscode-font-family); 
            padding: 15px; 
            color: var(--vscode-editor-foreground); 
            background-color: var(--vscode-editor-background); 
            display: flex;
            flex-direction: column;
            height: 100vh; /* 占满全屏高度 */
            box-sizing: border-box;
        }
        
        h2 { margin-top: 0; color: var(--vscode-textLink-foreground); }
        
        /* 头部信息栏 */
        .header-info {
            margin-bottom: 15px;
            padding: 10px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 0.9em;
        }

        /* 代码查看区域 (可折叠) */
        details {
            margin-bottom: 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        summary {
            padding: 8px;
            cursor: pointer;
            font-weight: bold;
            background: var(--vscode-sideBar-background);
            user-select: none;
        }
        #source-code-viewer {
            width: 100%;
            height: 200px;
            font-family: 'Courier New', monospace;
            white-space: pre;
            overflow: auto;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: none;
            padding: 10px;
            resize: vertical;
        }

        /* 主要操作按钮 */
        #generate-btn { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 12px 20px; 
            font-size: 1.1em;
            cursor: pointer; 
            width: 100%;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        #generate-btn:hover { background: var(--vscode-button-hoverBackground); }
        
        /* 状态显示 */
        #status-box { margin-bottom: 10px; min-height: 20px; }
        .loading { color: var(--vscode-textLink-activeForeground); font-weight: bold; display: flex; align-items: center;}
        .loading::before { content: "⚙️ "; margin-right: 5px; animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .error { color: #f48771; }

        /* 结果编辑区域 (占据剩余空间) */
        .result-container {
            flex-grow: 1; /* 自动撑开高度 */
            display: flex;
            flex-direction: column;
        }
        label { font-weight: bold; margin-bottom: 8px; display: block; }
        #result-editor {
            flex-grow: 1; /* 占据父容器剩余空间 */
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 15px;
            box-sizing: border-box;
            font-family: var(--vscode-editor-font-family, 'Courier New');
            font-size: var(--vscode-editor-font-size, 14px);
            line-height: 1.6;
            resize: none; /* 禁用手动拉伸，由 flex 布局控制 */
        }
    </style>
</head>
<body>

    <h2>Participant Process Generator</h2>

    <div class="header-info">
        <strong>Analyzing File:</strong> ${fileName}
    </div>

    <details>
        <summary>View Full Source Code</summary>
        <textarea id="source-code-viewer"></textarea>
    </details>

    <button id="generate-btn">Generate Process</button>

    <div id="status-box"></div>

    <div class="result-container">
        <label for="result-editor">Generated Process Description (Editable):</label>
        <textarea id="result-editor" placeholder="AI generated process description will appear here. You can edit it directly."></textarea>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // 初始化数据
        const fullCode = ${codeJson};
        const systemPrompt = ${promptJson};

        // 填充源代码查看器
        document.getElementById('source-code-viewer').value = fullCode;

        const generateBtn = document.getElementById('generate-btn');
        const statusBox = document.getElementById('status-box');
        const resultEditor = document.getElementById('result-editor');

        // 点击生成按钮
        generateBtn.addEventListener('click', () => {
            // 发送请求
            vscode.postMessage({
                command: 'callLLM',
                prompt: systemPrompt, // 使用预设的特定 Prompt
                code: fullCode        // 发送全文
            });
        });

        // 接收消息监听
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'thinking':
                    resultEditor.value = ''; // 清空旧结果
                    statusBox.innerHTML = '<span class="loading">AI is analyzing the full file and generating process flow...</span>';
                    generateBtn.disabled = true; // 防止重复点击
                    generateBtn.textContent = 'Analyzing...';
                    break;

                case 'result':
                    statusBox.innerHTML = '✅ Generation complete. You can now edit the result below.';
                    resultEditor.value = message.text; // 填入结果
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate Process';
                    break;

                case 'error':
                    statusBox.innerHTML = '<span class="error">❌ Error: ' + message.text + '</span>';
                    generateBtn.disabled = false;
                    generateBtn.textContent = 'Generate Process';
                    break;
            }
        });
    </script>
</body>
</html>`;
}
// This method is called when your extension is deactivated
export function deactivate() {}
