import { Partner } from '../../../domain/entities/partner';
import { IRepository } from '../../../domain/interfaces/repository.interface';
import { IAIService } from '../../../domain/interfaces/ai.interface';

export class SearchPartnersUseCase {
    constructor(
        private partnerRepo: IRepository<Partner>,
        private aiService: IAIService
    ) { }

    async execute(query: string, options: { limit?: number; filters?: any; mode?: 'semantic' | 'fuzzy' } = {}): Promise<Partner[]> {
        const limit = options.limit || 20;
        const mode = options.mode || 'semantic';

        if (!query || query.trim() === '') {
            return this.partnerRepo.list(options.filters);
        }

        let results;
        if (mode === 'fuzzy') {
            results = await this.partnerRepo.searchByFuzzy(query, limit, options.filters);
        } else {
            const vector = await this.aiService.generateEmbedding(query);
            results = await this.partnerRepo.searchByVector(vector, limit, options.filters);
        }

        return results.map(r => r.item);
    }
}
