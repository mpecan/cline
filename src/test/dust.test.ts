import { jest } from '@jest/globals'
import { DustHandler } from '../api/providers/dust'
import { ApiHandlerOptions, dustModels } from '../shared/api'
import { ApiStream } from '../api/transform/stream'
import { Anthropic } from "@anthropic-ai/sdk"

describe('DustHandler', () => {
    const originalFetch = global.fetch
    let mockFetch: jest.MockedFunction<typeof fetch>

    beforeEach(() => {
        mockFetch = jest.fn<typeof fetch>()
        global.fetch = mockFetch
    })

    afterEach(() => {
        global.fetch = originalFetch
        jest.clearAllMocks()
    })

    describe('constructor validation', () => {
        it('should throw error if workspace ID is missing', () => {
            const options: ApiHandlerOptions = {
                dustApiKey: 'test-key'
            }
            expect(() => new DustHandler(options)).toThrow('Dust workspace ID is required')
        })

        it('should throw error if API key is missing', () => {
            const options: ApiHandlerOptions = {
                dustWorkspaceId: 'test-workspace'
            }
            expect(() => new DustHandler(options)).toThrow('Dust API key is required')
        })

        it('should create instance with valid options', () => {
            const options: ApiHandlerOptions = {
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key'
            }
            expect(() => new DustHandler(options)).not.toThrow()
        })
    })

    describe('API request format', () => {
        const validOptions: ApiHandlerOptions = {
            dustWorkspaceId: 'test-workspace',
            dustApiKey: 'test-key',
            apiModelId: 'claude-3-sonnet',
            dustBaseUrl: 'https://dust.tt'
        }

        it('should use dustAssistantId when provided', async () => {
            const optionsWithAssistant = {
                ...validOptions,
                dustAssistantId: 'assistant-123'
            }
            const handler = new DustHandler(optionsWithAssistant)
            const systemPrompt = 'You are a helpful assistant'
            const messages: Anthropic.Messages.MessageParam[] = [
                { role: 'user', content: 'Hello' }
            ]

            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                message: { sId: 'msg-123' }
            })))

            mockFetch.mockImplementationOnce(async () => new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"type":"message","data":{"content":"Response"}}\n'))
                        controller.close()
                    }
                })
            ))

            const stream = handler.createMessage(systemPrompt, messages)
            await stream.next()

            // Verify conversation creation uses assistant ID
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                'https://dust.tt/api/v1/w/test-workspace/assistant/conversations',
                expect.objectContaining({
                    body: JSON.stringify({
                        message: {
                            content: systemPrompt,
                            mentions: [{
                                configurationId: 'assistant-123'
                            }]
                        },
                        visibility: 'unlisted',
                        blocking: true
                    })
                })
            )
        })

        it('should format API requests correctly for conversation flow', async () => {
            const handler = new DustHandler(validOptions)
            const systemPrompt = 'You are a helpful assistant'
            const messages: Anthropic.Messages.MessageParam[] = [
                { role: 'user', content: 'Hello' }
            ]

            // Mock conversation creation response
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            // Mock message creation response
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                message: { sId: 'msg-123' }
            })))

            // Mock events stream response
            mockFetch.mockImplementationOnce(async () => new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"type":"message","data":{"content":"Response"}}\n'))
                        controller.close()
                    }
                })
            ))

            const stream = handler.createMessage(systemPrompt, messages)
            await stream.next() // Trigger the API calls

            // Verify conversation creation request
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                'https://dust.tt/api/v1/w/test-workspace/assistant/conversations',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-key'
                    },
                    body: JSON.stringify({
                        message: {
                            content: systemPrompt,
                            mentions: [{
                                configurationId: 'claude-3-sonnet'
                            }]
                        },
                        visibility: 'unlisted',
                        blocking: true
                    })
                }
            )

            // Verify message creation request
            expect(mockFetch).toHaveBeenNthCalledWith(2,
                'https://dust.tt/api/v1/w/test-workspace/assistant/conversations/conv-123/messages',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-key'
                    },
                    body: JSON.stringify({
                        content: messages[0].content,
                        mentions: [{
                            configurationId: 'claude-3-sonnet'
                        }]
                    })
                }
            )

            // Verify events stream request
            expect(mockFetch).toHaveBeenNthCalledWith(3,
                'https://dust.tt/api/v1/w/test-workspace/assistant/conversations/conv-123/messages/msg-123/events',
                {
                    headers: {
                        'Authorization': 'Bearer test-key'
                    }
                }
            )
        })

        it('should handle complex message content with images', async () => {
            const handler = new DustHandler(validOptions)
            const systemPrompt = 'You are a helpful assistant'
            const messages: Anthropic.Messages.MessageParam[] = [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Look at this image:' },
                        {
                            type: 'image', source: {
                                data: '/9j/4AAQSkZJRg==',
                                type: "base64",
                                media_type: 'image/jpeg'
                            }
                        }
                    ]
                }
            ]

            // Mock conversation creation response
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            // Mock message creation response
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                message: { sId: 'msg-123' }
            })))

            // Mock events stream response
            mockFetch.mockImplementationOnce(async () => new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"type":"message","data":{"content":"I see the image"}}\n'))
                        controller.close()
                    }
                })
            ))

            const stream = handler.createMessage(systemPrompt, messages)
            await stream.next()

            const messageCall = mockFetch.mock.calls[1]
            const requestBody = JSON.parse(messageCall[1]?.body as string)

            expect(requestBody.content).toEqual(messages[0].content)
        })
    })

    describe('response handling', () => {
        const validOptions: ApiHandlerOptions = {
            dustWorkspaceId: 'test-workspace',
            dustApiKey: 'test-key',
            apiModelId: 'claude-3-sonnet'
        }

        it('should handle streaming response correctly', async () => {
            const handler = new DustHandler(validOptions)

            // Mock conversation creation
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            // Mock message creation
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                message: { sId: 'msg-123' }
            })))

            // Mock events stream
            mockFetch.mockImplementationOnce(async () => new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"type":"message","data":{"content":"Hello"}}\n'))
                        controller.enqueue(new TextEncoder().encode('data: {"type":"message","data":{"content":" World"}}\n'))
                        controller.enqueue(new TextEncoder().encode('data: {"type":"usage","data":{"prompt_tokens":10,"completion_tokens":5}}\n'))
                        controller.close()
                    }
                })
            ))

            const stream = handler.createMessage('system', [{ role: 'user', content: 'Hi' }])
            const chunks = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }

            expect(chunks).toEqual([
                { type: 'text', text: 'Hello' },
                { type: 'text', text: ' World' },
                { type: 'usage', inputTokens: 10, outputTokens: 5 }
            ])
        })

        it('should handle conversation creation error', async () => {
            const handler = new DustHandler(validOptions)
            mockFetch.mockImplementation(async () => new Response(null, { status: 401 }))

            const stream = handler.createMessage('system', [])
            await expect(stream.next()).rejects.toThrow('Failed to create conversation: 401')
        })

        it('should handle message creation error', async () => {
            const handler = new DustHandler(validOptions)

            // Mock successful conversation creation
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            // Mock failed message creation
            mockFetch.mockImplementationOnce(async () => new Response(null, { status: 400 }))

            const stream = handler.createMessage('system', [{ role: 'user', content: 'Hi' }])
            await expect(stream.next()).rejects.toThrow('Failed to send message: 400')
        })

        it('should handle malformed event data', async () => {
            const handler = new DustHandler(validOptions)

            // Mock successful conversation creation
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                conversation: { sId: 'conv-123' }
            })))

            // Mock successful message creation
            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                message: { sId: 'msg-123' }
            })))

            // Mock malformed events stream
            mockFetch.mockImplementationOnce(async () => new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('data: {"malformed":true}\n'))
                        controller.close()
                    }
                })
            ))

            const stream = handler.createMessage('system', [{ role: 'user', content: 'Hi' }])
            const chunks = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }

            expect(chunks).toHaveLength(0)
        })
    })

    describe('model configuration', () => {
        it('should use default model when none specified', () => {
            const handler = new DustHandler({
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key'
            })
            const model = handler.getModel()
            expect(model.id).toBe('claude-3-sonnet')
            expect(model.info).toBeDefined()
            expect(model.info.maxTokens).toBe(4096)
        })

        it('should use specified model when provided', () => {
            const handler = new DustHandler({
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key',
                apiModelId: 'claude-3-opus'
            })
            const model = handler.getModel()
            expect(model.id).toBe('claude-3-opus')
            expect(model.info).toBeDefined()
            expect(model.info.maxTokens).toBe(4096)
            expect(model.info.contextWindow).toBe(200_000)
        })

        it('should fallback to default model for unknown model ID', () => {
            const handler = new DustHandler({
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key',
                apiModelId: 'unknown-model'
            })
            const model = handler.getModel()
            expect(model.id).toBe('unknown-model')
            expect(model.info).toBeDefined()
            expect(model.info).toEqual(expect.objectContaining(dustModels['claude-3-sonnet']))
        })
    })
})
