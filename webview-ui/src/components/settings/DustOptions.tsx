import { VSCodeCheckbox, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import React, { useEffect, useState } from "react";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { DustHandler } from "../../../../src/api/providers/dust";
import { DustModelPicker } from "../settings/DustModelPicker";

type CheckboxEvent = Event | React.FormEvent<HTMLElement> | { target: { checked: boolean } };

export const DustOptions: React.FC = () => {
    const { apiConfiguration, setApiConfiguration } = useExtensionState();
    const [dustBaseUrlSelected, setDustBaseUrlSelected] = useState(!!apiConfiguration?.dustBaseUrl);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModels = async () => {
            if (!apiConfiguration?.dustApiKey || !apiConfiguration?.dustWorkspaceId) {
                return;
            }

            setIsLoadingModels(true);
            setModelError(null);

            try {
                const handler = new DustHandler({
                    dustApiKey: apiConfiguration.dustApiKey,
                    dustWorkspaceId: apiConfiguration.dustWorkspaceId,
                    dustBaseUrl: apiConfiguration.dustBaseUrl,
                });

                const models = await handler.fetchAvailableModels();
                setApiConfiguration({
                    ...apiConfiguration,
                    dustAvailableModels: models,
                });
            } catch (error) {
                console.error("Failed to fetch Dust models:", error);
                setModelError("Failed to fetch available models. Please check your credentials.");
            } finally {
                setIsLoadingModels(false);
            }
        };

        fetchModels();
    }, [apiConfiguration?.dustApiKey, apiConfiguration?.dustWorkspaceId, apiConfiguration?.dustBaseUrl]);

    const handleConfigurationChange = (field: string, value: string) => {
        setApiConfiguration({
            ...apiConfiguration,
            [field]: value,
        });
    };

    const handleCheckboxChange = (e: CheckboxEvent) => {
        let checked: boolean;
        
        if (e instanceof Event) {
            checked = (e.target as HTMLInputElement).checked;
        } else if ('target' in e && 'checked' in e.target) {
            checked = e.target.checked;
        } else {
            checked = ((e as React.FormEvent<HTMLElement>).target as HTMLInputElement).checked;
        }
            
        setDustBaseUrlSelected(checked);
        if (!checked) {
            handleConfigurationChange("dustBaseUrl", "");
        }
    };

    return (
        <div>
            <VSCodeTextField
                value={apiConfiguration?.dustApiKey || ""}
                style={{ width: "100%" }}
                type="password"
                onChange={(e) => handleConfigurationChange("dustApiKey", (e.target as HTMLInputElement).value)}
                placeholder="Enter API Key...">
                <span style={{ fontWeight: 500 }}>Dust API Key</span>
            </VSCodeTextField>

            <VSCodeTextField
                value={apiConfiguration?.dustWorkspaceId || ""}
                style={{ width: "100%" }}
                onChange={(e) => handleConfigurationChange("dustWorkspaceId", (e.target as HTMLInputElement).value)}
                placeholder="Enter Workspace ID..."
                required>
                <span style={{ fontWeight: 500 }}>Dust Workspace ID</span>
            </VSCodeTextField>

            <DustModelPicker />
            {isLoadingModels && (
                <p style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)" }}>
                    Loading available models...
                </p>
            )}
            {modelError && (
                <p style={{ fontSize: "12px", color: "var(--vscode-errorForeground)" }}>
                    {modelError}
                </p>
            )}

            <div>
                <VSCodeCheckbox
                    checked={dustBaseUrlSelected}
                    onChange={handleCheckboxChange}
                    id="custom-url-checkbox"
                    aria-label="Use custom base URL">
                    Use custom base URL
                </VSCodeCheckbox>
            </div>

            {dustBaseUrlSelected && (
                <VSCodeTextField
                    value={apiConfiguration?.dustBaseUrl || ""}
                    style={{ width: "100%", marginTop: 3 }}
                    type="url"
                    onChange={(e) => handleConfigurationChange("dustBaseUrl", (e.target as HTMLInputElement).value)}
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
