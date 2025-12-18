import { Solution } from '../../../domain/entities/solution';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { IAIService } from '../../../domain/interfaces/ai.interface';

export class SearchSolutionsUseCase {
    constructor(
        private solutionRepo: IRepository<Solution>,
        private aiService: IAIService
    ) { }

    async execute(query: string, options: { limit?: number; filters?: any; mode?: 'semantic' | 'fuzzy' } = {}): Promise<Solution[]> {
        const limit = options.limit || 20;
        const mode = options.mode || 'semantic'; // Default to semantic

        if (!query || query.trim() === '') {
            return this.solutionRepo.list(options.filters);
        }

        let results;
        if (mode === 'fuzzy') {
            // Fast In-Memory Fuzzy Search
            results = await this.solutionRepo.searchByFuzzy(query, limit, options.filters);
        } else {
            // Deep Semantic Search
            const vector = await this.aiService.generateEmbedding(query);
            results = await this.solutionRepo.searchByVector(vector, limit, options.filters);
        }

        return results.map(r => r.item);
    }
}
