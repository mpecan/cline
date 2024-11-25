import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandlerOptions, ModelInfo, dustModels, dustDefaultModelId, DustModelId } from "../../shared/api"
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

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
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
						configurationId: this.options.apiModelId || dustDefaultModelId
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
							configurationId: this.options.apiModelId || dustDefaultModelId
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

	getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.apiModelId || dustDefaultModelId
		return {
			id: modelId,
			info: dustModels[modelId as DustModelId] || dustModels[dustDefaultModelId],
		}
	}
}
