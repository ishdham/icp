import { AIService } from '../../services/ai.service';
import { IAIService } from '../../domain/interfaces/ai.interface';

// Mock IAIService
const mockProvider: jest.Mocked<IAIService> = {
    generateResponse: jest.fn(),
    researchTopic: jest.fn(),
    extractStructuredData: jest.fn(),
    generateEmbedding: jest.fn(),
    chatStream: jest.fn(),
    translateText: jest.fn(),
    translateStructured: jest.fn()
};

describe('AIService RAG Logic', () => {
    let aiService: AIService;

    beforeEach(() => {
        jest.clearAllMocks();
        aiService = new AIService(mockProvider);
        // Bypass initialization for search test by mocking vectorStore or search method?
        // Actually we want to test chatStream which calls search.
        // We can mock search method on aiService instance to isolate chat logic? 
        // Or we can populate vectorStore.

        // Let's mock the private search method or vectorStore.
        // Since we can't easily mock private methods in TS without casting, 
        // we'll populate the vectorStore manually if possible, or cast to any.
        (aiService as any).vectorStore = [
            {
                id: '123',
                type: 'solution',
                content: 'Summary content',
                metadata: {
                    id: '123',
                    name: 'Test Solution',
                    status: 'MATURE',
                    domain: 'Health',
                    summary: 'A great solution',
                    detail: 'Detailed description',
                    benefit: 'Saves lives',
                    costAndEffort: 'Low',
                    returnOnInvestment: 'High',
                    launchYear: 2020,
                    targetBeneficiaries: ['Children']
                },
                embedding: [0.1, 0.2]
            }
        ];
        (aiService as any).isInitialized = true;
    });

    test('should rewrite query and use rich context in chatStream', async () => {
        // Setup Mocks
        mockProvider.generateResponse.mockResolvedValue('Refined Query');
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2]); // For search query embedding
        mockProvider.chatStream.mockResolvedValue('AI Response');

        // Execute
        await aiService.chatStream('User query', [{ role: 'user', content: 'User query' }]);

        // Verify Query Rewriting
        expect(mockProvider.generateResponse).toHaveBeenCalledTimes(1);
        expect(mockProvider.generateResponse).toHaveBeenCalledWith(expect.stringContaining('User query'));

        // Verify Search called with REFINED query logic (implicit via embedding generation)
        expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('Refined Query');

        // Verify Context passed to Provider
        // The logic calls provider.chatStream(systemPrompt, refinedQuery, history)
        expect(mockProvider.chatStream).toHaveBeenCalledTimes(1);
        const [systemPrompt, query] = mockProvider.chatStream.mock.calls[0];

        expect(query).toBe('Refined Query');

        // Verify RICH CONTEXT in system prompt
        expect(systemPrompt).toContain('TYPE: Solution');
        expect(systemPrompt).toContain('NAME: Test Solution');
        expect(systemPrompt).toContain('BENEFIT: Saves lives'); // Specific field from formatContext
    });

    test('should fall back to original message on refinement timeout', async () => {
        // Setup Mocks
        // Mock generateResponse to hang
        mockProvider.generateResponse.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('Refined'), 2000)));
        mockProvider.generateEmbedding.mockResolvedValue([0.1, 0.2]);
        mockProvider.chatStream.mockResolvedValue('AI Response');

        // Execute
        await aiService.chatStream('User query', [{ role: 'user', content: 'User query' }]);

        // Verify Search called with ORIGINAL query because refinement timed out
        // The mock provider.generateEmbedding is called with the query used for search.
        expect(mockProvider.generateEmbedding).toHaveBeenCalledWith('User query');
    });
});
