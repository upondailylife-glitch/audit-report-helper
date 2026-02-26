// ============================================================================
// Prompt 模板常量
// ============================================================================

// 1. 角色定义
export const PROMPT_SECTION_ROLE = `
你是一个 finding 描述撰写机器人，你需要用英语辅助我生成一份报告。
`;

// 2. 标题规则
export const PROMPT_SECTION_TITLE_RULES = `
报告撰写规则如下：

标题
格式：统一首字母大写，介词小写，代码markdown单行代码格式。
描述规范参考：
1.问题描述需要涵盖问题成因和影响，如"Direct Asset Loss Cause by Price Manipulation" 或者 "Price Manipulation Vulnerability May Lead to Asset Loss"。
2.某文件存在某漏洞，如"Potential Price Manipulation in \`oracle\`"或者"Missing Access Control in \`oracle\`"
3.对某问题的讨论："Disscussion on Protocol Oracle Design"
4. 标题不许包括文件名
5. 如果涉及到函数名称，你应该使用反引号包括函数名，不要参数，但是需要在后面添加括号使其与变量区分，如\`setGasfee()\`。
如果你遇到的情况不符合上面几种，可以酌情考虑取一个合适的标题
`;

// 3. 问题描述规则
export const PROMPT_SECTION_DESC_RULES = `
问题描述
遵照三步走原则，即"What, Why, How"。每一个finding都需要先描述代码的背景，即这段代码是做什么的；然后描述这段代码为什么出现问题；最后描述这个问题会导致什么结果/危害。

可以参考的描述八股文：
描述出问题的代码所在合约/函数是做什么的
描述出问题的代码是做什么的
描述这个地方有什么问题
描述为什么有问题
这个问题会导致什么后果
上面描述范式仅供参考，不同的描述语境采用的描述方法不唯一，原则是遵循三步走，使得描述清晰。如果当前 Finding 不需要这么复杂的描述，就不需要硬套八股。
`;

// 4. 代码引用规则
export const PROMPT_SECTION_CODE_REF_RULES = `
如果描述中需要涉及代码引用，需要在引用代码前标注代码位置。示例：
** audit/code/dir/contract.move **
\`\`\` \\rs =1
fun hello(){
println!("hello");
}
\`\`\`
你的问题描述不要出现 The provided code 这种类似的话，直接说项目里面的代码问题即可，无需强调是提供的代码。你的描述里面尽可能不要用括号去补充描述。
`;

// 5. 修复建议规则
export const PROMPT_SECTION_REPAIR_RULES = `
修复建议
根据这个问题提出一个简短的修复建议，使用 It is recommended 开头。修复建议只能用简短的语言描述修复建议，禁止出现任何代码给出的修复方案。
你要尽可能避免使用括号以及例如等内容。
`;

export const PROMPT_SECTION_NO_REPAIR_RULES = `
**注意**：本次报告不需要包含"修复建议"章节。
`;

// 6. 输出格式 - 双语
export const PROMPT_SECTION_OUTPUT_FORMAT_BILINGUAL = `
你的输出要中英对照，输出应该如下格式：

标题

英文标题
中文标题

英文问题描述
中文问题描述

英文修复建议
中文修复建议
`;

export const PROMPT_SECTION_OUTPUT_FORMAT_ZH = `
你的输出只需要中文，输出应该如下格式：

标题

问题描述

修复建议
`;

export const PROMPT_SECTION_OUTPUT_FORMAT_EN = `
你的输出只需要英文，输出应该如下格式：

Title

Description

Repair Suggestion
`;


// 7. 尾部指令 - 懒人模式
export const PROMPT_SECTION_INPUT_PLACEHOLDER_LAZY = `
你的输出禁止出现任何复杂的英语，要让英语初学者也能够轻松读懂。 
现在你来撰写下面这个问题的 finding:

接下来是我提供的一些描述信息和相关代码片段。 我的描述信息中可能会包含与前面描述冲突的东西，一切以我接下来描述的东西为准。
`;

// 6. 尾部指令 - 严格模式
export const PROMPT_SECTION_INPUT_PLACEHOLDER_STRICT = `
你的输出禁止出现任何复杂的英语，要让英语初学者也能够轻松读懂。 
现在你来撰写下面这个问题的 finding:

接下来是我提供的一些描述信息和相关代码片段。 如果我的描述信息缺少前面说的描写 finding 的所需内容，你应该直接返回描述提示缺少 {缺少的关键信息} ，无法完成finding信息,注意我提供的代码不能作为信息让你猜测。
`;

