import { IProduct, IProductById, IProductDropdown, IProductIndex, IProductList } from "../types/product.type";

export const productList = (data: IProduct[]): IProductList[] => {
    return data.map((item) => ({
        id: item.id_product,
        name: item.name,
        code: item.code,
        description: item.description,
        createdAt: item.createdAt,
        threshold: item.threshold,
        updatedAt: item.updatedAt,
        category: {
            id: item.category.id_category,
            name: item.category.name
        },
        unit: {
            id: item.unit.id_unit,
            name: item.unit.name
        },
        brand: {
            id: item.brand.id_brand,
            name: item.brand.name
        },
    }));
};

export const productDropdown = (data: IProduct[]): IProductDropdown[] => {
    return data.map((item) => ({
        id: item.id_product,
        name: item.name
    }));
}

export const productById = (data: IProduct): IProductById => {
    return {
        id: data.id_product,
        name: data.name,
        code: data.code,
        description: data.description,
        brand: {
            id: data.brand.id_brand,
            name: data.brand.name
        },
        category: {
            id: data.category.id_category,
            name: data.category.name
        },
        unit: {
            id: data.unit.id_unit,
            name: data.unit.name
        },
        threshold: data.threshold,
    };
}

export const productIndex = (data: IProduct): IProductIndex => {
    const nextIndex = data ? data.id_product + 1 : 1;
    return {
        nextIndex: nextIndex
    };
}