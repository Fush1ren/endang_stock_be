export type StockIn = {
    id: string;
    quantity: number;
    storeId: string;
    productId: string;
    userId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export type StockOut = {
    id: string;
    quantity: number;
    storeId: string;
    productId: string;
    userId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}


export interface GetStockInSelect {
    id: true,
    transactionCode: true,
    date: true,
    createdAt: true,
    updatedAt: true,
    toWarehouse: true,
    toStore: {
        select: {
            id: true,
            name: true,
        }
    },
    createdBy: {
        select: {
            id: true,
            name: true,
        }
    },
    updatedBy: {
        select: {
            id: true,
            name: true,
        }
    },
    StockInDetail: {
        select: {
            productId: true,
            quantity: true,
        }
    }
}

export interface BodyUpdateStockIn {
    date: string;
    toWarehouse: boolean;
    toStoreId?: number;
    products: {
        productId: number;
        quantity: number;
    }[];
}

export type StockItem = {
    id: number;
    status: "available" | "lowStock" | "outOfStock";
    store?: { name: string };
    product: { name: string };
}

export type DataNotification = Omit<StockItem, "store" | 'id'> & {
    location: string;
};

export interface StockNotification {
    length: number;
    data: DataNotification[];
    lowStock: {
        productName: string;
        quantity: number;
        location: string;
    }[];
    outOfStock: {
        productName: string;
        location: string;
    }[];
}