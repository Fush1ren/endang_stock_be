type APIResponse = {
    status: number;
    message: string;
}

type APIDataResponse<T> = {
    status: number;
    message: string;
    data: T;
}

type QueryParams = {
    [key: string]: any;
    page?: number;
    limit?: number;
    search?: string;
}

export {
    APIResponse,
    APIDataResponse,
    QueryParams
}