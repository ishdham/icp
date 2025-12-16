import { db } from '../config/firebase';
import { ai } from './ai.service';
import { SolutionSchema } from '@shared/schemas/solutions';
import { PartnerSchema } from '@shared/schemas/partners';

export class TranslationService {

    // Core Translation using Genkit (Gemini)
    async translateText(text: string, targetLanguage: string): Promise<string> {
        if (!text) return '';

        try {
            const prompt = `
            Translate the following text into ${targetLanguage}.
            Only return the translated text. Do not add any explanations or quotes.
            
            Text: "${text}"
            `;

            const result = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: prompt,
                config: {
                    temperature: 0.3, // Lower temperature for more deterministic translation
                }
            });

            return result.text.trim();
        } catch (error) {
            console.error(`Translation failed for lang ${targetLanguage}:`, error);
            return text; // Fallback to original
        }
    }

    // Lazy Translation for Entities
    async getTranslatedEntity(entityId: string, collection: 'solutions' | 'partners', targetLang: string): Promise<any> {
        // 1. Fetch Entity
        const docRef = db.collection(collection).doc(entityId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error(`${collection} entity ${entityId} not found`);
        }

        const data = doc.data() as any;

        // 2. Check if translation exists
        if (data.translations && data.translations[targetLang]) {
            console.log(`Returning cached translation for ${collection} ${entityId} in ${targetLang}`);
            // Merge translated fields over original fields
            return { ...data, ...data.translations[targetLang], original: data };
        }

        // 3. Perform Lazy Translation
        console.log(`Lazy translating ${collection} ${entityId} to ${targetLang}...`);

        let translatedFields: Record<string, string> = {};

        if (collection === 'solutions') {
            translatedFields = await this.translateSolutionFields(data, targetLang);
        } else if (collection === 'partners') {
            translatedFields = await this.translatePartnerFields(data, targetLang);
        }

        // 4. Save to DB
        // Using set with merge to avoid overwriting other fields
        await docRef.set({
            translations: {
                [targetLang]: translatedFields
            }
        }, { merge: true });

        // 5. Return Merged
        return { ...data, ...translatedFields, original: data };
    }

    private async translateSolutionFields(data: any, targetLang: string): Promise<Record<string, string>> {
        const fieldsToTranslate = ['name', 'summary', 'detail', 'benefit', 'costAndEffort', 'returnOnInvestment']; // Key text fields
        const result: Record<string, string> = {};

        // Parallel translation requests (or could be batched in one prompt)
        // For better quality/context, let's do a single prompt for structured translation

        const prompt = `
        You are a professional translator. Translate the following fields of a Solution into ${targetLang}.
        Maintain the original meaning and tone.
        
        Fields to translate:
        Name: ${data.name || ''}
        Summary: ${data.summary || ''}
        Detail: ${data.detail || ''}
        Benefit: ${data.benefit || ''}
        CostAndEffort: ${data.costAndEffort || ''}
        
        Return the result as a valid JSON object with the same keys: name, summary, detail, benefit, costAndEffort.
        `;

        try {
            const translationResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: prompt,
                output: { format: 'json' } // Request JSON output
            });

            const outputFunc = translationResult.output;
            // Genkit unstructured output might need parsing if format:json isn't strictly schema-bound, 
            // but 2.5-flash with 'json' hints usually works. 
            // Ideally we use structured output schema.

            return outputFunc || {};
        } catch (e) {
            console.error('Batch translation failed, falling back to field-by-field or original', e);
            // Fallback: empty (so we return original text for now) or individual calls?
            // For MVP, if batch fails, we just don't save translations yet.
            return {};
        }
    }

    private async translatePartnerFields(data: any, targetLang: string): Promise<Record<string, string>> {
        const prompt = `
        Translate the following Partner fields into ${targetLang}.
        
        Organization Name: ${data.organizationName || ''}
        (Note: If organization name is a proper noun that shouldn't change, keep it or transliterate it).
        
        Return JSON with key: organizationName.
        `;

        try {
            const translationResult = await ai.generate({
                model: 'vertexai/gemini-2.5-flash',
                prompt: prompt,
                output: { format: 'json' }
            });
            return translationResult.output || {};
        } catch (e) {
            console.error('Partner translation failed', e);
            return {};
        }
    }
    // Lazy Translation for List Items (In-Memory Check & Update)
    async ensureTranslation(data: any, collection: 'solutions' | 'partners', targetLang: string): Promise<any> {
        // 1. Check if translation exists in the data object provided
        if (data.translations && data.translations[targetLang]) {
            // Already cached
            return { ...data, ...data.translations[targetLang], original: data };
        }

        // 2. Perform Lazy Translation
        // Note: We don't fetch from DB here because 'data' is assumed to be the latest from the list query.
        // However, strictly speaking, we should operate on a fresh doc, but for list performance we trust 'data'.

        console.log(`List-view lazy translating ${collection} ${data.id} to ${targetLang}...`);

        let translatedFields: Record<string, string> = {};

        if (collection === 'solutions') {
            translatedFields = await this.translateSolutionFields(data, targetLang);
        } else if (collection === 'partners') {
            translatedFields = await this.translatePartnerFields(data, targetLang);
        }

        // 3. Save to DB asynchronously (or await if we want to be sure)
        // We await to ensure the user gets the result now.
        if (data.id) {
            try {
                await db.collection(collection).doc(data.id).set({
                    translations: {
                        [targetLang]: translatedFields
                    }
                }, { merge: true });
            } catch (e) {
                console.error(`Failed to save translation for ${collection} ${data.id}`, e);
            }
        }

        // 4. Return Merged
        return { ...data, ...translatedFields, original: data };
    }
}

export const translationService = new TranslationService();
