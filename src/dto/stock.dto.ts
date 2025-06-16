import { StatusProduct } from "@prisma/client";
import { QueryParams } from "./api.dto";

export interface BodyCreateStoreStock {
    quantity: number;
    status: StatusProduct;
    storeId: number;
    productId: number;
}

export type BodyCreateWareHouseStock = Omit<BodyCreateStoreStock, 'storeId'>;

export type ProductStockIn = Omit<BodyCreateStoreStock, 'storeId' | 'status'>;;

export type ProductStockMutation = Omit<BodyCreateStoreStock, 'storeId' | 'status'>;

export type ProductStockOut = ProductStockIn;

export interface BodyCreateStockIn {
    transactionCode: string;
    date: Date | string;
    toWarehouse: boolean;
    storeId: number;
    products: ProductStockIn[];
}

export interface BodyCreateStockOut {
    transactionCode: string;
    date: Date | string;
    storeId: number;
    products: ProductStockOut[];
}

export interface BodyCreateStockMutation {
    transactionCode: string;
    date: Date | string;
    fromWarehouse: boolean;
    fromStoreId: number | null;
    toStoreId: number;
    products: ProductStockMutation[];
}


export interface GetStockInQueryParams extends QueryParams {
    transactionCode?: string;
    toStoreIds?: string;
    productIds?: string;
    date?: string;
    quantity?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface GetStockOutParams extends QueryParams {
    transactionCode?: string;
    storeIds?: string;
    productIds?: string;
    date?: string;
    quantity?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface GetStockMutationParams extends QueryParams {
    transactionCode?: string;
    fromStoreIds?: string;
    toStoreIds?: string;
    productIds?: string;
    date?: string;
    quantity?: string;
    updatedAt?: string;
    createdAt?: string;
}