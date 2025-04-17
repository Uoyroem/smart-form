export function isVisible(element: HTMLElement) {
    const style = getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (parseFloat(style.opacity) < 0.1) return false;
    if (element.offsetWidth + element.offsetHeight + element.getBoundingClientRect().height +
        element.getBoundingClientRect().width === 0) {
        return false;
    }
    const elementCenter = {
        x: element.getBoundingClientRect().left + element.offsetWidth / 2,
        y: element.getBoundingClientRect().top + element.offsetHeight / 2
    };
    if (elementCenter.x < 0) return false;
    if (elementCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elementCenter.y < 0) return false;
    if (elementCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer: Element | ParentNode | null | undefined = document.elementFromPoint(elementCenter.x, elementCenter.y);
    do {
        if (pointContainer === element) return true;
    } while (pointContainer = pointContainer?.parentNode);
    return false;
}

export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
        return false;
    }

    const aKeys = new Set(Object.keys(a));
    const bKeys = new Set(Object.keys(b));

    if (aKeys.size !== bKeys.size) return false;
    for (const key of aKeys) {
        if (!deepEqual(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

export async function readFile(file: File) {
    return new Promise((resolve, reason) => {
        const reader = new FileReader();
        reader.onload = function () {
            const content = (reader.result as string | null)?.split(',')?.[1];
            if (content) {
                resolve({ name: file.name, type: file.type, content });
            }
        };
        reader.readAsDataURL(file);
    });
}

export function getMetaDependencyKey(fieldName: string, metaKey: string) {
    return `${fieldName}:${metaKey}`;
}