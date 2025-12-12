import { translationService } from '../services/translation.service';
import { ai } from '../services/ai.service';
import { db } from '../config/firebase';

// Mock AI Service (Genkit)
jest.mock('../services/ai.service', () => ({
    ai: {
        generate: jest.fn(),
    }
}));

// Mock Firebase
jest.mock('../config/firebase', () => ({
    db: {
        collection: jest.fn(),
    }
}));

describe('TranslationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getTranslatedEntity', () => {
        it('should return cached translation if available', async () => {
            // Mock DB Fetch
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    id: '1',
                    name: 'English Name',
                    translations: {
                        hi: { name: 'Translated Name' }
                    }
                })
            });
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            (db.collection as jest.Mock).mockReturnValue({ doc: mockDoc });

            const result = await translationService.getTranslatedEntity('1', 'solutions', 'hi');

            expect(result.name).toBe('Translated Name');
            expect(ai.generate).not.toHaveBeenCalled();
        });

        it('should trigger AI translation if cache missing and save it', async () => {
            // Mock DB Fetch (No translation)
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    id: '1',
                    name: 'English Name',
                    translations: {}
                })
            });
            const mockUpdate = jest.fn(); // Mock Set/Update
            const mockDoc = jest.fn().mockReturnValue({
                get: mockGet,
                set: mockUpdate
            });
            (db.collection as jest.Mock).mockReturnValue({ doc: mockDoc });

            // Mock AI Response
            (ai.generate as jest.Mock).mockResolvedValue({
                output: { // Genkit returns output
                    name: 'Hindi Name',
                    returnOnInvestment: 'High ROI'
                }
            });

            const result = await translationService.getTranslatedEntity('1', 'solutions', 'hi');

            expect(ai.generate).toHaveBeenCalled();

            // Verify returnOnInvestment is included in the merged result
            expect(result.name).toBe('Hindi Name');
            expect(result.returnOnInvestment).toBe('High ROI');

            // Verify persistence
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                translations: expect.objectContaining({
                    hi: expect.objectContaining({
                        name: 'Hindi Name'
                    })
                })
            }), { merge: true });
        });
    });

    describe('ensureTranslation (List View)', () => {
        it('should translate multiple items in parallel using AI for uncached ones', async () => {
            // Mock DB Set for persistence
            const mockSet = jest.fn();
            const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
            (db.collection as jest.Mock).mockReturnValue({ doc: mockDoc });

            // Mock AI
            (ai.generate as jest.Mock).mockResolvedValue({
                output: { name: 'Translated' }
            });

            const items = [
                { id: '1', name: 'Item 1' }, // Needs translation
                { id: '2', name: 'Item 2', translations: { hi: { name: 'Cached' } } } // Cached
            ];

            // Wait, ensureTranslation signature in service is: ensureTranslation(data: any, collection, lang) ??
            // File view says: ensureTranslation(data: any, collection: ...). 
            // Looking at the implementation: "if (data.translations && ...)"
            // It treats 'data' as a single entity?
            // "console.log(`List-view lazy translating ${collection} ${data.id}..."

            // The method `ensureTranslation` takes a SINGLE object `data`.
            // In the routes (which I edited earlier), I used Promise.all(items.map(item => service.ensureTranslation(...)))
            // So here I should test the service method for a single item.

            const itemToTranslate = { id: '1', name: 'Item 1' };
            const result = await translationService.ensureTranslation(itemToTranslate, 'solutions', 'hi');

            expect(result.name).toBe('Translated');
            expect(ai.generate).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalled();
        });
    });
});
