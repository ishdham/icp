export interface FilterOptions {
    [key: string]: any;
}

export interface SearchResult<T> {
    item: T;
    score: number;
}

export interface IRepository<T> {
    create(data: T): Promise<T>;
    get(id: string): Promise<T | null>;
    update(id: string, data: Partial<T>): Promise<void>;
    list(filter?: FilterOptions): Promise<T[]>;
    delete(id: string): Promise<void>;

    // Semantic Search Support
    searchByVector(vector: number[], limit: number, filter?: FilterOptions): Promise<SearchResult<T>[]>;

    // Fuzzy Search Support (In-Memory)
    searchByFuzzy(term: string, limit: number, filter?: FilterOptions): Promise<SearchResult<T>[]>;
}

export interface TicketComment {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
}

export interface ITicketRepository extends IRepository<any> {
    addComment(ticketId: string, comment: TicketComment): Promise<void>;
}

export interface IUserRepository extends IRepository<any> {
    addBookmark(userId: string, bookmark: any): Promise<void>;
    removeBookmark(userId: string, solutionId: string): Promise<void>;
    updateAssociation(userId: string, association: any): Promise<void>;
    // Generic 'get' covers getting profile.
}
