export type APIResponse = {
    status: number;
    message: string;
}

export type APIDataResponse<T> = {
    status: number;
    message: string;
    data: T;
}

export type QueryParams = {
    [key: string]: any;
    page?: number;
    limit?: number;
    search?: string;
}