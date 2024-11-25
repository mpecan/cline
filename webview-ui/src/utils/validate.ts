import { ApiConfiguration } from "../../../src/shared/api";

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
