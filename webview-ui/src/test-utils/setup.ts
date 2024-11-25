import '@testing-library/jest-dom';
import * as React from 'react';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

interface VSCodeTextFieldProps {
    children?: React.ReactNode;
    value?: string;
    onInput?: (event: { target: { value: string } }) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    style?: React.CSSProperties;
    id?: string;
}

interface VSCodeCheckboxProps {
    children?: React.ReactNode;
    checked?: boolean;
    onChange?: (event: { target: { checked: boolean } }) => void;
}

interface VSCodeLinkProps {
    children?: React.ReactNode;
    href?: string;
    style?: React.CSSProperties;
}

interface VSCodeDropdownProps {
    children?: React.ReactNode;
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}

interface VSCodeOptionProps {
    children?: React.ReactNode;
    value: string;
}

// Mock VSCode webview UI toolkit components -- ensure these are always typed 
jest.mock('@vscode/webview-ui-toolkit/react', () => ({
    VSCodeTextField: ({ children, value, onInput, onFocus, onKeyDown, placeholder, type, style, id }: VSCodeTextFieldProps) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onInput?.({ target: { value: e.target.value } });
        };

        return React.createElement('div', null,
            React.createElement(React.Fragment, null, children),
            React.createElement('input', {
                id,
                value: value || '',
                onChange: handleChange,
                onFocus,
                onKeyDown,
                placeholder,
                type,
                style,
                'data-testid': 'vscode-text-field',
                role: 'textbox'
            })
        );
    },

    VSCodeCheckbox: ({ children, checked, onChange }: VSCodeCheckboxProps) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.({ target: { checked: e.target.checked } });
        };

        return React.createElement('label', null,
            React.createElement('input', {
                type: 'checkbox',
                checked: checked || false,
                onChange: handleChange,
                'data-testid': 'vscode-checkbox'
            }),
            React.createElement(React.Fragment, null, children)
        );
    },

    VSCodeLink: ({ children, href, style }: VSCodeLinkProps) => {
        return React.createElement('a', {
            href,
            style,
            'data-testid': 'vscode-link'
        }, children);
    },

    VSCodeDropdown: ({ children, value, onChange, disabled, style }: VSCodeDropdownProps) => {
        const label = React.Children.toArray(children).find(
            child => React.isValidElement(child) && child.props.slot === 'label'
        );

        const options = React.Children.toArray(children).filter(
            child => React.isValidElement(child) && child.props.slot !== 'label'
        );

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.({ target: { value: e.target.value } });
        };

        return React.createElement('div', null,
            label && React.createElement('label', null, React.isValidElement(label) ? label.props.children : null),
            React.createElement('select', {
                value: value || '',
                onChange: handleChange,
                disabled,
                style,
                'data-testid': 'vscode-dropdown'
            }, options)
        );
    },

    VSCodeOption: ({ children, value }: VSCodeOptionProps) => {
        return React.createElement('option', {
            value,
            'data-testid': 'vscode-option'
        }, children);
    }
}));
