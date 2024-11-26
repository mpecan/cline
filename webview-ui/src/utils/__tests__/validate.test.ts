import { validateApiConfiguration, validateModelId } from "../validate";
import { ApiConfiguration } from "../../../../src/shared/api";

describe("validateApiConfiguration", () => {
    describe("Dust provider", () => {
        const baseConfig: Partial<ApiConfiguration> = {
            apiProvider: "dust",
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace",
            dustAvailableModels: {
                "agent-1": {
                    agentId: "agent-1",
                    modelId: "claude-3-5-sonnet-20241022",
                    maxTokens: 4096,
                    contextWindow: 200_000,
                    supportsImages: true,
                    supportsPromptCache: true,
                },
            },
        };

        it("should require API key and workspace ID", () => {
            expect(validateApiConfiguration({ apiProvider: "dust" }))
                .toBe("You must provide both an API key and Workspace ID.");

            expect(validateApiConfiguration({ 
                apiProvider: "dust",
                dustApiKey: "test-key"
            })).toBe("You must provide both an API key and Workspace ID.");

            expect(validateApiConfiguration({
                apiProvider: "dust",
                dustWorkspaceId: "test-workspace"
            })).toBe("You must provide both an API key and Workspace ID.");
        });

        it("should require models to be fetched", () => {
            expect(validateApiConfiguration({
                ...baseConfig,
                dustAvailableModels: undefined
            })).toBe("Waiting for available models...");

            expect(validateApiConfiguration({
                ...baseConfig,
                dustAvailableModels: {}
            })).toBe("Waiting for available models...");
        });

        it("should validate selected agent exists in available models", () => {
            expect(validateApiConfiguration({
                ...baseConfig,
                dustAssistantId: "non-existent-agent"
            })).toBe("The selected agent is not available. Please choose a different agent.");

            expect(validateApiConfiguration({
                ...baseConfig,
                apiModelId: "non-existent-agent"
            })).toBe("The selected agent is not available. Please choose a different agent.");
        });

        it("should pass validation with valid configuration", () => {
            expect(validateApiConfiguration({
                ...baseConfig,
                dustAssistantId: "agent-1"
            })).toBeUndefined();

            expect(validateApiConfiguration({
                ...baseConfig,
                apiModelId: "agent-1"
            })).toBeUndefined();

            // Should pass without explicitly selected agent (will use default)
            expect(validateApiConfiguration(baseConfig)).toBeUndefined();
        });
    });

    // Existing provider validation tests...
    describe("Other providers", () => {
        it("should require API provider", () => {
            expect(validateApiConfiguration({}))
                .toBe("You must select an API provider.");
        });

        it("should validate OpenAI configuration", () => {
            expect(validateApiConfiguration({
                apiProvider: "openai"
            })).toBe("You must provide an API key.");

            expect(validateApiConfiguration({
                apiProvider: "openai",
                openAiApiKey: "test-key"
            })).toBeUndefined();
        });

        // Add similar tests for other providers...
    });
});
