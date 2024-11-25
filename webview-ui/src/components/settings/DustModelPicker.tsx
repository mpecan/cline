import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import Fuse from "fuse.js";
import React, { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { dustDefaultModelId, dustModels, DustModelId } from "../../../../src/shared/api";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { highlight } from "../history/HistoryView";
import { ModelInfoView } from "./ApiOptions";

export const DustModelPicker: React.FC = () => {
    const { apiConfiguration, setApiConfiguration } = useExtensionState();
    const [searchTerm, setSearchTerm] = useState(apiConfiguration?.dustAssistantId || dustDefaultModelId);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const dropdownListRef = useRef<HTMLDivElement>(null);

    // Reset model selection when API key or WorkspaceID changes
    useEffect(() => {
        if (!apiConfiguration?.dustApiKey || !apiConfiguration?.dustWorkspaceId) {
            handleModelChange(dustDefaultModelId);
        }
    }, [apiConfiguration?.dustApiKey, apiConfiguration?.dustWorkspaceId]);

    const handleModelChange = (newModelId: string) => {
        setApiConfiguration({
            ...apiConfiguration,
            dustAssistantId: newModelId as DustModelId,
        });
        setSearchTerm(newModelId);
    };

    const { selectedModelId, selectedModelInfo } = useMemo(() => {
        const modelId = (apiConfiguration?.dustAssistantId || dustDefaultModelId) as DustModelId;
        return {
            selectedModelId: modelId,
            selectedModelInfo: dustModels[modelId],
        };
    }, [apiConfiguration]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const modelIds = useMemo(() => {
        return Object.keys(dustModels).sort((a, b) => a.localeCompare(b));
    }, []);

    const searchableItems = useMemo(() => {
        return modelIds.map((id) => ({
            id,
            html: id,
        }));
    }, [modelIds]);

    const fuse = useMemo(() => {
        return new Fuse(searchableItems, {
            keys: ["html"],
            threshold: 0.6,
            shouldSort: true,
            isCaseSensitive: false,
            ignoreLocation: false,
            includeMatches: true,
            minMatchCharLength: 1,
        });
    }, [searchableItems]);

    const modelSearchResults = useMemo(() => {
        let results: { id: string; html: string }[] = searchTerm
            ? highlight(fuse.search(searchTerm), "model-item-highlight")
            : searchableItems;
        return results;
    }, [searchableItems, searchTerm, fuse]);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownVisible) return;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setSelectedIndex((prev) => (prev < modelSearchResults.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                event.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                event.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
                    handleModelChange(modelSearchResults[selectedIndex].id);
                    setIsDropdownVisible(false);
                }
                break;
            case "Escape":
                setIsDropdownVisible(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const hasInfo = useMemo(() => {
        return modelIds.some((id) => id.toLowerCase() === searchTerm.toLowerCase());
    }, [modelIds, searchTerm]);

    const isCredentialsValid = useMemo(() => {
        return !!(apiConfiguration?.dustApiKey && apiConfiguration?.dustWorkspaceId);
    }, [apiConfiguration?.dustApiKey, apiConfiguration?.dustWorkspaceId]);

    useEffect(() => {
        setSelectedIndex(-1);
        if (dropdownListRef.current) {
            dropdownListRef.current.scrollTop = 0;
        }
    }, [searchTerm]);

    useEffect(() => {
        if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);

    return (
        <>
            <style>
                {`
                .model-item-highlight {
                    background-color: var(--vscode-editor-findMatchHighlightBackground);
                    color: inherit;
                }
                `}
            </style>
            <div>
                <label htmlFor="model-search">
                    <span style={{ fontWeight: 500 }}>Model</span>
                </label>
                <DropdownWrapper ref={dropdownRef}>
                    <VSCodeTextField
                        id="model-search"
                        placeholder={isCredentialsValid ? "Search and select a model..." : "Enter API Key and Workspace ID first"}
                        value={searchTerm}
                        disabled={!isCredentialsValid}
                        onInput={(e) => {
                            handleModelChange((e.target as HTMLInputElement)?.value?.toLowerCase());
                            setIsDropdownVisible(true);
                        }}
                        onFocus={() => isCredentialsValid && setIsDropdownVisible(true)}
                        onKeyDown={handleKeyDown}
                        style={{ width: "100%", zIndex: DUST_MODEL_PICKER_Z_INDEX, position: "relative" }}>
                        {searchTerm && (
                            <div
                                className="input-icon-button codicon codicon-close"
                                aria-label="Clear search"
                                onClick={() => {
                                    handleModelChange("");
                                    setIsDropdownVisible(true);
                                }}
                                slot="end"
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "100%",
                                }}
                            />
                        )}
                    </VSCodeTextField>
                    {isDropdownVisible && isCredentialsValid && (
                        <DropdownList ref={dropdownListRef} data-testid="dropdown-list">
                            {modelSearchResults.map((item, index) => (
                                <DropdownItem
                                    key={item.id}
                                    ref={(el) => (itemRefs.current[index] = el)}
                                    selected={index === selectedIndex}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onClick={() => {
                                        handleModelChange(item.id);
                                        setIsDropdownVisible(false);
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: item.html,
                                    }}
                                    data-testid="dropdown-item"
                                />
                            ))}
                        </DropdownList>
                    )}
                </DropdownWrapper>
            </div>

            {hasInfo && isCredentialsValid && (
                <ModelInfoView
                    selectedModelId={selectedModelId}
                    modelInfo={selectedModelInfo}
                    isDescriptionExpanded={isDescriptionExpanded}
                    setIsDescriptionExpanded={setIsDescriptionExpanded}
                />
            )}
        </>
    );
};

// Dropdown Styles
const DropdownWrapper = styled.div`
    position: relative;
    width: 100%;
`;

export const DUST_MODEL_PICKER_Z_INDEX = 1_000;

const DropdownList = styled.div`
    position: absolute;
    top: calc(100% - 3px);
    left: 0;
    width: calc(100% - 2px);
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-list-activeSelectionBackground);
    z-index: ${DUST_MODEL_PICKER_Z_INDEX - 1};
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
`;

const DropdownItem = styled.div<{ selected: boolean }>`
    padding: 5px 10px;
    cursor: pointer;
    word-break: break-all;
    white-space: normal;

    background-color: ${({ selected }) => (selected ? "var(--vscode-list-activeSelectionBackground)" : "inherit")};

    &:hover {
        background-color: var(--vscode-list-activeSelectionBackground);
    }
`;
