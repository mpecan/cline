import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DustModelPicker } from "../DustModelPicker";
import { ExtensionStateContextProvider } from "../../../context/ExtensionStateContext";
import React from "react";
import { dustDefaultModelId, dustModels } from "../../../../../src/shared/api";

const mockSetApiConfiguration = jest.fn();

// Mock scrollIntoView since it's not supported in jsdom
window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock("../../../context/ExtensionStateContext", () => ({
    ...jest.requireActual("../../../context/ExtensionStateContext"),
    useExtensionState: () => ({
        apiConfiguration: {
            dustAssistantId: dustDefaultModelId,
        },
        setApiConfiguration: mockSetApiConfiguration,
    }),
}));

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

    it("renders with default model selected", () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        expect(screen.getByDisplayValue(dustDefaultModelId)).toBeInTheDocument();
        expect(screen.getByTestId("model-info")).toBeInTheDocument();
    });

    it("shows dropdown when input is focused", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

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

    it("filters models based on search term", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);
        fireEvent.input(input, { target: { value: "opus" } });

        // Wait for dropdown to appear
        const dropdownList = await screen.findByTestId("dropdown-list");
        expect(dropdownList).toHaveTextContent("claude-3-opus");
        expect(dropdownList).not.toHaveTextContent("claude-3-sonnet");
    });

    it("updates model selection when clicking on a model", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.focus(input);

        // Wait for dropdown to appear
        await screen.findByTestId("dropdown-list");

        const modelOptions = screen.getAllByTestId("dropdown-item");
        const opusOption = modelOptions.find(option => option.textContent?.includes("claude-3-opus"));
        expect(opusOption).toBeTruthy();

        fireEvent.click(opusOption!);

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustAssistantId: "claude-3-opus",
        });
    });

    it("supports keyboard navigation", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

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
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

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

    it("clears search when clear button is clicked", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        const input = screen.getByTestId("vscode-text-field");
        fireEvent.input(input, { target: { value: "opus" } });

        const clearButton = screen.getByLabelText("Clear search");
        fireEvent.click(clearButton);

        expect(input).toHaveValue("");
        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustAssistantId: "",
        });
    });

    it("shows model info when valid model is selected", () => {
        render(
            <ExtensionStateContextProvider>
                <DustModelPicker />
            </ExtensionStateContextProvider>
        );

        const modelInfo = screen.getByTestId("model-info");
        expect(modelInfo).toHaveTextContent(`Model: ${dustDefaultModelId}`);
        expect(modelInfo).toHaveTextContent(`Max Tokens: ${dustModels[dustDefaultModelId].maxTokens}`);
    });
});
