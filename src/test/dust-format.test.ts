import { Anthropic } from "@anthropic-ai/sdk"
import { convertToDustMessages, parseDustResponse } from "../api/transform/dust-format"
import { write } from "fs"

type ExtendedMessageParam = Anthropic.Messages.MessageParam | {
    role: "tool"
    content: string
}

describe("Dust Format Transformer", () => {
    describe("convertToDustMessages", () => {
        it("should add system prompt as first message", () => {
            const systemPrompt = "You are a helpful assistant"
            const messages: Anthropic.Messages.MessageParam[] = []

            const result = convertToDustMessages(messages, systemPrompt)

            expect(result[0].role).toBe("user")
            expect(typeof result[0].content).toBe("string")
            expect(result[0].content).toBe(systemPrompt)
        })

        it("should convert tool messages to user messages", () => {
            const systemPrompt = "You are a helpful assistant"
            const messages: ExtendedMessageParam[] = [
                { role: "tool", content: "Command executed successfully" }
            ]

            const result = convertToDustMessages(messages as Anthropic.Messages.MessageParam[], systemPrompt)

            expect(result[1].role).toBe("user")
            expect(typeof result[1].content).toBe("string")
            expect(result[1].content).toBe("Command executed successfully")
        })

        it("should handle assistant messages with tool calls", () => {
            const systemPrompt = "You are a helpful assistant"
            const messages: Anthropic.Messages.MessageParam[] = [
                {
                    role: "assistant",
                    content: [
                        { type: "text", text: "Let me check the file." },
                        {
                            type: "tool_use",
                            id: "call_1",
                            name: "read_file",
                            input: { path: "test.txt" }
                        }
                    ]
                }
            ]

            const result = convertToDustMessages(messages, systemPrompt)

            expect(result[1].role).toBe("assistant")
            expect(typeof result[1].content).toBe("string")
            const content = result[1].content as string
            expect(content).toContain("Let me check the file.")
            expect(content).toContain("<read_file>")
            expect(content).toContain("<path>test.txt</path>")
        })

        it("should preserve regular messages", () => {
            const systemPrompt = "You are a helpful assistant"
            const messages: Anthropic.Messages.MessageParam[] = [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there!" }
            ]

            const result = convertToDustMessages(messages, systemPrompt)

            expect(result[1]).toEqual(messages[0])
            expect(result[2]).toEqual(messages[1])
        })
    })

    describe("parseDustResponse", () => {
        it("should parse normal text without tool calls", () => {
            const response = "This is a normal response without tool calls."
            const result = parseDustResponse(response)

            expect(result.normalText).toBe(response.trim())
            expect(result.toolCalls).toHaveLength(0)
        })

        it("should parse response with single tool call", () => {
            const response = `Let me read the file.

<read_file>
<path>test.txt</path>
</read_file>`

            const result = parseDustResponse(response)

            expect(result.normalText).toBe("Let me read the file.")
            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0]).toEqual(expect.objectContaining({
                type: "tool_use",
                name: "read_file",
                input: { path: "test.txt" }
            }))
        })

        it("should parse response with multiple tool calls", () => {
            const response = `I'll execute these commands.

<execute_command>
<command>npm install</command>
</execute_command>

<execute_command>
<command>npm test</command>
</execute_command>`

            const result = parseDustResponse(response)

            expect(result.normalText).toBe("I'll execute these commands.")
            expect(result.toolCalls).toHaveLength(2)
            expect(result.toolCalls[0].input).toEqual({ command: "npm install" })
            expect(result.toolCalls[1].input).toEqual({ command: "npm test" })
        })

        it("should validate required tool parameters", () => {
            const response = `Testing invalid tool calls.

<read_file>
</read_file>

<execute_command>
<command>npm test</command>
</execute_command>`

            const result = parseDustResponse(response)

            expect(result.normalText).toBe("Testing invalid tool calls.")
            expect(result.toolCalls).toHaveLength(1) // Only the valid tool call
            expect(result.toolCalls[0].input).toEqual({ command: "npm test" })
        })

        it("should handle complex tool calls with multiline content", () => {
            const response = `Creating a new file.

<write_to_file>
<path>test.js</path>
<content>
function hello() {
    console.log("Hello, World!");
}
hello();
</content>
</write_to_file>`
            const result = parseDustResponse(response)

            expect(result.normalText).toBe("Creating a new file.")
            expect(result.toolCalls).toHaveLength(1)
            expect(result.toolCalls[0].input).toEqual({
                path: "test.js",
                content: 
`function hello() {
    console.log("Hello, World!");
}
hello();`
            })
        })
    })
})
