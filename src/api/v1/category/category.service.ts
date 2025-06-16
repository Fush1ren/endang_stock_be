import { PayloadCategory } from "../../types/category.type";

export const getCategoryList = (data: PayloadCategory[]) => {
    return data.map((category) => ({
        id: category.id_category,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
    }));
}