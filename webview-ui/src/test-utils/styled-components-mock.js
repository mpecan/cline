const React = require('react');

const styledFunction = (Component) => {
    const StyledComponent = React.forwardRef((props, ref) => {
        return React.createElement(Component, { ...props, ref });
    });
    StyledComponent.attrs = () => StyledComponent;
    StyledComponent.withConfig = () => StyledComponent;
    return () => StyledComponent;
};

const styled = (tag) => styledFunction(tag);

const domElements = [
    'div', 'span', 'input', 'button', 'a', 'p', 'form', 'label'
];

domElements.forEach(tag => {
    styled[tag] = styledFunction(tag);
});

styled.attrs = () => styled;
styled.withConfig = () => styled;

module.exports = styled;
module.exports.default = styled;
module.exports.__esModule = true;
