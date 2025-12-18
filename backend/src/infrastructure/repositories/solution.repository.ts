import { FirestoreRepository } from './firestore.repository';
import { Solution } from '../../domain/entities/solution';
import { IAIService } from '../../domain/interfaces/ai.interface';
import { SearchResult, FilterOptions } from '../../domain/interfaces/repository.interface';
import { db } from '../../config/firebase';

interface VectorDocument {
    id: string;
    embedding: number[];
    metadata: Solution;
}

export class FirestoreSolutionRepository extends FirestoreRepository<Solution> {
    private vectorIndex: VectorDocument[] = [];
    private aiService: IAIService;
    private isIndexInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    constructor(aiService: IAIService) {
        super('solutions');
        this.aiService = aiService;
    }

    private async ensureIndex() {
        if (this.isIndexInitialized) return;
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            console.log('Initializing Solution Vector Index...');

            const solutions = await this.list(); // Fetch all

            for (const sol of solutions) {
                try {
                    // Ensure ID is present
                    if (!sol.id) continue;

                    const content = `Solution: ${sol.name} (ID: ${sol.id}). Domain: ${sol.domain}. Summary: ${sol.summary}. Benefit: ${sol.benefit}.`;
                    const embedding = await this.aiService.generateEmbedding(content);

                    this.vectorIndex.push({
                        id: sol.id,
                        embedding,
                        metadata: sol
                    });
                } catch (error) {
                    console.error(`Failed to index solution ${sol.id}`, error);
                }
            }
            this.isIndexInitialized = true;
            console.log(`Solution Index initialized with ${this.vectorIndex.length} items.`);
        })();

        return this.initializationPromise;
    }

    async create(data: Solution): Promise<Solution> {
        const created = await super.create(data);
        // Update Index
        if (this.isIndexInitialized && created.id) {
            const content = `Solution: ${created.name} (ID: ${created.id}). Domain: ${created.domain}. Summary: ${created.summary}. Benefit: ${created.benefit}.`;
            const embedding = await this.aiService.generateEmbedding(content);
            this.vectorIndex.push({
                id: created.id,
                embedding,
                metadata: created
            });
        }
        return created;
    }

    async update(id: string, data: Partial<Solution>): Promise<void> {
        await super.update(id, data);
        // Re-indexing on update is expensive, maybe just remove old and re-add if full update?
        // For MVP, if criticial fields change, we should re-embed.
        // Let's defer complexity: Invalidate index or naive update.
        // For now: No-op on index update, or just update metadata if embedding fields didn't change (hard to know).
        // Safest: Do nothing for now or reload specific item if this was critical. 
        // User didn't ask for real-time index updates, but let's be nice.
        if (this.isIndexInitialized) {
            const index = this.vectorIndex.findIndex(i => i.id === id);
            if (index !== -1) {
                // Fetch full new doc to be safe
                const updatedDoc = await this.get(id);
                if (updatedDoc) {
                    const content = `Solution: ${updatedDoc.name} (ID: ${updatedDoc.id}). Domain: ${updatedDoc.domain}. Summary: ${updatedDoc.summary}. Benefit: ${updatedDoc.benefit}.`;
                    const embedding = await this.aiService.generateEmbedding(content);
                    this.vectorIndex[index] = {
                        id: updatedDoc.id!,
                        embedding,
                        metadata: updatedDoc
                    };
                }
            }
        }
    }

    async searchByFuzzy(term: string, limit: number, filter?: FilterOptions): Promise<SearchResult<Solution>[]> {
        await this.ensureIndex();

        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const results = this.vectorIndex
            .filter(doc => {
                // Filter handling
                if (filter?.status && doc.metadata.status !== filter.status) return false;
                if (filter?.domain && doc.metadata.domain !== filter.domain) return false;

                // Fuzzy Match on Name, Summary, or Domain
                return regex.test(doc.metadata.name) ||
                    regex.test(doc.metadata.summary || '') ||
                    regex.test(doc.metadata.domain);
            })
            .map(doc => ({
                item: doc.metadata,
                score: 1 // Ideal match
            }))
            .slice(0, limit);

        return results;
    }

    async searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<Solution>[]> {
        await this.ensureIndex();

        let candidates = this.vectorIndex;

        // Apply filters
        if (filter) {
            if (filter.domain) {
                candidates = candidates.filter(doc => doc.metadata.domain === filter.domain);
            }
            if (filter.status) {
                candidates = candidates.filter(doc => doc.metadata.status === filter.status);
            }
            if (filter.proposedByUserId) {
                candidates = candidates.filter(doc => doc.metadata.proposedByUserId === filter.proposedByUserId);
            }
        }

        // Cosine Similarity
        const scored = candidates.map(doc => {
            const score = this.cosineSimilarity(vector, doc.embedding);
            return { item: doc.metadata, score };
        });

        // Sort and Limit
        return scored
            .filter(r => r.score > 0.4) // Min score threshold hardcoded for now matching old logic
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
