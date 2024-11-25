import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DustOptions } from "../DustOptions";
import { ExtensionStateContextProvider, useExtensionState } from "../../../context/ExtensionStateContext";
import { vscode } from "../../../utils/vscode";

// Mock vscode API
jest.mock("../../../utils/vscode", () => ({
    vscode: {
        postMessage: jest.fn(),
    },
}));

// Mock the context hook
jest.mock("../../../context/ExtensionStateContext", () => ({
    ...jest.requireActual("../../../context/ExtensionStateContext"),
    useExtensionState: jest.fn(),
}));

const mockUseExtensionState = useExtensionState as jest.Mock;
const mockPostMessage = vscode.postMessage as jest.Mock;

describe("DustOptions", () => {
    const initialState = {
        apiConfiguration: {
            dustApiKey: "",
            dustWorkspaceId: "",
            dustBaseUrl: "",
            dustAvailableModels: {},
        },
        setApiConfiguration: jest.fn(),
        version: "",
        clineMessages: [],
        taskHistory: [],
        shouldShowAnnouncement: false,
        didHydrateState: true,
        showWelcome: false,
        theme: {},
        openRouterModels: {},
        filePaths: [],
        setCustomInstructions: jest.fn(),
        setAlwaysAllowReadOnly: jest.fn(),
        setShowAnnouncement: jest.fn(),
    };

    beforeEach(() => {
        mockPostMessage.mockClear();
        mockUseExtensionState.mockReturnValue(initialState);
    });

    it("renders initial state correctly", () => {
        render(<DustOptions />);

        expect(screen.getByText("Dust API Key")).toBeInTheDocument();
        expect(screen.getByText("Dust Workspace ID")).toBeInTheDocument();
        expect(screen.getByText("Use custom base URL")).toBeInTheDocument();
    });

    it("shows loading state when fetching models", async () => {
        mockUseExtensionState.mockReturnValue({
            ...initialState,
            apiConfiguration: {
                ...initialState.apiConfiguration,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
                dustAvailableModels: null, // Set to null to trigger loading state
            },
        });

        render(<DustOptions />);
        
        // Wait for loading text to appear
        const loadingText = await screen.findByText("Loading available models...");
        expect(loadingText).toBeInTheDocument();
    });

    it("handles model fetch error", async () => {
        mockUseExtensionState.mockReturnValue({
            ...initialState,
            apiConfiguration: {
                ...initialState.apiConfiguration,
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace",
            },
        });

        render(<DustOptions />);

        // Simulate error response using MessageEvent
        act(() => {
            const messageEvent = new MessageEvent('message', {
                data: { type: "dustModels", dustModels: {} }
            });
            window.dispatchEvent(messageEvent);
        });

        // Wait for error message to appear
        const errorText = await screen.findByText("No models found. Please check your credentials.");
        expect(errorText).toBeInTheDocument();
    });

    it("requests models when credentials change", () => {
        const { rerender } = render(<DustOptions />);

        mockUseExtensionState.mockReturnValue({
            ...initialState,
            apiConfiguration: {
                ...initialState.apiConfiguration,
                dustApiKey: "new-key",
                dustWorkspaceId: "new-workspace",
            },
        });

        rerender(<DustOptions />);

        expect(mockPostMessage).toHaveBeenCalledWith({
            type: "requestDustModels",
            text: JSON.stringify({
                apiKey: "new-key",
                workspaceId: "new-workspace",
                baseUrl: "",
            }),
        });
    });

    it("toggles custom base URL input", () => {
        render(<DustOptions />);

        const checkbox = screen.getByLabelText("Use custom base URL");
        
        // Initially, base URL input should not be visible
        expect(screen.queryByPlaceholderText("Default: https://dust.tt")).not.toBeInTheDocument();

        // Show base URL input
        fireEvent.click(checkbox);
        expect(screen.getByPlaceholderText("Default: https://dust.tt")).toBeInTheDocument();

        // Hide base URL input
        fireEvent.click(checkbox);
        expect(screen.queryByPlaceholderText("Default: https://dust.tt")).not.toBeInTheDocument();
    });

    it("updates configuration when inputs change", () => {
        const setApiConfiguration = jest.fn();
        mockUseExtensionState.mockReturnValue({
            ...initialState,
            setApiConfiguration,
        });

        render(<DustOptions />);

        // Test API Key input
        const apiKeyInput = screen.getByPlaceholderText("Enter API Key...");
        fireEvent.change(apiKeyInput, { target: { value: "new-api-key" } });
        expect(setApiConfiguration).toHaveBeenCalledWith({
            ...initialState.apiConfiguration,
            dustApiKey: "new-api-key",
        });

        // Test Workspace ID input
        const workspaceIdInput = screen.getByPlaceholderText("Enter Workspace ID...");
        fireEvent.change(workspaceIdInput, { target: { value: "new-workspace-id" } });
        expect(setApiConfiguration).toHaveBeenCalledWith({
            ...initialState.apiConfiguration,
            dustWorkspaceId: "new-workspace-id",
        });
    });
});
