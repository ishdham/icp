/**
 * Utility to translate a JSON Schema for UI rendering.
 * It traverses the schema and:
 * 1. Translates 'title' fields if a translation key exists or is provided.
 * 2. Generates 'enumNames' for enum fields by translating each enum value.
 */

export const translateSchema = (schema: any, t: (key: string) => string): any => {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    // Clone to avoid mutating original
    const newSchema = Array.isArray(schema) ? [...schema] : { ...schema };

    // 1. Translate 'title' and 'description'
    if (newSchema.title) {
        newSchema.title = t(newSchema.title);
    } else if (newSchema.description) {
        // Fallback: Use description as title if title is missing
        // This is useful for Zod schemas where .describe() sets description but we want it as label
        newSchema.title = t(newSchema.description);
    }

    if (newSchema.description) {
        newSchema.description = t(newSchema.description);
    }

    // 2. Handle Enums - Convert to 'oneOf' with 'const' and 'title' for robust localization
    if (newSchema.enum && Array.isArray(newSchema.enum)) {
        const oneOfOptions = newSchema.enum.map((val: string) => {
            let translation = val;

            // Try specific keys first: 'status.VAL', 'domain.VAL', etc.
            const keysToTry = [
                `status.${val}`,
                `domain.${val}`,
                `type.${val}`,
                `entity_type.${val}`,
                `role.${val}`,
                val // Fallback to value itself
            ];

            for (const key of keysToTry) {
                const tVal = t(key);
                // If translation found (and different from key), use it
                // Note: t() returns key if not found, so we check tVal !== key
                if (tVal !== key) {
                    translation = tVal;
                    break;
                }
            }

            return { const: val, title: translation };
        });

        newSchema.oneOf = oneOfOptions;
        delete newSchema.enum;
        delete newSchema.enumNames; // clean up if existed
    }

    // 3. Recursive traversal for properties, items, definitions
    if (newSchema.properties) {
        Object.keys(newSchema.properties).forEach(key => {
            newSchema.properties[key] = translateSchema(newSchema.properties[key], t);
        });
    }

    if (newSchema.items) {
        newSchema.items = translateSchema(newSchema.items, t);
    }

    if (newSchema.definitions) {
        Object.keys(newSchema.definitions).forEach(key => {
            newSchema.definitions[key] = translateSchema(newSchema.definitions[key], t);
        });
    }

    return newSchema;
};

export const translateUiSchema = (uischema: any, t: (key: string) => string): any => {
    if (!uischema || typeof uischema !== 'object') {
        return uischema;
    }

    const newUiSchema = { ...uischema };

    // Translate Label
    if (newUiSchema.label) {
        newUiSchema.label = t(newUiSchema.label);
    }

    // Recursive traversal for elements
    if (newUiSchema.elements && Array.isArray(newUiSchema.elements)) {
        newUiSchema.elements = newUiSchema.elements.map((element: any) => translateUiSchema(element, t));
    }

    return newUiSchema;
};
