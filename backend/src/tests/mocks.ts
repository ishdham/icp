// Mock Firebase Admin
export const mockCollection = jest.fn();
export const mockDoc = jest.fn();
export const mockAdd = jest.fn();
export const mockGet = jest.fn();
export const mockUpdate = jest.fn();
export const mockWhere = jest.fn();
export const mockLimit = jest.fn();
export const mockVerifyIdToken = jest.fn();

const mockFirestore = {
    collection: mockCollection.mockReturnValue({
        add: mockAdd,
        doc: mockDoc.mockReturnValue({
            get: mockGet,
            update: mockUpdate,
            set: mockUpdate, // Reuse update for set
        }),
        where: mockWhere.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        get: mockGet,
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
    mockCollection.mockClear();
    mockDoc.mockClear();
    mockAdd.mockClear();
    mockGet.mockClear();
    mockUpdate.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockVerifyIdToken.mockClear();

    // Default behaviors
    mockCollection.mockReturnValue({
        add: mockAdd,
        doc: mockDoc.mockReturnValue({
            get: mockGet,
            update: mockUpdate,
            set: mockUpdate,
        }),
        where: mockWhere.mockReturnThis(),
        limit: mockLimit.mockReturnThis(),
        get: mockGet,
    });
};
