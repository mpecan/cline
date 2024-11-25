import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandlerOptions, ModelInfo, DustModelInfo, dustModels, dustDefaultModelId } from "../../shared/api"
import { ApiHandler, Message } from "../index"
import { ApiStream } from "../transform/stream"

// Dust API implementation based on the OpenAPI spec from dust-tt-openapi-definition.json
export class DustHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private baseUrl: string
	private apiKey: string
	private workspaceId: string

	constructor(options: ApiHandlerOptions) {
		this.options = options
		this.baseUrl = options.dustBaseUrl || "https://dust.tt"
		this.apiKey = options.dustApiKey || ""
		this.workspaceId = options.dustWorkspaceId || ""

		if (!this.workspaceId) {
			throw new Error("Dust workspace ID is required")
		}

		if (!this.apiKey) {
			throw new Error("Dust API key is required")
		}
	}

	async fetchAvailableModels(): Promise<Record<string, DustModelInfo>> {
		// Fetch agent configurations which contain model information
		const response = await fetch(`${this.baseUrl}/api/v1/w/${this.workspaceId}/assistant/agent_configurations`, {
			headers: {
				"Authorization": `Bearer ${this.apiKey}`,
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch models: ${response.status}`)
		}

		const data = await response.json()
		const models: Record<string, DustModelInfo> = {}

		// Extract models and agent information from configurations
		data.forEach((config: any) => {
			if (config.model?.modelId) {
				const modelId = config.model.modelId
				const agentId = config.sId

				// Use agentId as the key
				models[agentId] = {
					agentId,
					modelId,
					maxTokens: 4096,
					contextWindow: 200_000,
					supportsImages: true,
					supportsPromptCache: true,
					agentName: config.name,
					agentDescription: config.description,
					agentInstructions: config.instructions,
					agentPictureUrl: config.pictureUrl,
				}
			}
		})

		return models
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		// Use dustAssistantId if provided, otherwise use apiModelId (which should be an agentId), or fall back to default
		const configurationId = this.options.dustAssistantId || this.options.apiModelId || dustDefaultModelId

		// First create a conversation
		const conversationResponse = await fetch(`${this.baseUrl}/api/v1/w/${this.workspaceId}/assistant/conversations`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				message: {
					content: systemPrompt,
					mentions: [{
						configurationId
					}]
				},
				visibility: "unlisted",
				blocking: true
			}),
		})

		if (!conversationResponse.ok) {
			throw new Error(`Failed to create conversation: ${conversationResponse.status}`)
		}

		const conversation = await conversationResponse.json()
		const conversationId = conversation.conversation.sId

		// Then send each message in the conversation
		for (const msg of messages) {
			const messageResponse = await fetch(
				`${this.baseUrl}/api/v1/w/${this.workspaceId}/assistant/conversations/${conversationId}/messages`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify({
						content: msg.content,
						mentions: [{
							configurationId
						}]
					}),
				}
			)

			if (!messageResponse.ok) {
				throw new Error(`Failed to send message: ${messageResponse.status}`)
			}

			// Get message events to stream the response
			const messageId = (await messageResponse.json()).message.sId
			const eventsResponse = await fetch(
				`${this.baseUrl}/api/v1/w/${this.workspaceId}/assistant/conversations/${conversationId}/messages/${messageId}/events`,
				{
					headers: {
						"Authorization": `Bearer ${this.apiKey}`,
					},
				}
			)

			if (!eventsResponse.ok || !eventsResponse.body) {
				throw new Error(`Failed to get message events: ${eventsResponse.status}`)
			}

			const reader = eventsResponse.body.getReader()
			const decoder = new TextDecoder()

			while (true) {
				const { value, done } = await reader.read()
				if (done) {
					break
				}

				const chunk = decoder.decode(value)
				const lines = chunk.split("\n").filter(line => line.trim())

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6))
							// Handle message events
							if (data.type === "message" && data.data?.content) {
								yield {
									type: "text",
									text: data.data.content,
								}
							}
							// Handle usage events if available
							if (data.type === "usage") {
								yield {
									type: "usage",
									inputTokens: data.data?.prompt_tokens || 0,
									outputTokens: data.data?.completion_tokens || 0,
								}
							}
						} catch (e) {
							console.error("Failed to parse SSE data:", e)
						}
					}
				}
			}
		}
	}

	getModel(): { id: string; info: DustModelInfo } {
		const agentId = this.options.apiModelId || dustDefaultModelId
		const availableModels = this.options.dustAvailableModels as Record<string, DustModelInfo> | undefined
		const defaultModel = dustModels[dustDefaultModelId] as DustModelInfo

		// If we have available models and the requested agent exists, use it
		if (availableModels && agentId in availableModels) {
			return {
				id: agentId,
				info: availableModels[agentId],
			}
		}

		// Otherwise fall back to the default model
		return {
			id: dustDefaultModelId,
			info: defaultModel,
		}
	}
}
