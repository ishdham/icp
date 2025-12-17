import { translationService } from '../services/translation.service';


jest.mock('../config/firebase', () => ({
    db: {
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                get: jest.fn(),
                update: jest.fn(),
                set: jest.fn()
            })
        })
    }
}));

jest.mock('../container', () => ({
    aiService: {
        translateText: jest.fn(),
        translateStructured: jest.fn()
    }
}));

import { aiService } from '../container';

describe('TranslationService', () => {
    it('should translate text using AI Service', async () => {
        (aiService.translateText as jest.Mock).mockResolvedValue('नमस्ते');

        const result = await translationService.translateText('Hello', 'hi');
        expect(result).toBe('नमस्ते');
        expect(aiService.translateText).toHaveBeenCalledWith('Hello', 'hi');
    });

    // We can add more tests for lazy loading if we mock DB
});
