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
export const aiService = new VertexAIService();

// 2. Repositories (Inject Services)
export const solutionRepository = new FirestoreSolutionRepository(aiService);
export const partnerRepository = new FirestorePartnerRepository(aiService);
export const ticketRepository = new FirestoreTicketRepository();
export const userRepository = new FirestoreUserRepository();

// 3. Use Cases (Inject Repositories and Services)
export const createSolutionUseCase = new CreateSolutionUseCase(solutionRepository, partnerRepository, ticketRepository);
export const searchSolutionsUseCase = new SearchSolutionsUseCase(solutionRepository, aiService);
export const getSolutionUseCase = new GetSolutionUseCase(solutionRepository);
export const updateSolutionUseCase = new UpdateSolutionUseCase(solutionRepository);
