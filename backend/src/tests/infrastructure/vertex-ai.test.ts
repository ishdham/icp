
import { VertexAIService } from '../../infrastructure/services/vertex-ai.service';

// Mock Genkit and VertexAI plugins
// We need to define the mocks such that we can access them in tests
const mockGenerate = jest.fn();
const mockEmbed = jest.fn();
const mockGenerateStream = jest.fn();

jest.mock('genkit', () => ({
    genkit: jest.fn(() => ({
        generate: (...args: any[]) => mockGenerate(...args),
        embed: (...args: any[]) => mockEmbed(...args),
        generateStream: (...args: any[]) => mockGenerateStream(...args)
    }))
}));

jest.mock('@genkit-ai/vertexai', () => ({
    vertexAI: jest.fn(),
    textEmbedding004: 'mock-embedder'
}));

describe('VertexAIService', () => {
    let service: VertexAIService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new VertexAIService();
    });

    describe('researchTopic', () => {
        it('should call ai.generate and return text', async () => {
            mockGenerate.mockResolvedValue({ text: 'Research Result' });

            const result = await service.researchTopic('Topic');

            expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
                prompt: expect.stringContaining('Topic')
            }));
            expect(result).toBe('Research Result');
        });
    });

    describe('extractStructuredData', () => {
        it('should call ai.generate with schema and return output', async () => {
            const mockOutput = { field: 'value' };
            mockGenerate.mockResolvedValue({ output: mockOutput });
            const mockSchema = {} as any;

            const result = await service.extractStructuredData('Some text', mockSchema);

            expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
                prompt: expect.stringContaining('Some text'),
                output: expect.objectContaining({ schema: mockSchema })
            }));
            expect(result).toEqual(mockOutput);
        });
    });

    describe('generateEmbedding', () => {
        it('should call ai.embed and return embedding array', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            mockEmbed.mockResolvedValue([{ embedding: mockEmbedding }]);

            const result = await service.generateEmbedding('Text');

            expect(mockEmbed).toHaveBeenCalledWith(expect.objectContaining({
                content: 'Text'
            }));
            expect(result).toEqual(mockEmbedding);
        });
    });

    describe('translateText', () => {
        it('should call ai.generate and return translated text', async () => {
            mockGenerate.mockResolvedValue({ text: 'Translated' });

            const result = await service.translateText('Original', 'Spanish');

            expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
                prompt: expect.stringContaining('Translate the following'),
            }));
            expect(result).toBe('Translated');
        });
    });
});
