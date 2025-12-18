// Mock Firebase Admin
export const mockCollection = jest.fn();
export const mockDoc = jest.fn();
export const mockAdd = jest.fn();
export const mockGet = jest.fn();
export const mockUpdate = jest.fn();
export const mockWhere = jest.fn();
export const mockLimit = jest.fn();
export const mockVerifyIdToken = jest.fn();

export const mockCount = jest.fn();

const mockFirestore = {
    collection: mockCollection.mockReturnValue({
        add: mockAdd,
        doc: mockDoc.mockReturnValue({
            id: 'mock-doc-id',
            get: mockGet,
            update: mockUpdate,
            set: mockUpdate, // Reuse update for set
        }),
        where: mockWhere.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        offset: jest.fn().mockReturnThis(), // Add offset here too
        get: mockGet,
        count: mockCount.mockReturnValue({ // Add count -> get
            get: mockGet
        }),
    }),
    runTransaction: jest.fn((callback) => callback({
        get: mockGet,
        update: mockUpdate,
    })),
};

const mockAuth = {
    verifyIdToken: mockVerifyIdToken,
};

export const db = mockFirestore;
export const auth = mockAuth;

// Reset mocks helper
export const resetMocks = () => {
    mockCollection.mockReset();
    mockDoc.mockReset();
    mockAdd.mockReset();
    mockGet.mockReset();
    mockUpdate.mockReset();
    mockWhere.mockReset();
    mockLimit.mockReset();
    mockVerifyIdToken.mockReset();

    // Default behaviors
    mockCollection.mockReturnValue({
        add: mockAdd,
        doc: mockDoc.mockReturnValue({
            id: 'mock-doc-id',
            get: mockGet,
            update: mockUpdate,
            set: mockUpdate, // Reuse update for set
        }),
        where: mockWhere.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        offset: jest.fn().mockReturnThis(), // Add offset
        get: mockGet,
        count: mockCount.mockReturnValue({ get: mockGet }),
    });

    // Prevent crashes if mockGet runs out of values
    mockGet.mockResolvedValue({ exists: false, data: () => undefined, docs: [] });
};
