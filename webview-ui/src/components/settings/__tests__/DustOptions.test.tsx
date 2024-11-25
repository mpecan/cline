import { render, screen, fireEvent } from "@testing-library/react";
import { DustOptions } from "../DustOptions";
import { mockUseExtensionState } from "../../../test-utils/setup";
import { DustHandler } from "../../../../../src/api/providers/dust";
import { ApiConfiguration } from "../../../../../src/shared/api";

// Mock DustHandler
jest.mock("../../../../../src/api/providers/dust", () => ({
    DustHandler: jest.fn().mockImplementation(() => ({
        fetchAvailableModels: jest.fn().mockResolvedValue({
            "model-1": {
                maxTokens: 4096,
                contextWindow: 200_000,
                supportsImages: true,
                supportsPromptCache: true,
            },
            "model-2": {
                maxTokens: 8192,
                contextWindow: 200_000,
                supportsImages: true,
                supportsPromptCache: true,
            },
        }),
    })),
}));

// Mock ModelInfoView
jest.mock("../ApiOptions", () => ({
    ModelInfoView: () => null,
}));

// Mock DustModelPicker
jest.mock("../DustModelPicker", () => ({
    DustModelPicker: () => null,
}));

describe("DustOptions", () => {
    const mockSetApiConfiguration = jest.fn();
    const defaultApiConfig: Required<Pick<ApiConfiguration, 'dustApiKey' | 'dustWorkspaceId' | 'dustAvailableModels' | 'dustAssistantId'>> = {
        dustApiKey: "",
        dustWorkspaceId: "",
        dustAvailableModels: {},
        dustAssistantId: "",
    };

    const defaultState = {
        didHydrateState: true,
        showWelcome: false,
        theme: {},
        openRouterModels: {},
        filePaths: [],
        version: "1.0.0",
        clineMessages: [],
        taskHistory: [],
        shouldShowAnnouncement: false,
        apiConfiguration: defaultApiConfig,
        setApiConfiguration: mockSetApiConfiguration,
        setCustomInstructions: jest.fn(),
        setAlwaysAllowReadOnly: jest.fn(),
        setShowAnnouncement: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseExtensionState.mockReturnValue(defaultState);
    });

    it("should fetch models when credentials are provided", async () => {
        mockUseExtensionState.mockReturnValue({
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
            },
        });

        render(<DustOptions />);

        expect(await screen.findByText(/Loading available models/)).toBeInTheDocument();
        expect(DustHandler).toHaveBeenCalledWith({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace",
            dustBaseUrl: undefined,
        });
    });

    it("should show error message when model fetch fails", async () => {
        mockUseExtensionState.mockReturnValue({
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
            },
        });

        // Mock fetch failure
        (DustHandler as jest.Mock).mockImplementationOnce(() => ({
            fetchAvailableModels: jest.fn().mockRejectedValue(new Error("API Error")),
        }));

        render(<DustOptions />);

        expect(await screen.findByText(/Failed to fetch available models/)).toBeInTheDocument();
    });

    it("should update base URL when custom URL is enabled", async () => {
        render(<DustOptions />);

        const checkbox = screen.getByRole("checkbox", { name: "Use custom base URL" });
        fireEvent.click(checkbox);

        const urlInput = screen.getByPlaceholderText("Default: https://dust.tt");
        fireEvent.change(urlInput, { target: { value: "https://custom.dust.tt" } });

        expect(mockSetApiConfiguration).toHaveBeenCalledWith(expect.objectContaining({
            ...defaultApiConfig,
            dustBaseUrl: "https://custom.dust.tt",
        }));
    });

    it("should clear base URL when custom URL is disabled", () => {
        const initialConfig = {
            ...defaultApiConfig,
            dustBaseUrl: "https://custom.dust.tt",
        };
        mockUseExtensionState.mockReturnValue({
            ...defaultState,
            apiConfiguration: initialConfig,
        });

        render(<DustOptions />);

        const checkbox = screen.getByRole("checkbox", { name: "Use custom base URL" });
        fireEvent.click(checkbox);

        expect(screen.queryByPlaceholderText("Default: https://dust.tt")).not.toBeInTheDocument();
        expect(mockSetApiConfiguration).toHaveBeenCalledWith(expect.objectContaining({
            ...defaultApiConfig,
            dustBaseUrl: "",
        }));
    });
});
