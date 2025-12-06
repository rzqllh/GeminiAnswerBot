/**
 * @license lucide v0.556.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.lucide = {}));
})(this, (function (exports) {
    'use strict';

    const defaultAttributes = {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    };

    const createSVGElement = ([tag, attrs, children]) => {
        const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.keys(attrs).forEach((name) => {
            element.setAttribute(name, String(attrs[name]));
        });
        if (children?.length) {
            children.forEach((child) => {
                const childElement = createSVGElement(child);
                element.appendChild(childElement);
            });
        }
        return element;
    };
    const createElement = (iconNode, customAttrs = {}) => {
        const tag = "svg";
        const attrs = {
            ...defaultAttributes,
            ...customAttrs
        };
        return createSVGElement([tag, attrs, iconNode]);
    };

    const getAttrs = (element) => Array.from(element.attributes).reduce((attrs, attr) => {
        attrs[attr.name] = attr.value;
        return attrs;
    }, {});
    const getClassNames = (attrs) => {
        if (typeof attrs === "string") return attrs;
        if (!attrs || !attrs.class) return "";
        if (attrs.class && typeof attrs.class === "string") {
            return attrs.class.split(" ");
        }
        if (attrs.class && Array.isArray(attrs.class)) {
            return attrs.class;
        }
        return "";
    };
    const combineClassNames = (arrayOfClassnames) => {
        const classNameArray = arrayOfClassnames.flatMap(getClassNames);
        return classNameArray.map((classItem) => classItem.trim()).filter(Boolean).filter((value, index, self) => self.indexOf(value) === index).join(" ");
    };
    const toPascalCase = (string) => string.replace(/(\w)(\w*)(_|-|\s*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
    const replaceElement = (element, { nameAttr, icons, attrs }) => {
        const iconName = element.getAttribute(nameAttr);
        if (iconName == null) return;
        const ComponentName = toPascalCase(iconName);
        const iconNode = icons[ComponentName];
        if (!iconNode) {
            return console.warn(
                `${element.outerHTML} icon name was not found in the provided icons object.`
            );
        }
        const elementAttrs = getAttrs(element);
        const iconAttrs = {
            ...defaultAttributes,
            "data-lucide": iconName,
            ...attrs,
            ...elementAttrs
        };
        const classNames = combineClassNames(["lucide", `lucide-${iconName}`, elementAttrs, attrs]);
        if (classNames) {
            Object.assign(iconAttrs, {
                class: classNames
            });
        }
        const svgElement = createElement(iconNode, iconAttrs);
        return element.parentNode?.replaceChild(svgElement, element);
    };

    const createIcons = ({ root = document.body, nameAttr = "data-lucide", attrs = {} } = {}) => {
        const elements = Array.from(root.querySelectorAll(`[${nameAttr}]`));
        elements.forEach((element) => replaceElement(element, { nameAttr, icons: exports.icons, attrs }));
    };

    // --- ICONS ---
    // We need to fetch the full list of icons or at least the ones we use.
    // Since I cannot fetch the FULL 2MB file easily in one go without potential issues,
    // I will implement a minimal set of icons that we actually use.

    const icons = {
        Bot: [["path", { d: "M12 8V4H8" }], ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2" }], ["path", { d: "M2 14h2" }], ["path", { d: "M20 14h2" }], ["path", { d: "M15 13v2" }], ["path", { d: "M9 13v2" }]],
        Camera: [["path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }], ["circle", { cx: "12", cy: "13", r: "3" }]],
        FileText: [["path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }], ["polyline", { points: "14 2 14 8 20 8" }], ["line", { x1: "16", y1: "13", x2: "8", y2: "13" }], ["line", { x1: "16", y1: "17", x2: "8", y2: "17" }], ["line", { x1: "10", y1: "9", x2: "8", y2: "9" }]],
        RotateCw: [["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }], ["path", { d: "M21 3v5h-5" }]],
        Settings: [["path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }], ["circle", { cx: "12", cy: "12", r: "3" }]],
        Sparkles: [["path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }], ["path", { d: "M5 3v4" }], ["path", { d: "M9 5h4" }], ["path", { d: "M5 21v-4" }], ["path", { d: "M9 19h4" }]],
        Copy: [["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]],
        Loader2: [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
        ChevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
        BrainCircuit: [["path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }], ["path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }], ["path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }], ["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }], ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }], ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }], ["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }], ["path", { d: "M6 18a4 4 0 0 1-1.967-.516" }], ["path", { d: "M19.967 17.484A4 4 0 0 1 18 18" }]],
        RefreshCw: [["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }], ["path", { d: "M21 3v5h-5" }], ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }], ["path", { d: "M8 16H3v5" }]],
        Search: [["circle", { cx: "11", cy: "11", r: "8" }], ["path", { d: "m21 21-4.3-4.3" }]],
        ThumbsUp: [["path", { d: "M7 10v12" }], ["path", { d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" }]],
        ThumbsDown: [["path", { d: "M17 14V2" }], ["path", { d: "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" }]],
        BookOpen: [["path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }], ["path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" }]],
        Check: [["path", { d: "M20 6 9 17l-5-5" }]],
        AlertCircle: [["circle", { cx: "12", cy: "12", r: "10" }], ["line", { x1: "12", x2: "12", y1: "8", y2: "12" }], ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16" }]],
        Key: [["circle", { cx: "7.5", cy: "15.5", r: "5.5" }], ["path", { d: "m21 2-9.6 9.6" }], ["path", { d: "m15.5 7.5 3 3L22 7l-3-3" }]],
        Brain: [["path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }], ["path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }], ["path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }], ["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }], ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }], ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }], ["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }], ["path", { d: "M6 18a4 4 0 0 1-1.967-.516" }], ["path", { d: "M19.967 17.484A4 4 0 0 1 18 18" }]]
    };

    exports.createIcons = createIcons;
    exports.icons = icons;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
