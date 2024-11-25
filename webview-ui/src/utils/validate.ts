import { ApiConfiguration, ModelInfo, openRouterDefaultModelId } from "../../../src/shared/api";

export const validateApiConfiguration = (config: Partial<ApiConfiguration>): string | undefined => {
    if (!config.apiProvider) {
        return "You must select an API provider.";
    }

    switch (config.apiProvider) {
        case "dust":
            if (!config.dustApiKey || !config.dustWorkspaceId) {
                return "You must provide both an API key and Workspace ID.";
            }
            break;
        case "openai":
            if (!config.openAiApiKey) {
                return "You must provide an API key.";
            }
            break;
        case "anthropic":
            if (!config.apiKey) {
                return "You must provide an API key.";
            }
            break;
        case "gemini":
            if (!config.geminiApiKey) {
                return "You must provide an API key.";
            }
            break;
        case "bedrock":
            if (!config.awsAccessKey || !config.awsSecretKey) {
                return "You must provide both an access key and secret key.";
            }
            break;
        case "vertex":
            if (!config.vertexProjectId) {
                return "You must provide a project ID.";
            }
            break;
        case "ollama":
            if (!config.ollamaBaseUrl) {
                return "You must provide a host URL.";
            }
            break;
        case "lmstudio":
            if (!config.lmStudioBaseUrl) {
                return "You must provide a host URL.";
            }
            break;
        case "openrouter":
            if (!config.openRouterApiKey) {
                return "You must provide an API key.";
            }
            break;
    }

    return undefined;
};

export function validateModelId(
	apiConfiguration?: ApiConfiguration,
	openRouterModels?: Record<string, ModelInfo>,
): string | undefined {
	if (apiConfiguration) {
		switch (apiConfiguration.apiProvider) {
			case "openrouter":
				const modelId = apiConfiguration.openRouterModelId || openRouterDefaultModelId // in case the user hasn't changed the model id, it will be undefined by default
				if (!modelId) {
					return "You must provide a model ID."
				}
				if (openRouterModels && !Object.keys(openRouterModels).includes(modelId)) {
					// even if the model list endpoint failed, extensionstatecontext will always have the default model info
					return "The model ID you provided is not available. Please choose a different model."
				}
				break
		}
	}
	return undefined
}
