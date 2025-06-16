import { QueryParams } from "./api.dto";

export interface GetStoreParams extends QueryParams {
    name?: string;
    updatedAt?: string;
    createdAt?: string;
}