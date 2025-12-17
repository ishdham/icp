import { db } from '../config/firebase';
import { aiService } from '../container';
import { SolutionSchema } from '@shared/schemas/solutions';
import { PartnerSchema } from '@shared/schemas/partners';

export class TranslationService {

    // Core Translation using Genkit (Gemini)
    async translateText(text: string, targetLanguage: string): Promise<string> {
        return aiService.translateText(text, targetLanguage);
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

        // Filter data to only text fields relevant for translation
        const dataToTranslate: Record<string, string> = {};
        for (const key of fieldsToTranslate) {
            if (data[key]) {
                dataToTranslate[key] = data[key];
            }
        }

        if (Object.keys(dataToTranslate).length === 0) return {};

        try {
            return await aiService.translateStructured(dataToTranslate, targetLang);
        } catch (e) {
            console.error('Batch translation failed', e);
            return {};
        }
    }

    private async translatePartnerFields(data: any, targetLang: string): Promise<Record<string, string>> {
        const dataToTranslate = {
            organizationName: data.organizationName
        };

        try {
            return await aiService.translateStructured(dataToTranslate, targetLang);
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
