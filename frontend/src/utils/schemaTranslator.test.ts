
import { describe, it, expect } from 'vitest';
import { translateSchema, translateUiSchema } from './schemaTranslator';

describe('schemaTranslator', () => {
    const mockT = (key: string) => {
        const dict: Record<string, string> = {
            'My Title': 'Translated Title',
            'My Desc': 'Translated Desc',
            'domain.Water': 'Jal',
            'status.PROPOSED': 'Prastavit',
            'Name': 'Naam'
        };
        return dict[key] || key;
    };

    describe('translateSchema', () => {
        it('should translate top-level title and description', () => {
            const schema = {
                title: 'My Title',
                description: 'My Desc'
            };
            const result = translateSchema(schema, mockT);
            expect(result.title).toBe('Translated Title');
            expect(result.description).toBe('Translated Desc');
        });

        it('should fallback to description for title if title is missing', () => {
            const schema = {
                description: 'My Desc'
            };
            const result = translateSchema(schema, mockT);
            expect(result.title).toBe('Translated Desc');
            expect(result.description).toBe('Translated Desc');
        });

        it('should convert enums to oneOf with translated titles', () => {
            const schema = {
                properties: {
                    domain: {
                        type: 'string',
                        enum: ['Water', 'Sky']
                    }
                }
            };
            const result = translateSchema(schema, mockT);
            const domain = result.properties.domain;

            expect(domain.enum).toBeUndefined();
            expect(domain.oneOf).toBeDefined();
            expect(domain.oneOf).toHaveLength(2);
            expect(domain.oneOf[0]).toEqual({ const: 'Water', title: 'Jal' }); // Translated
            expect(domain.oneOf[1]).toEqual({ const: 'Sky', title: 'Sky' }); // Fallback
        });

        it('should recurse into property definitions', () => {
            const schema = {
                properties: {
                    user: {
                        properties: {
                            name: { title: 'Name' }
                        }
                    }
                }
            };
            const result = translateSchema(schema, mockT);
            expect(result.properties.user.properties.name.title).toBe('Naam');
        });

        it('should not mutate original schema', () => {
            const schema = { title: 'Original' };
            const result = translateSchema(schema, (k) => k + 'X');
            expect(schema.title).toBe('Original');
            expect(result.title).toBe('OriginalX');
        });
    });

    describe('translateUiSchema', () => {
        it('should translate labels', () => {
            const uischema = {
                type: 'Group',
                label: 'My Title'
            };
            const result = translateUiSchema(uischema, mockT);
            expect(result.label).toBe('Translated Title');
        });

        it('should recurse into elements', () => {
            const uischema = {
                type: 'VerticalLayout',
                elements: [
                    { type: 'Control', label: 'My Title' }
                ]
            };
            const result = translateUiSchema(uischema, mockT);
            expect(result.elements[0].label).toBe('Translated Title');
        });
    });
});
