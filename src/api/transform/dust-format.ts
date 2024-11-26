import { Anthropic } from "@anthropic-ai/sdk"
import { dustSystemPrompt } from "./dust-system-prompt"

type MessageWithRole = {
    role: string
    content: string | Anthropic.ContentBlock[] | null
}

export function convertToDustMessages(
    messages: Anthropic.Messages.MessageParam[],
    systemPrompt: string
): Anthropic.Messages.MessageParam[] {
    // Create a new array with the system prompt as the first message
    const messagesWithSystemPrompt = [
        {
            role: "user",
            content: dustSystemPrompt(systemPrompt),
        } as Anthropic.Messages.MessageParam,
        ...messages
    ]

    // Convert tool messages to user messages and handle tool calls
    return messagesWithSystemPrompt.reduce((acc, message) => {
        const msg = message as MessageWithRole

        if (msg.role === "assistant" && Array.isArray(msg.content)) {
            // Handle assistant messages with tool calls
            const textContent = msg.content
                .filter(content => content.type === "text")
                .map(content => (content as { text: string }).text)
                .join("\n")

            const toolCalls = msg.content
                .filter(content => content.type === "tool_use")
                .map(content => {
                    const toolUse = content as Anthropic.ToolUseBlock
                    if (typeof toolUse.input === "object" && toolUse.input !== null) {
                        return formatToolCall(toolUse.name, toolUse.input as Record<string, string>)
                    }
                    return ""
                })
                .filter(call => call !== "")
                .join("\n")

            acc.push({
                role: "assistant",
                content: `${textContent}\n\n${toolCalls}`.trim(),
            })
        } else if (msg.role === "tool" && typeof msg.content === "string") {
            // Convert tool response to user message
            acc.push({
                role: "user",
                content: msg.content,
            })
        } else {
            // Keep other messages as they are
            acc.push(message)
        }
        return acc
    }, [] as Anthropic.Messages.MessageParam[])
}

function formatToolCall(toolName: string, input: Record<string, string>): string {
    const params = Object.entries(input)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join("\n")

    return `<${toolName}>\n${params}\n</${toolName}>`
}

export function parseDustResponse(response: string): { normalText: string; toolCalls: Anthropic.ToolUseBlock[] } {
    const toolNames = [
        "execute_command",
        "list_files",
        "list_code_definition_names",
        "search_files",
        "read_file",
        "write_to_file",
        "ask_followup_question",
        "attempt_completion",
    ]

    // Create a regex pattern to match any tool call opening tag
    const toolCallPattern = new RegExp(`<(${toolNames.join("|")})>`, "i")
    const match = response.match(toolCallPattern)

    if (!match) {
        // No tool calls found
        return { normalText: response.trim(), toolCalls: [] }
    }

    const toolCallStart = match.index!
    const normalText = response.slice(0, toolCallStart).trim()
    const toolCallsText = response.slice(toolCallStart)

    const toolCalls = parseToolCalls(toolCallsText)

    return { normalText, toolCalls }
}

function parseToolCalls(toolCallsText: string): Anthropic.ToolUseBlock[] {
    const toolCalls: Anthropic.ToolUseBlock[] = []
    const toolPattern = /<(\w+)>([\s\S]*?)<\/\1>/g
    let match

    while ((match = toolPattern.exec(toolCallsText)) !== null) {
        const [fullMatch, toolName, content] = match
        const input = parseToolInput(content)

        if (validateToolInput(toolName, input)) {
            toolCalls.push({
                type: "tool_use",
                id: `call_${toolCalls.length}_${Date.now()}`,
                name: toolName,
                input
            })
        }
    }

    return toolCalls
}

function parseToolInput(content: string): Record<string, string> {
    const input: Record<string, string> = {}
    const paramPattern = /<(\w+)>([\s\S]*?)<\/\1>/g
    let match

    while ((match = paramPattern.exec(content)) !== null) {
        const [, paramName, paramValue] = match
        input[paramName] = paramValue.trim()
    }

    return input
}

function validateToolInput(toolName: string, input: Record<string, string>): boolean {
    switch (toolName) {
        case "execute_command":
            return "command" in input
        case "read_file":
        case "list_code_definition_names":
        case "list_files":
            return "path" in input
        case "search_files":
            return "path" in input && "regex" in input
        case "write_to_file":
            return "path" in input && "content" in input
        case "ask_followup_question":
            return "question" in input
        case "attempt_completion":
            return "result" in input
        default:
            return false
    }
}
