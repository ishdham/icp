import { Solution } from '../../../domain/entities/solution';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { IAIService } from '../../../domain/interfaces/ai.interface';

export class SearchSolutionsUseCase {
    constructor(
        private solutionRepo: IRepository<Solution>,
        private aiService: IAIService
    ) { }

    async execute(query: string, options: { limit?: number; filters?: any } = {}): Promise<Solution[]> {
        const limit = options.limit || 20;

        if (!query || query.trim() === '') {
            return this.solutionRepo.list(options.filters);
        }

        // Semantic Search
        const vector = await this.aiService.generateEmbedding(query);
        const results = await this.solutionRepo.searchByVector(vector, limit, options.filters);

        return results.map(r => r.item);
    }
}
