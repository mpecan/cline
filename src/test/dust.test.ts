import { jest } from '@jest/globals'
import { DustHandler } from '../api/providers/dust'
import { ApiHandlerOptions, dustModels } from '../shared/api'

// Mock the module
jest.mock('../api/transform/dust-format')

describe('DustHandler', () => {
    const originalFetch = global.fetch
    let mockFetch: jest.MockedFunction<typeof fetch>

    beforeEach(() => {
        mockFetch = jest.fn<typeof fetch>()
        global.fetch = mockFetch
        jest.clearAllMocks()
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

    describe('fetchAvailableModels', () => {
        const validOptions: ApiHandlerOptions = {
            dustWorkspaceId: 'test-workspace',
            dustApiKey: 'test-key'
        }

        it('should fetch and format models with agent information', async () => {
            const handler = new DustHandler(validOptions)
            const mockAgentConfig = {
                sId: 'agent-123',
                name: 'Test Agent',
                description: 'A test agent',
                instructions: 'Test instructions',
                pictureUrl: 'https://example.com/pic.jpg',
                model: {
                    modelId: 'claude-3-5-sonnet-20241022'
                }
            }

            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                agentConfigurations: [mockAgentConfig]
            })))

            const models = await handler.fetchAvailableModels()

            console.log(models)
            expect(models['agent-123']).toBeDefined()
            expect(models['agent-123']).toEqual(expect.objectContaining({
                agentId: 'agent-123',
                modelId: 'claude-3-5-sonnet-20241022',
                agentName: 'Test Agent',
                agentDescription: 'A test agent',
                agentInstructions: 'Test instructions',
                agentPictureUrl: 'https://example.com/pic.jpg',
                maxTokens: 4096,
                contextWindow: 200_000,
                supportsImages: true,
                supportsPromptCache: true
            }))
        })

        it('should handle multiple agents', async () => {
            const handler = new DustHandler(validOptions)
            const mockAgentConfigs = [
                {
                    sId: 'agent-1',
                    name: 'Agent 1',
                    model: { modelId: 'claude-3-5-sonnet-20241022' }
                },
                {
                    sId: 'agent-2',
                    name: 'Agent 2',
                    model: { modelId: 'claude-3-5-sonnet-20241022' }
                }
            ]

            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                agentConfigurations: mockAgentConfigs
            })))

            const models = await handler.fetchAvailableModels()
            
            expect(models['agent-1']).toBeDefined()
            expect(models['agent-2']).toBeDefined()
            expect(models['agent-1'].agentName).toBe('Agent 1')
            expect(models['agent-2'].agentName).toBe('Agent 2')
        })

        it('should handle unknown model IDs with default values', async () => {
            const handler = new DustHandler(validOptions)
            const mockAgentConfig = {
                sId: 'agent-123',
                name: 'Test Agent',
                model: {
                    modelId: 'unknown-model'
                }
            }

            mockFetch.mockImplementationOnce(async () => new Response(JSON.stringify({
                agentConfigurations: [mockAgentConfig]
            })))

            const models = await handler.fetchAvailableModels()

            expect(models['agent-123']).toBeDefined()
            expect(models['agent-123']).toEqual(expect.objectContaining({
                agentId: 'agent-123',
                modelId: 'unknown-model',
                agentName: 'Test Agent',
                supportsPromptCache: true,
                supportsImages: true,
                contextWindow: 200_000,
                maxTokens: 4096
            }))
        })

        it('should handle API errors', async () => {
            const handler = new DustHandler(validOptions)
            mockFetch.mockImplementationOnce(async () => new Response(null, { status: 401 }))

            await expect(handler.fetchAvailableModels()).rejects.toThrow('Failed to fetch models: 401')
        })
    })

    describe('model configuration', () => {
        it('should use default model when none specified', () => {
            const handler = new DustHandler({
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key'
            })
            const model = handler.getModel()
            expect(model.id).toBe('dust')
            expect(model.info).toBeDefined()
            expect(model.info.maxTokens).toBe(4096)
        })

        it('should use specified model when provided', () => {
            const handler = new DustHandler({
                dustWorkspaceId: 'test-workspace',
                dustApiKey: 'test-key',
                apiModelId: 'dust'
            })
            const model = handler.getModel()
            expect(model.id).toBe('dust')
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
            expect(model.id).toBe('dust')
            expect(model.info).toBeDefined()
            expect(model.info).toEqual(expect.objectContaining(dustModels['dust']))
        })
    })
})
