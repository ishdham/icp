import { IUserRepository } from '../../../domain/interfaces/repository.interface';
import { User } from '../../../domain/entities/user';

export class GetUserUseCase {
    constructor(private userRepo: IUserRepository) { }

    async execute(uid: string): Promise<User | null> {
        return this.userRepo.get(uid);
    }
}
