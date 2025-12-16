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
}