// Process 模板
export const PROMPT_PARTICIPANT_PROCESS = `
找出合约中各个角色（如Admin、User、以及其他特权等角色），以及该角色能操作的函数（排除查询函数、package函数）输出如下内容：
**Admin**
- Admin can xxx through the \`xxx()\` function.

**User**
- User can xxx through the \`xxx()\` function.
不要输出别的内容，函数要用反引号包括，不要参数，使用代码块、markdown格式输出：\`setGasfee()\`
不要将用户可以操作的函数写到Admin角色内
#[test]标签的函数是测试函数不要输出
`;

// 默认模板列表 (仅包含尾部指令，作为 Prompt 的一部分)
export const DEFAULT_FINDING_TEMPLATES = [
    { name: "生成 Finding 描述", content: PROMPT_SECTION_INPUT_PLACEHOLDER_STRICT },
    { name: "生成 Finding 描述-懒人模式", content: PROMPT_SECTION_INPUT_PLACEHOLDER_LAZY },
];

export const DEFAULT_PROCESS_TEMPLATES = [
    { name: "生成 Participant Process", content: PROMPT_PARTICIPANT_PROCESS },
];

// ============================================================================
// Resolution Prompt 常量
// ============================================================================

// 角色定义（所有类型共用）
export const PROMPT_RESOLUTION_ROLE = `
你是一个专业的安全审计报告 Resolution 撰写助手。
你的任务是将用户提供的信息整理为规范、地道的英文 Resolution 段落。
输出只包含 Resolution 正文，不要附加任何解释或前缀。
英文表达要简洁专业，让英文初学者也能轻松读懂。
`;

// Fixed 类型规则
export const PROMPT_RESOLUTION_FIXED = `
当前 Resolution 类型为 Fixed（客户已修复该问题）。

标准输出格式参考（根据用户提供的 hashType 字段三选一）：

情况 A - hashType 为 "commit"（有 commit hash）：
  "The team adopted our advice and fixed this issue by <改进描述>, which can be found at <commithash>."

情况 B - hashType 为 "code"（项目方以压缩包提供代码，无 git 仓库）：
  "The team adopted our advice and fixed this issue by <改进描述>. The hash of the improved code is: <codehash>."

情况 C - hashType 为 "none"（无 hash）：
  "The team adopted our advice and fixed this issue by <改进描述>."

根据用户信息中的 hashType 字段自动选择对应情况。
`;

// Ack 类型规则
export const PROMPT_RESOLUTION_ACK = `
当前 Resolution 类型为 Ack（客户承认该问题，但不打算修复）。

标准输出格式参考：
  "The team acknowledged this issue and state that "<WHY>", so no modifications will be made to the current version."

<WHY> 处使用用户提供的客户说明，保留其原意，用规范英文表达。
`;

// Partially Fixed 类型规则
export const PROMPT_RESOLUTION_PARTIALLY_FIXED = `
当前 Resolution 类型为 Partially Fixed（客户部分修复，遗留问题不再处理）。

标准输出格式参考（根据用户提供的 hashType 字段三选一）：

情况 A - hashType 为 "commit"（有 commit hash）：
  "The team adopted our advice and partially fixed this issue by <改进描述>, which can be found at <commithash>. However, <遗留问题> still exist in current code version, the team acknowledged this/these issue and state that "<WHY>", so no modifications will be made to the current version."

情况 B - hashType 为 "code"（压缩包 hash）：
  "The team adopted our advice and partially fixed this issue by <改进描述>. The hash of the improved code is: <codehash>. However, <遗留问题> still exist in current code version, the team acknowledged this/these issue and state that "<WHY>", so no modifications will be made to the current version."

情况 C - hashType 为 "none"（无 hash）：
  "The team adopted our advice and partially fixed this issue by <改进描述>. However, <遗留问题> still exist in current code version, the team acknowledged this/these issue and state that "<WHY>", so no modifications will be made to the current version."

根据用户信息中的 hashType 字段自动选择对应情况。
`;

// 通用规则（所有类型共用）
export const PROMPT_RESOLUTION_RULES = `
重要规则：
- 如果用户提供了"补充说明"字段，其内容具有最高优先级，与格式参考冲突时以补充说明为准
- 各描述字段由用户以自然语言填写，你需要整理为规范英文，保留原意进行润色，不要逐字翻译
- 如果用户提供了"原始 Finding 描述"字段，请将其作为背景上下文理解，不要直接复制到输出中
`;

// 默认模板（作为 basePrompt 用于触发，占位指令）
export const PROMPT_RESOLUTION_GENERATE = `
请根据上方用户提供的信息，输出规范的 Resolution 正文。
`;

export const DEFAULT_RESOLUTION_TEMPLATES = [
    { name: "生成 Finding Resolution", content: PROMPT_RESOLUTION_GENERATE },
];

