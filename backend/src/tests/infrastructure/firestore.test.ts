
import { FirestoreRepository } from '../../infrastructure/repositories/firestore.repository';
import { db, resetMocks, mockAdd, mockGet, mockUpdate, mockDoc, mockCollection } from '../mocks';

// Mock Config
jest.mock('../../config/firebase', () => ({
    db: require('../mocks').db,
}));

// Test Implementation
interface TestEntity {
    id?: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

class TestRepo extends FirestoreRepository<TestEntity> {
    constructor() {
        super('test_collection');
    }
    // Implement abstract
    async searchByVector(vector: number[], limit: number, filter?: any) {
        return [];
    }

    async searchByFuzzy(term: string, limit: number, filter?: any) {
        return [];
    }
}

describe('FirestoreRepository', () => {
    let repo: TestRepo;

    beforeEach(() => {
        resetMocks();
        // Ensure doc() returns an object with an id
        mockDoc.mockReturnValue({
            id: 'generated-id',
            get: mockGet,
            update: mockUpdate,
            set: mockUpdate,
            delete: jest.fn()
        });
        repo = new TestRepo();
    });

    describe('create', () => {
        it('should add document with timestamps and return item', async () => {
            const data = { name: 'Test' };
            const newItem = await repo.create(data);

            expect(mockCollection).toHaveBeenCalledWith('test_collection');
            expect(mockAdd).not.toHaveBeenCalled(); // create uses doc().set() in current impl
            // Checked implementation: doc().set(item)
            expect(mockDoc).toHaveBeenCalled(); // Generates ID
            expect(newItem.id).toBeDefined();
            expect(newItem.createdAt).toBeDefined();
        });
    });

    describe('get', () => {
        it('should return null if not exists', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const result = await repo.get('1');
            expect(result).toBeNull();
        });

        it('should return data if exists', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                id: '1',
                data: () => ({ name: 'Found' })
            });
            const result = await repo.get('1');
            expect(result).toEqual({ id: '1', name: 'Found' });
        });
    });

    describe('list', () => {
        it('should return array of items', async () => {
            mockGet.mockResolvedValue({
                docs: [
                    { id: '1', data: () => ({ name: 'A' }) },
                    { id: '2', data: () => ({ name: 'B' }) }
                ]
            });

            const results = await repo.list();
            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('A');
        });
    });

    describe('update', () => {
        it('should calling update with timestamp', async () => {
            await repo.update('1', { name: 'Updated' });
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Updated',
                updatedAt: expect.any(String)
            }));
        });
    });

    describe('delete', () => {
        // delete is reserved word in JS but method name is delete
        it('should call delete on doc reference', async () => {
            // In mocks.ts: doc() returns object with delete? 
            // Checking mocks.ts: doc returns { get, update, set }. Missing delete.
            // I need to add delete to the mock in this test file or update mocks.ts.
            // I'll update the mock local to this test or rely on standard jest.fn() if not defined?
            // "mocks.ts" defines mockDoc returning object.

            // Let's override the mockDoc return for this test specifically or update mocks.ts?
            // Updating mocks.ts is safer but I can't edit it right now easily (context switch).
            // I will extend the return value in the test setup.

            const mockDelete = jest.fn();
            mockDoc.mockReturnValue({
                get: mockGet,
                update: mockUpdate,
                set: mockUpdate,
                delete: mockDelete
            });

            await repo.delete('1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
