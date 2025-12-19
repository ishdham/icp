import { IUserRepository, IRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';
import { Solution } from '../../../domain/entities/solution';

export class ManageBookmarksUseCase {
    constructor(
        private userRepo: IUserRepository,
        private solutionRepo: IRepository<Solution> // To verify solution exists/get name
    ) { }

    async addBookmark(uid: string, solutionId: string): Promise<void> {
        const solution = await this.solutionRepo.get(solutionId);
        if (!solution) throw new Error('Solution not found');

        const bookmark = {
            solutionId,
            bookmarkedAt: new Date().toISOString()
        };
        await this.userRepo.addBookmark(uid, bookmark);
    }

    async removeBookmark(uid: string, solutionId: string): Promise<void> {
        await this.userRepo.removeBookmark(uid, solutionId);
    }

    // List bookmarks logic often handled by generic GetUser or specialized query.
    // Given the route was doing pagination on the array, we might keep that logic in the Route or move here.
    // For now, Keep simple add/remove.
}
