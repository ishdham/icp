import { translationService } from '../services/translation.service';
import { ai } from '../services/ai.service';

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

jest.mock('../services/ai.service', () => ({
    ai: {
        generate: jest.fn()
    }
}));

describe('TranslationService', () => {
    it('should translate text using AI', async () => {
        (ai.generate as jest.Mock).mockResolvedValue({ text: 'नमस्ते' });

        const result = await translationService.translateText('Hello', 'hi');
        expect(result).toBe('नमस्ते');
        expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({
            prompt: expect.stringContaining('Translate the following text into hi')
        }));
    });

    // We can add more tests for lazy loading if we mock DB
});
