import { FirestoreRepository } from './firestore.repository';
import { Partner } from '../../domain/entities/partner';
import { IAIService } from '../../domain/interfaces/ai.interface';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';

interface VectorDocument {
    id: string;
    embedding: number[];
    metadata: Partner;
}

export class FirestorePartnerRepository extends FirestoreRepository<Partner> {
    private vectorIndex: VectorDocument[] = [];
    private aiService: IAIService;
    private isIndexInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    constructor(aiService: IAIService) {
        super('partners');
        this.aiService = aiService;
    }

    private async ensureIndex() {
        if (this.isIndexInitialized) return;
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            console.log('Initializing Partner Vector Index...');

            const partners = await this.list();

            for (const partner of partners) {
                try {
                    if (!partner.id) continue;

                    const content = `Partner: ${partner.organizationName} (ID: ${partner.id}). Type: ${partner.entityType}.`;
                    const embedding = await this.aiService.generateEmbedding(content);

                    this.vectorIndex.push({
                        id: partner.id,
                        embedding,
                        metadata: partner
                    });
                } catch (error) {
                    console.error(`Failed to index partner ${partner.id}`, error);
                }
            }
            this.isIndexInitialized = true;
        })();

        return this.initializationPromise;
    }

    async searchByFuzzy(term: string, limit: number, filter?: FilterOptions): Promise<SearchResult<Partner>[]> {
        await this.ensureIndex();

        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const results = this.vectorIndex
            .filter(doc => {
                if (filter?.status && doc.metadata.status !== filter.status) return false;

                return regex.test(doc.metadata.organizationName);
            })
            .map(doc => ({
                item: doc.metadata,
                score: 1
            }))
            .slice(0, limit);

        return results;
    }

    async searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<Partner>[]> {
        await this.ensureIndex();

        let candidates = this.vectorIndex;
        // Basic filtering if needed

        const scored = candidates.map(doc => {
            const score = this.cosineSimilarity(vector, doc.embedding);
            return { item: doc.metadata, score };
        });

        return scored
            .filter(r => r.score > 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
