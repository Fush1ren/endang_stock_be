export interface IQuery<T = any, U = any> {
    take?: number;
    skip?: number;
    select?: T;
    where?: any;
    include?: any;
    orderBy?: U;
}

export interface InsertUpdateQuery {
    take?: any;
    skip?: any;
    select?: any;
    data: any;
}

export interface ISortParams {
    sortBy?: string
    sortOrder?: string | number
}

export interface PayloadGenerateToken {
    id: number;
    username: string;
}