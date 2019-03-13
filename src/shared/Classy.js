import Styles from './Styles.module.scss';

const hasOwn = {}.hasOwnProperty;

const ClassCombo = function () {
    let classes = [];

    for (let i = 0; i < arguments.length; i += 1) {
        let arg = arguments[i];
        if (!arg) continue;

        var argType = typeof arg;

        if (argType === 'string' || argType === 'number') {
            classes.push((this && this[arg]) || arg);
        } else if (Array.isArray(arg)) {
            classes.push(Classy.apply(this, arg));
        } else if (argType === 'object') {
            for (let key in arg) {
                if (hasOwn.call(arg, key) && arg[key]) {
                    classes.push((this && this[key]) || key);
                }
            }
        }
    }

    return classes.join(' ').split(' ');
};

const Classy = (StyleSheets) => {
    StyleSheets = StyleSheets || [];

    return function () {
        let classes = ClassCombo.apply(Styles, arguments);
        for (let i in StyleSheets) {
            classes = ClassCombo.apply(StyleSheets[i], classes);
        }
        return classes.join(' ');
    };
};

let canvas = document.createElement('canvas');

Classy.webp = 'no-webp';

if (canvas.getContext && canvas.getContext('2d')) {
    Classy.webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'webp' : 'no-webp';
}

export default Classy;