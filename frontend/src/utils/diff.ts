
/**
 * deeply compares two objects/values
 */
function isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Returns an object containing only the fields from `current` that are different from `initial`.
 * This performs a top-level check for changed values.
 * If a top-level key's value has changed (based on deep equality check), the entire new value is included.
 * This is safer for document-replacement backends (like Firestore map replacement) compared to deep diffing,
 * unless dot-notation flattening is used.
 */
export const getDirtyValues = <T extends Record<string, any>>(initial: T, current: T): Partial<T> => {
    const dirty: Partial<T> = {};
    const allKeys = new Set([...Object.keys(initial || {}), ...Object.keys(current || {})]);

    allKeys.forEach((key) => {
        const initialVal = initial?.[key];
        const currentVal = current?.[key];

        if (!isEqual(initialVal, currentVal)) {
            // Include the current value if it changed
            // If currentVal is undefined (deleted), we might want to send null or leave it to backend handling.
            // For now, we pass whatever is in current.
            dirty[key as keyof T] = currentVal;
        }
    });

    return dirty;
};
