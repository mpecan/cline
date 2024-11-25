import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DustOptions } from '../DustOptions';
import { validateApiConfiguration } from '../../../utils/validate';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('DustOptions', () => {
    const mockOnConfigurationChange = jest.fn();

    beforeEach(() => {
        mockOnConfigurationChange.mockClear();
        mockFetch.mockClear();
    });

    it('renders all required fields', async () => {
        render(
            <DustOptions
                apiConfiguration={{}}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Dust API Key')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Dust Workspace ID')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Assistant')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Use custom base URL')).toBeInTheDocument();
        });
    });

    it('handles input changes correctly', async () => {
        render(
            <DustOptions
                apiConfiguration={{}}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        const apiKeyInput = await screen.findByPlaceholderText('Enter API Key...');
        const workspaceIdInput = await screen.findByPlaceholderText('Enter Workspace ID...');

        fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
        expect(mockOnConfigurationChange).toHaveBeenCalledWith('dustApiKey', 'test-api-key');

        fireEvent.change(workspaceIdInput, { target: { value: 'test-workspace' } });
        expect(mockOnConfigurationChange).toHaveBeenCalledWith('dustWorkspaceId', 'test-workspace');
    });

    it('toggles custom base URL field visibility', async () => {
        render(
            <DustOptions
                apiConfiguration={{}}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        const baseUrlCheckbox = await screen.findByTestId('vscode-checkbox');
        
        // Initially, base URL field should not be visible
        expect(screen.queryByPlaceholderText('Default: https://dust.tt')).not.toBeInTheDocument();

        // After checking the checkbox, base URL field should be visible
        fireEvent.click(baseUrlCheckbox);
        expect(await screen.findByPlaceholderText('Default: https://dust.tt')).toBeInTheDocument();

        // After unchecking, base URL field should be hidden again
        fireEvent.click(baseUrlCheckbox);
        await waitFor(() => {
            expect(screen.queryByPlaceholderText('Default: https://dust.tt')).not.toBeInTheDocument();
        });
    });

    it('displays existing configuration values', async () => {
        const config = {
            dustApiKey: 'existing-key',
            dustWorkspaceId: 'existing-workspace',
            dustBaseUrl: 'https://custom.dust.tt',
            dustAssistantId: 'existing-assistant'
        };

        render(
            <DustOptions
                apiConfiguration={config}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        const apiKeyInput = await screen.findByPlaceholderText('Enter API Key...');
        expect(apiKeyInput).toHaveValue('existing-key');

        const workspaceIdInput = await screen.findByPlaceholderText('Enter Workspace ID...');
        expect(workspaceIdInput).toHaveValue('existing-workspace');

        // Check if the base URL checkbox is checked and field is visible
        const baseUrlCheckbox = await screen.findByTestId('vscode-checkbox');
        expect(baseUrlCheckbox).toBeChecked();

        const baseUrlInput = await screen.findByPlaceholderText('Default: https://dust.tt');
        expect(baseUrlInput).toHaveValue('https://custom.dust.tt');
    });

    it('shows loading state when fetching assistants', async () => {
        mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves to keep loading state

        render(
            <DustOptions
                apiConfiguration={{
                    dustApiKey: 'test-key',
                    dustWorkspaceId: 'test-workspace'
                }}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Loading assistants...')).toBeInTheDocument();
        });
    });

    it('fetches and displays assistants when API key and workspace ID are provided', async () => {
        const mockAssistants = [
            { sId: 'assistant1', name: 'Assistant 1' },
            { sId: 'assistant2', name: 'Assistant 2' }
        ];

        mockFetch.mockImplementationOnce(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockAssistants)
            })
        );

        render(
            <DustOptions
                apiConfiguration={{
                    dustApiKey: 'test-key',
                    dustWorkspaceId: 'test-workspace'
                }}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        const assistant1Text = await screen.findByText('Assistant 1');
        expect(assistant1Text).toBeInTheDocument();

        const assistant2Text = await screen.findByText('Assistant 2');
        expect(assistant2Text).toBeInTheDocument();
    });

    it('handles assistant selection', async () => {
        const mockAssistants = [
            { sId: 'assistant1', name: 'Assistant 1' },
            { sId: 'assistant2', name: 'Assistant 2' }
        ];

        mockFetch.mockImplementationOnce(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockAssistants)
            })
        );

        render(
            <DustOptions
                apiConfiguration={{
                    dustApiKey: 'test-key',
                    dustWorkspaceId: 'test-workspace'
                }}
                onConfigurationChange={mockOnConfigurationChange}
            />
        );

        // Wait for assistants to load
        await screen.findByText('Assistant 1');
        await screen.findByText('Assistant 2');

        const dropdown = await screen.findByTestId('vscode-dropdown');
        fireEvent.change(dropdown, { target: { value: 'assistant1' } });
        
        await waitFor(() => {
            expect(mockOnConfigurationChange).toHaveBeenCalledWith('dustAssistantId', 'assistant1');
        });
    });

    describe('Validation', () => {
        it('requires both API key and Workspace ID', () => {
            // Test missing both fields
            expect(validateApiConfiguration({ apiProvider: 'dust' }))
                .toBe('You must provide both an API key and Workspace ID.');

            // Test missing Workspace ID
            expect(validateApiConfiguration({ 
                apiProvider: 'dust',
                dustApiKey: 'test-key'
            })).toBe('You must provide both an API key and Workspace ID.');

            // Test missing API key
            expect(validateApiConfiguration({ 
                apiProvider: 'dust',
                dustWorkspaceId: 'test-workspace'
            })).toBe('You must provide both an API key and Workspace ID.');

            // Test valid configuration
            expect(validateApiConfiguration({ 
                apiProvider: 'dust',
                dustApiKey: 'test-key',
                dustWorkspaceId: 'test-workspace'
            })).toBeUndefined();
        });
    });
});
