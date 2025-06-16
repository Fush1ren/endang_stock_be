import { PayloadBrand } from "../../types/product.type";

export const getBrandList = (data: PayloadBrand[]) => {
    return data.map((brand) => ({
        id: brand.id_brand,
        name: brand.name,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
    }));
}