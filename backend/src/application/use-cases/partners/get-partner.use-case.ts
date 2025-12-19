import { Partner } from '../../../domain/entities/partner';
import { IRepository } from '../../../domain/interfaces/repository.interface';

export class GetPartnerUseCase {
    constructor(private partnerRepo: IRepository<Partner>) { }

    async execute(id: string): Promise<Partner | null> {
        return this.partnerRepo.get(id);
    }
}
