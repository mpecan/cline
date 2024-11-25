import { VSCodeCheckbox, VSCodeDropdown, VSCodeLink, VSCodeOption, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import React, { useState, FormEvent, useEffect } from "react";
import { ApiConfiguration } from "../../../../src/shared/api";

interface Model {
    id: string;
    sId: string;
    name: string;
    description?: string;
}

interface DustOptionsProps {
    apiConfiguration?: Partial<ApiConfiguration>;
    onConfigurationChange: (field: keyof ApiConfiguration, value: string) => void;
}

export const DustOptions: React.FC<DustOptionsProps> = ({ apiConfiguration, onConfigurationChange }) => {
    const [dustBaseUrlSelected, setDustBaseUrlSelected] = useState(!!apiConfiguration?.dustBaseUrl);
    const [models, setModels] = useState<Model[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        const fetchModels = async () => {
            if (!apiConfiguration?.dustApiKey || !apiConfiguration?.dustWorkspaceId) {
                setModels([]);
                return;
            }

            setIsLoadingModels(true);
            try {
                const baseUrl = apiConfiguration.dustBaseUrl || 'https://dust.tt';
                const response = await fetch(
                    `${baseUrl}/api/v1/w/${apiConfiguration.dustWorkspaceId}/assistant/agent_configurations`,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiConfiguration.dustApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response?.ok) {
                    throw new Error('Failed to fetch models');
                }

                const data = await response.json();
                setModels(data);
            } catch (error) {
                console.error('Error fetching models:', error);
                setModels([]);
            } finally {
                setIsLoadingModels(false);
            }
        };

        fetchModels();
    }, [apiConfiguration?.dustApiKey, apiConfiguration?.dustWorkspaceId, apiConfiguration?.dustBaseUrl]);

    const handleInputChange = (field: keyof ApiConfiguration) => (event: any) => {
        onConfigurationChange(field, event.target.value);
    };

    const handleCheckboxChange = (e: Event | FormEvent<HTMLElement>) => {
        const checkbox = (e.target as HTMLInputElement);
        setDustBaseUrlSelected(checkbox.checked);
        if (!checkbox.checked) {
            onConfigurationChange("dustBaseUrl", "");
        }
    };

    return (
        <div>
            <VSCodeTextField
                value={apiConfiguration?.dustApiKey || ""}
                style={{ width: "100%" }}
                type="password"
                onInput={handleInputChange("dustApiKey")}
                placeholder="Enter API Key...">
                <span style={{ fontWeight: 500 }}>Dust API Key</span>
            </VSCodeTextField>

            <VSCodeTextField
                value={apiConfiguration?.dustWorkspaceId || ""}
                style={{ width: "100%" }}
                onInput={handleInputChange("dustWorkspaceId")}
                placeholder="Enter Workspace ID..."
                required>
                <span style={{ fontWeight: 500 }}>Dust Workspace ID</span>
            </VSCodeTextField>

            <VSCodeDropdown
                style={{ width: "100%" }}
                value={apiConfiguration?.dustAssistantId || ""}
                onChange={(e: any) => onConfigurationChange("dustAssistantId", e.target.value)}
                disabled={isLoadingModels || !apiConfiguration?.dustApiKey || !apiConfiguration?.dustWorkspaceId}>
                <span slot="label" style={{ fontWeight: 500 }}>Model (Optional)</span>
                <VSCodeOption value="">Select a model</VSCodeOption>
                {!apiConfiguration?.dustApiKey || !apiConfiguration?.dustWorkspaceId ? (
                    <VSCodeOption value="">Enter API Key and Workspace ID first</VSCodeOption>
                ) : isLoadingModels ? (
                    <VSCodeOption value="">Loading models...</VSCodeOption>
                ) : models.length === 0 ? (
                    <VSCodeOption value="">No models found</VSCodeOption>
                ) : (
                    models.map(model => (
                        <VSCodeOption key={model.sId} value={model.sId}>
                            {model.name}
                        </VSCodeOption>
                    ))
                )}
            </VSCodeDropdown>

            <VSCodeCheckbox
                checked={dustBaseUrlSelected}
                onChange={handleCheckboxChange}>
                Use custom base URL
            </VSCodeCheckbox>

            {dustBaseUrlSelected && (
                <VSCodeTextField
                    value={apiConfiguration?.dustBaseUrl || ""}
                    style={{ width: "100%", marginTop: 3 }}
                    type="url"
                    onInput={handleInputChange("dustBaseUrl")}
                    placeholder="Default: https://dust.tt"
                />
            )}

            <p
                style={{
                    fontSize: "12px",
                    marginTop: 3,
                    color: "var(--vscode-descriptionForeground)",
                }}>
                This key is stored locally and only used to make API requests from this extension.
                {!apiConfiguration?.dustApiKey && (
                    <VSCodeLink
                        href="https://dust.tt"
                        style={{ display: "inline", fontSize: "inherit" }}>
                        You can get a Dust API key by signing up here.
                    </VSCodeLink>
                )}
            </p>
        </div>
    );
};
