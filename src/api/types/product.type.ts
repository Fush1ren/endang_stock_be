export interface IProduct {
    id_product: number;
    name: string;
    code: string;
    description: string;
    threshold: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    categoryId: number;
    unitId: number;
    category: {
        id_category: number;
        name: string;
    };
    unit: {
        id_unit: number;
        name: string;
    };
    brand: {
        id_brand: number;
        name: string;
    };
}

export interface IProductList {
    id: number;
    name: string;
    code: string;
    description: string;
    threshold: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    category: {
        id: number;
        name: string;
    }
    unit: {
        id: number;
        name: string;
    };
    brand: {
        id: number;
        name: string;
    }
};

export interface IProductDropdown {
    id: number;
    name: string;
}

export interface IProductById {
    id: number;
    name: string;
    code: string;
    description: string;
    brand: {
        id: number;
        name: string;
    }
    category: {
        id: number;
        name: string;
    };
    unit: {
        id: number;
        name: string;
    };
    threshold: number;
}

export interface IProductIndex {
    nextIndex: number;
}

export interface ProductOptionsFilter {
    [key: string]: string | number | boolean;
    brand: string;
    category: string;
    unit: string;
}

export interface PayloadBrand {
    id_brand: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}