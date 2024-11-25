import { render, screen, fireEvent } from "@testing-library/react";
import { DustOptions } from "../DustOptions";
import { ExtensionStateContextProvider } from "../../../context/ExtensionStateContext";
import React from "react";

const mockSetApiConfiguration = jest.fn();

jest.mock("../../../context/ExtensionStateContext", () => ({
    ...jest.requireActual("../../../context/ExtensionStateContext"),
    useExtensionState: () => ({
        apiConfiguration: {},
        setApiConfiguration: mockSetApiConfiguration,
    }),
}));

// Mock DustModelPicker component
jest.mock("../DustModelPicker", () => ({
    DustModelPicker: () => <div data-testid="dust-model-picker">Model Picker</div>
}));

describe("DustOptions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders all input fields", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        expect(screen.getByPlaceholderText("Enter API Key...")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter Workspace ID...")).toBeInTheDocument();
        expect(screen.getByText("Use custom base URL")).toBeInTheDocument();
        expect(screen.getByTestId("dust-model-picker")).toBeInTheDocument();
    });

    it("handles API key input", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        const apiKeyInput = screen.getByPlaceholderText("Enter API Key...");
        fireEvent.input(apiKeyInput, { target: { value: "test-api-key" } });

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustApiKey: "test-api-key",
        });
    });

    it("handles workspace ID input", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        const workspaceIdInput = screen.getByPlaceholderText("Enter Workspace ID...");
        fireEvent.input(workspaceIdInput, { target: { value: "test-workspace" } });

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustWorkspaceId: "test-workspace",
        });
    });

    it("shows custom base URL input when checkbox is checked", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        const checkbox = screen.getByText("Use custom base URL");
        fireEvent.click(checkbox);

        expect(screen.getByPlaceholderText("Default: https://dust.tt")).toBeInTheDocument();
    });

    it("handles custom base URL input", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        const checkbox = screen.getByText("Use custom base URL");
        fireEvent.click(checkbox);

        const baseUrlInput = screen.getByPlaceholderText("Default: https://dust.tt");
        fireEvent.input(baseUrlInput, { target: { value: "https://custom.dust.tt" } });

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustBaseUrl: "https://custom.dust.tt",
        });
    });

    it("clears base URL when checkbox is unchecked", async () => {
        render(
            <ExtensionStateContextProvider>
                <DustOptions />
            </ExtensionStateContextProvider>
        );

        const checkbox = screen.getByText("Use custom base URL");
        fireEvent.click(checkbox);
        fireEvent.click(checkbox);

        expect(mockSetApiConfiguration).toHaveBeenCalledWith({
            dustBaseUrl: "",
        });
    });
});
