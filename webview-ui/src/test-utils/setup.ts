import "@testing-library/jest-dom"
import React from "react"
import { ExtensionState } from "../../../src/shared/ExtensionMessage"

// Mock vscode API
;(global as any).acquireVsCodeApi = () => ({
    postMessage: jest.fn(),
})

// Mock VSCode webview UI toolkit components
jest.mock("@vscode/webview-ui-toolkit/react", () => ({
    VSCodeCheckbox: (props: any) => {
        const { children, ...rest } = props;
        return React.createElement("div", {}, [
            React.createElement("input", {
                type: "checkbox",
                ...rest,
                role: "checkbox",
                key: "input"
            }),
            children && React.createElement("span", { key: "label" }, children)
        ]);
    },
    VSCodeTextField: (props: any) => {
        const { children, ...rest } = props;
        return React.createElement("div", {}, [
            React.createElement("input", {
                type: "text",
                ...rest,
                role: "textbox",
                key: "input"
            }),
            children && React.createElement("span", { key: "label" }, children)
        ]);
    },
    VSCodeLink: (props: any) => {
        const { children, ...rest } = props;
        return React.createElement("a", rest, children);
    }
}));

// Helper to create test state
export const createTestState = (overrides: Partial<ExtensionState> = {}): ExtensionState => ({
    version: "1.0.0",
    clineMessages: [],
    taskHistory: [],
    shouldShowAnnouncement: false,
    apiConfiguration: {
        dustApiKey: "",
        dustWorkspaceId: "",
        dustAvailableModels: {},
        ...overrides.apiConfiguration
    },
    ...overrides,
});

// Create mock function for useExtensionState
export const mockUseExtensionState = jest.fn(() => ({
    didHydrateState: true,
    showWelcome: false,
    theme: {},
    openRouterModels: {},
    filePaths: [],
    apiConfiguration: {
        dustApiKey: "",
        dustWorkspaceId: "",
        dustAvailableModels: {},
        dustAssistantId: "",
    },
    setApiConfiguration: jest.fn(),
    setCustomInstructions: jest.fn(),
    setAlwaysAllowReadOnly: jest.fn(),
    setShowAnnouncement: jest.fn(),
}));

// Mock ExtensionStateContext
jest.mock("../context/ExtensionStateContext", () => ({
    useExtensionState: () => mockUseExtensionState()
}));

// Mock window.postMessage
Object.defineProperty(window, 'postMessage', {
    writable: true,
    value: jest.fn()
});
