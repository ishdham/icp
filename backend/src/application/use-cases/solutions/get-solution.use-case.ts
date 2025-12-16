import { Solution } from '../../../domain/entities/solution';
import { IRepository } from '../../../domain/interfaces/repository.interface';

export class GetSolutionUseCase {
    constructor(private solutionRepo: IRepository<Solution>) { }

    async execute(id: string): Promise<Solution | null> {
        return this.solutionRepo.get(id);
    }
}
