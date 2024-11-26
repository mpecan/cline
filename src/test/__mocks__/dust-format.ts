import { Anthropic } from "@anthropic-ai/sdk"
import { parseDustResponse as originalParseDustResponse } from "../../api/transform/dust-format"

type ConvertToDustMessagesType = (messages: Anthropic.Messages.MessageParam[], systemPrompt: string) => Anthropic.Messages.MessageParam[]

export const convertToDustMessages = jest.fn<Anthropic.Messages.MessageParam[], [Anthropic.Messages.MessageParam[], string]>(
    (messages, systemPrompt) => [
        { role: 'user' as const, content: systemPrompt },
        ...messages
    ]
)

export const parseDustResponse = originalParseDustResponse
