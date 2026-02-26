// ============================================================================
// AuditReportHelper Extension 入口
// ============================================================================

import * as vscode from 'vscode';
import { registerFindingCommand } from './commands/findingCommand';
import { registerProcessCommand } from './commands/processCommand';
import { registerConfigureProviderCommand } from './commands/configureProviderCommand';
import { registerResolutionCommand } from './commands/resolutionCommand';

export function activate(context: vscode.ExtensionContext) {
    console.log('AuditReportHelper is now active!');

    // 注册命令
    context.subscriptions.push(registerFindingCommand(context));
    context.subscriptions.push(registerProcessCommand(context));
    context.subscriptions.push(registerConfigureProviderCommand(context));
    context.subscriptions.push(registerResolutionCommand(context));
}

export function deactivate() { }