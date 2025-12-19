// Container for Dependency Injection
import { FirebaseAuthService } from './infrastructure/services/firebase-auth.service';
import { VertexAIService } from './infrastructure/services/vertex-ai.service';
import { FirestoreSolutionRepository } from './infrastructure/repositories/solution.repository';
import { CreateSolutionUseCase } from './application/use-cases/solutions/create-solution.use-case';
import { SearchSolutionsUseCase } from './application/use-cases/solutions/search-solutions.use-case';
import { GetSolutionUseCase } from './application/use-cases/solutions/get-solution.use-case';
import { UpdateSolutionUseCase } from './application/use-cases/solutions/update-solution.use-case';
import { FirestorePartnerRepository } from './infrastructure/repositories/partner.repository';
import { FirestoreTicketRepository } from './infrastructure/repositories/ticket.repository';
import { FirestoreUserRepository } from './infrastructure/repositories/user.repository';

// 1. Services
export const authService = new FirebaseAuthService();
const aiProvider = new VertexAIService(); // Infrastructure Provider
import { AIService } from './services/ai.service'; // Import Class (Note: ai.service.ts no longer exports instance)
export const aiService = new AIService(aiProvider); // Application Service with DI

// 2. Repositories (Inject Services)
// Use the Application Service `aiService` which implements the high-level logic (e.g. vector store management), 
// BUT Repositories previously used `IAIService` interface which matched `VertexAIService`.
// `AIService` (App Layer) ALSO implements vector logic but might not implement `IAIService` interface strictly or extends it?
// Let's check `AIService` definition. It doesn't implement `IAIService`.
// However, `FirestoreSolutionRepository` expects `IAIService` to generate embeddings.
// `vertex-ai.service.ts` implements `IAIService`.
// `ai.service.ts` uses `IAIService` provider.
// If Repository needs embeddings, it should probably usage the PROVIDER directly if it just needs raw embeddings, 
// OR the App Service should expose `generateEmbedding`.
// `AIService` (App Layer) has `generateEmbedding` (private?). 
// Let's look at `ai.service.ts` again. `generateEmbedding` was private.
// The Repository needs public access.
// DECISION: Repositories should strictly speak to Infrastructure (Provider) for raw capabilities (Embeddings),
// OR App Layer should expose it.
// Refactoring for CLEAN: Repos shouldn't depend on "App Services". They depend on "Infra Providers".
// So I will inject `aiProvider` (VertexAIService) into Repositories.

export const solutionRepository = new FirestoreSolutionRepository(aiProvider);
export const partnerRepository = new FirestorePartnerRepository(aiProvider);
export const ticketRepository = new FirestoreTicketRepository();
export const userRepository = new FirestoreUserRepository();

// 3. Use Cases (Inject Repositories and Services)
export const createSolutionUseCase = new CreateSolutionUseCase(solutionRepository, partnerRepository, ticketRepository);
export const searchSolutionsUseCase = new SearchSolutionsUseCase(solutionRepository, aiProvider); // Search Use Case also used generatedEmbedding direct? Or via Repo? 
// SearchUseCase calls `this.aiService.generateEmbedding(query)`.
// So it needs `IAIService`. `aiProvider` fits.
export const getSolutionUseCase = new GetSolutionUseCase(solutionRepository);
export const updateSolutionUseCase = new UpdateSolutionUseCase(solutionRepository, partnerRepository);
