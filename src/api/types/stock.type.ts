export interface WarehouseOptionsFilter {
    [key: string]: string | number | boolean;
    product: string;
    brand: string;
}

export interface StoreStockFilter {
    [key: string]: string | number | boolean;
    product: string;
    brand: string;
}

export interface PayloadStoreStockList {
    id_store_stock: number;
    quantity: number;
    status: string;
    product: {
        id_product: number;
        name: string;
        brand: {
            id_brand: number;
            name: string;
        }
    };
    stock: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface BodyUpdateStock {
    date: Date | string;
    products: {
        id: number;
        quantity: number;
    }[];
}