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

import { CreatePartnerUseCase } from './application/use-cases/partners/create-partner.use-case';
import { SearchPartnersUseCase } from './application/use-cases/partners/search-partners.use-case';
import { GetPartnerUseCase } from './application/use-cases/partners/get-partner.use-case';
import { UpdatePartnerUseCase } from './application/use-cases/partners/update-partner.use-case';

export const createPartnerUseCase = new CreatePartnerUseCase(partnerRepository, ticketRepository);
export const searchPartnersUseCase = new SearchPartnersUseCase(partnerRepository, aiProvider);
export const getPartnerUseCase = new GetPartnerUseCase(partnerRepository);
export const updatePartnerUseCase = new UpdatePartnerUseCase(partnerRepository);

import { CreateTicketUseCase } from './application/use-cases/tickets/create-ticket.use-case';
import { GetTicketUseCase } from './application/use-cases/tickets/get-ticket.use-case';
import { ListTicketsUseCase } from './application/use-cases/tickets/list-tickets.use-case';
import { UpdateTicketUseCase } from './application/use-cases/tickets/update-ticket.use-case';
import { ResolveTicketUseCase } from './application/use-cases/tickets/resolve-ticket.use-case';

export const createTicketUseCase = new CreateTicketUseCase(ticketRepository);
export const getTicketUseCase = new GetTicketUseCase(ticketRepository);
export const listTicketsUseCase = new ListTicketsUseCase(ticketRepository);
export const updateTicketUseCase = new UpdateTicketUseCase(ticketRepository);
export const resolveTicketUseCase = new ResolveTicketUseCase(ticketRepository, solutionRepository, partnerRepository, aiService);

import { SyncUserUseCase } from './application/use-cases/users/sync-user.use-case';
import { GetUserUseCase } from './application/use-cases/users/get-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/users/update-user.use-case';
import { ManageBookmarksUseCase } from './application/use-cases/users/manage-bookmarks.use-case';
import { ListUsersUseCase } from './application/use-cases/users/list-users.use-case';
import { ManageAssociationsUseCase } from './application/use-cases/users/manage-associations.use-case';

export const syncUserUseCase = new SyncUserUseCase(userRepository);
export const getUserUseCase = new GetUserUseCase(userRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository);
export const manageBookmarksUseCase = new ManageBookmarksUseCase(userRepository, solutionRepository);
export const listUsersUseCase = new ListUsersUseCase(userRepository);
export const manageAssociationsUseCase = new ManageAssociationsUseCase(userRepository, partnerRepository, ticketRepository);
