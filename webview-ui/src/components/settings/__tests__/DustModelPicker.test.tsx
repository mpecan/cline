import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DustModelPicker } from "../DustModelPicker";
import { mockUseExtensionState } from "../../../test-utils/setup";
import { dustDefaultModelId } from "../../../../../src/shared/api";
import { ApiConfiguration } from "../../../../../src/shared/api";

// Mock ModelInfoView
jest.mock("../ApiOptions", () => ({
    ModelInfoView: () => null,
}));

describe("DustModelPicker", () => {
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

    const mockModels = {
        "model-1": {
            maxTokens: 4096,
            contextWindow: 200_000,
            supportsImages: true,
            supportsPromptCache: true,
            inputPrice: 3.0,
            outputPrice: 15.0,
        },
        "model-2": {
            maxTokens: 8192,
            contextWindow: 200_000,
            supportsImages: true,
            supportsPromptCache: true,
            inputPrice: 15.0,
            outputPrice: 75.0,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseExtensionState.mockReturnValue(defaultState);
    });

    it("should be disabled when credentials are not provided", () => {
        render(<DustModelPicker />);
        const input = screen.getByRole("textbox");
        expect(input).toBeDisabled();
    });

    it("should be enabled when credentials are provided", () => {
        mockUseExtensionState.mockReturnValue({
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
                dustAvailableModels: mockModels,
            },
        });

        render(<DustModelPicker />);
        const input = screen.getByRole("textbox");
        expect(input).toBeEnabled();
    });

    it("should show available models in dropdown", async () => {
        // Set up state with valid credentials and models
        const initialState = {
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
                dustAvailableModels: mockModels,
                dustAssistantId: "",
            },
        };
        mockUseExtensionState.mockReturnValue(initialState);

        render(<DustModelPicker />);

        // Focus input to show dropdown
        const input = screen.getByRole("textbox");
        fireEvent.focus(input);

        // Wait for dropdown list to be visible
        await waitFor(() => {
            expect(screen.getByTestId("dropdown-list")).toBeInTheDocument();
        });

        // Wait for items to be rendered
        await waitFor(() => {
            expect(screen.getAllByTestId("dropdown-item")).toHaveLength(2);
        });

        const items = screen.getAllByTestId("dropdown-item");
        expect(items[0]).toHaveTextContent("model-1");
        expect(items[1]).toHaveTextContent("model-2");
    });

    it("should filter models based on search term", async () => {
        // Set up state with valid credentials and models
        const initialState = {
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
                dustAvailableModels: mockModels,
                dustAssistantId: "",
            },
        };
        mockUseExtensionState.mockReturnValue(initialState);

        render(<DustModelPicker />);

        // Focus input and type search term
        const input = screen.getByRole("textbox");
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "model-1" } });

        // Wait for filtered items
        await waitFor(() => {
            expect(screen.getAllByTestId("dropdown-item")).toHaveLength(1);
        });

        const items = screen.getAllByTestId("dropdown-item");
        expect(items[0]).toHaveTextContent("model-1");
        expect(screen.queryByText("model-2")).not.toBeInTheDocument();
    });

    it("should reset to default model when credentials are removed", () => {
        mockUseExtensionState.mockReturnValue({
            ...defaultState,
            apiConfiguration: {
                ...defaultApiConfig,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
                dustAvailableModels: mockModels,
                dustAssistantId: "model-1",
            },
        });

        const { rerender } = render(<DustModelPicker />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("model-1");

        // Update state to simulate credentials being removed
        mockUseExtensionState.mockReturnValue(defaultState);
        rerender(<DustModelPicker />);

        expect(input).toHaveValue(dustDefaultModelId);
    });
});
