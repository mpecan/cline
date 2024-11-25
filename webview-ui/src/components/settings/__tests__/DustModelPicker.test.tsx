import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DustModelPicker } from "../DustModelPicker";
import { ExtensionStateContextProvider } from "../../../context/ExtensionStateContext";
import React from "react";
import { dustDefaultModelId, dustModels } from "../../../../../src/shared/api";

const mockSetApiConfiguration = jest.fn();

// Mock scrollIntoView since it's not supported in jsdom
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const renderWithConfig = (config = {}) => {
    jest.spyOn(require("../../../context/ExtensionStateContext"), "useExtensionState").mockImplementation(() => ({
        apiConfiguration: {
            dustAssistantId: dustDefaultModelId,
            ...config
        },
        setApiConfiguration: mockSetApiConfiguration,
    }));

    return render(
        <ExtensionStateContextProvider>
            <DustModelPicker />
        </ExtensionStateContextProvider>
    );
};

// Mock ModelInfoView component since it's imported from ApiOptions
jest.mock("../ApiOptions", () => ({
    ModelInfoView: ({ selectedModelId, modelInfo }: any) => (
        <div data-testid="model-info">
            Model: {selectedModelId}
            <div>Max Tokens: {modelInfo.maxTokens}</div>
        </div>
    ),
    normalizeApiConfiguration: jest.fn(),
}));

describe("DustModelPicker", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders with default model selected but disabled when credentials are missing", () => {
        renderWithConfig();
        
        const input = screen.getByTestId("vscode-text-field");
        expect(input).toBeDisabled();
        expect(input).toHaveAttribute("placeholder", "Enter API Key and Workspace ID first");
        expect(screen.queryByTestId("model-info")).not.toBeInTheDocument();
    });

    it("enables model selection when valid credentials are present", () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });
        
        const input = screen.getByTestId("vscode-text-field");
        expect(input).not.toBeDisabled();
        expect(input).toHaveAttribute("placeholder", "Search and select a model...");
        expect(screen.getByTestId("model-info")).toBeInTheDocument();
    });

    it("resets to default model when credentials become invalid", () => {
        const { rerender } = render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        // Initially with valid credentials and custom model
        jest.spyOn(require("../../../context/ExtensionStateContext"), "useExtensionState").mockImplementation(() => ({
            apiConfiguration: {
                dustAssistantId: "claude-3-opus",
                dustApiKey: "test-key",
                dustWorkspaceId: "test-workspace"
            },
            setApiConfiguration: mockSetApiConfiguration,
        }));

        rerender(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        // Then remove credentials
        jest.spyOn(require("../../../context/ExtensionStateContext"), "useExtensionState").mockImplementation(() => ({
            apiConfiguration: {
                dustAssistantId: "claude-3-opus"
            },
            setApiConfiguration: mockSetApiConfiguration,
        }));

        rerender(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustAssistantId: dustDefaultModelId
        });
    });

    it("shows dropdown when input is focused with valid credentials", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        // Wait for dropdown to appear
        const dropdownList = await screen.findByTestId("dropdown-list");
        expect(dropdownList).toBeInTheDocument();

        // Check if models are displayed
        Object.keys(dustModels).forEach(modelId => {
            expect(dropdownList).toHaveTextContent(modelId);
        });
    });

    it("does not show dropdown when input is focused without valid credentials", () => {
        renderWithConfig();

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        expect(screen.queryByTestId("dropdown-list")).not.toBeInTheDocument();
    });

    it("filters models based on search term with valid credentials", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);
        fireEvent.input(input, { target: { value: "opus" } });

        // Wait for dropdown to appear
        const dropdownList = await screen.findByTestId("dropdown-list");
        expect(dropdownList).toHaveTextContent("claude-3-opus");
        expect(dropdownList).not.toHaveTextContent("claude-3-sonnet");
    });

    it("updates model selection when clicking on a model with valid credentials", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        // Wait for dropdown to appear
        await screen.findByTestId("dropdown-list");

        const modelOptions = screen.getAllByTestId("dropdown-item");
        const opusOption = modelOptions.find(option => option.textContent?.includes("claude-3-opus"));
        expect(opusOption).toBeTruthy();

        fireEvent.click(opusOption!);

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace",
            dustAssistantId: "claude-3-opus",
        });
    });

    it("supports keyboard navigation with valid credentials", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        // Wait for dropdown to appear
        await screen.findByTestId("dropdown-list");

        // Press arrow down to select first item
        fireEvent.keyDown(input, { key: "ArrowDown" });
        // Press enter to select
        fireEvent.keyDown(input, { key: "Enter" });

        expect(mockSetApiConfiguration).toHaveBeenCalled();
    });

    it("closes dropdown when escape is pressed", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        // Wait for dropdown to appear
        await screen.findByTestId("dropdown-list");

        // Press escape
        fireEvent.keyDown(input, { key: "Escape" });

        // Wait for dropdown to disappear
        await waitFor(() => {
            expect(screen.queryByTestId("dropdown-list")).not.toBeInTheDocument();
        });
    });

    it("clears search when clear button is clicked with valid credentials", async () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.input(input, { target: { value: "opus" } });

        const clearButton = screen.getByLabelText("Clear search");
        fireEvent.click(clearButton);

        expect(input).toHaveValue("");
        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace",
            dustAssistantId: "",
        });
    });

    it("shows model info when valid model is selected with valid credentials", () => {
        renderWithConfig({
            dustApiKey: "test-key",
            dustWorkspaceId: "test-workspace"
        });

        const modelInfo = screen.getByTestId("model-info");
        expect(modelInfo).toHaveTextContent(`Model: ${dustDefaultModelId}`);
        expect(modelInfo).toHaveTextContent(`Max Tokens: ${dustModels[dustDefaultModelId].maxTokens}`);
    });
});
