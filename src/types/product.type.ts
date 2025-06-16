import { StatusProduct } from "@prisma/client";

type Product = {
    id: string;
    name: string;
    description: string | null;
    unit: string;
    status: StatusProduct;
    createdAt: Date | string;
    updatedAt: Date | string;
    userId: string;
    categoryId: string;
}

export {
    Product,
}