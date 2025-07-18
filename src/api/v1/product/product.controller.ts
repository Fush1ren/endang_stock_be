import { Request, Response } from "express";
import { prismaClient } from "../../config";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { QueryParams } from "../../dto";
import { BodyCreateProduct, BodyDeleteProductData, BodyUpdateProduct } from "../../../dto/product.dto";
import { capitalizeWords, parseSort } from "../../utils/data.util";
import { productById, productList } from "../../dto/product.dto";
// import { ErrorResponse } from "../../dto/data.dto";
import { notificationStockLinearLength } from "../stock/stock.service";
import { emitStockNotificationLength } from "../../socket/socketInstance";
import { Prisma, StatusProduct } from "@prisma/client";
import { ProductOptionsFilter } from "../../types/product.type";
import { User } from "../../types";


const setStatus = (quantity: number, threshold: number): StatusProduct => {
    if (quantity <= 0) {
        return 'outOfStock';
    }
    else if (quantity <= threshold) {
        return 'lowStock';
    }
    return 'available';
}

// const checkDataProduct = async (id: number[]): Promise<ErrorResponse | undefined> => {
//     const existingStockInDetail = await prismaClient.stockInDetail.findMany({
//         where: {
//             id_product: {
//                 in: id,
//             }
//         },
//         select: {
//             id_product: true,
//         }
//     });

//     const existingStockOutDetail = await prismaClient.stockOutDetail.findMany({
//         where: {
//             id_product: {
//                 in: id,
//             }
//         },
//         select: {
//             id_product: true,
//         }
//     });

//     const existingStockMutationDetail = await prismaClient.stockMutationDetail.findMany({
//         where: {
//             id_product: {
//                 in: id,
//             }
//         },
//         select: {
//             id_product: true,
//         }
//     });

//     const existingStoreStock = await prismaClient.storeStock.findMany({
//         where: {
//             id_product: {
//                 in: id,
//             }
//         },
//         select: {
//             id_product: true,
//         }
//     });

//     const existingWarehouseStock = await prismaClient.wareHouseStock.findMany({
//         where: {
//             id_product: {
//                 in: id,
//             }
//         },
//         select: {
//             id_product: true,
//         }
//     });
//     if (existingStockInDetail.length > 0 || existingStockOutDetail.length > 0 || existingStoreStock.length > 0 || existingWarehouseStock.length > 0 || existingStockMutationDetail.length > 0) {
//         return {
//             status: 400,
//             message: 'Cannot delete product that is used in stock transactions',
//         };
//     }
//     return undefined;
// }

export const createProduct = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const body = req.body as BodyCreateProduct;

        if (!body) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            responseAPI(res, {
                status: 400,
                message: 'Name is required',
            });
            return;
        }

        if (!body.code || typeof body.code !== 'string' || body.code.trim() === '') {
            responseAPI(res, {
                status: 400,
                message: 'Code is required',
            });
            return;
        }

        if (!body.unitId || typeof body.unitId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Unit ID is required',
            });
            return;
        }

        if (!body.categoryId || typeof body.categoryId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Category ID is required',
            });
            return;
        }

        if (!body.brandId || typeof body.brandId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Brand ID is required',
            });
            return;
        }

        const existingProductCode = await prismaClient.product.findUnique({
            where: {
                code: body.code.trim(),
            },
        });

        if (existingProductCode) {
            responseAPI(res, {
                status: 400,
                message: 'Product with this code already exists',
            });
            return;
        }

        const existingProductName = await prismaClient.product.findUnique({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        if (existingProductName) {
            responseAPI(res, {
                status: 400,
                message: 'Product with this name already exists',
            });
            return;
        }

        await prismaClient.product.create({
            data: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
                code: body.code.trim(),
                description: body.description ? body.description.trim() : null,
                category: {
                  connect: {
                    id_category: body.categoryId,
                  }
                },
                unit: {
                    connect: {
                        id_unit: body.unitId,
                    }
                },
                brand: {
                    connect: {
                        id_brand: body.brandId,
                    }
                },
            }
        });
        responseAPI(res, {
            status: 201,
            message: "Product created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const id = Number(req.params.id);
        const body = req.body as BodyUpdateProduct;

        if (!body || !id) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
            responseAPI(res, {
                status: 400,
                message: 'Name is required',
            });
            return;
        }

        if (!body.code || typeof body.code !== 'string' || body.code.trim() === '') {
            responseAPI(res, {
                status: 400,
                message: 'Code is required',
            });
            return;
        }

        if (!body.unitId || typeof body.unitId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Unit ID is required',
            });
            return;
        }

        if (!body.categoryId || typeof body.categoryId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Category ID is required',
            });
            return;
        }

        if (!body.brandId || typeof body.brandId !== 'number') {
            responseAPI(res, {
                status: 400,
                message: 'Brand ID is required',
            });
            return;
        }
        
        const existingProduct = await prismaClient.product.findUnique({
            where: {
                id_product: id,
            },
        });

        if (!existingProduct) {
            responseAPI(res, {
                status: 404,
                message: 'Product not found',
            });
            return;
        }

        const existingProductName = await prismaClient.product.findUnique({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        if (existingProductName && existingProductName.id_product !== id) {
            responseAPI(res, {
                status: 400,
                message: 'Product with this name already exists',
            });
            return;
        }
        
        await prismaClient.product.update({
            where: {
                id_product: id,
            },
            data: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
                code: body.code.trim(),
                description: body.description,
                category: body.categoryId ? {
                    connect: {
                        id_category: body.categoryId,
                    }
                } : undefined,
                unit: body.unitId ? {
                    connect: {
                        id_unit: body.unitId,
                    }
                } : undefined,
                brand: body.brandId ? {
                    connect: {
                        id_brand: body.brandId,
                    }
                } : undefined,
            }
        });

        responseAPI(res, {
            status: 200,
            message: 'Product updated successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const body = req.body as BodyDeleteProductData;

        if (!body) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (!body.id || !Array.isArray(body.id) || body.id.length === 0) {
            responseAPI(res, {
                status: 400,
                message: 'Product IDs are required',
            });
            return;
        }

        const existingProducts = await prismaClient.product.findMany({
            where: {
                id_product: {
                    in: body.id,
                }
            }
        });

        if (existingProducts.length === 0) {
            responseAPI(res, {
                status: 404,
                message: 'No products found with the provided IDs',
            });
            return;
        }

        // const errorResponse = await checkDataProduct(body.id);
        // if (errorResponse) {
        //     responseAPI(res, {
        //         status: errorResponse.status,
        //         message: errorResponse.message,
        //     });
        //     return;
        // }

        // await prismaClient.product.deleteMany({
        //     where: {
        //         id_product: {
        //             in: body.id,
        //         }
        //     }
        // });

        await prismaClient.$transaction(async (prisma) => {
            for (const productId of body.id) {
                // Hapus dari store stock & warehouse stock
                await prisma.storeStock.deleteMany({
                    where: { id_product: productId },
                });

                await prisma.wareHouseStock.deleteMany({
                    where: { id_product: productId },
                });

                // ---- STOCK IN ----
                const stockInDetails = await prisma.stockInDetail.findMany({
                    where: { id_product: productId },
                    select: { id_stock_in: true },
                });

                const stockIns = await prisma.stockIn.findMany({
                    where: {
                        id_stock_in: { in: stockInDetails.map((d) => d.id_stock_in) },
                    },
                    select: {
                        id_stock_in: true,
                        StockInDetail: { select: { id_product: true } },
                    },
                });

                // Hapus stockIn jika hanya punya 1 detail
                for (const stock of stockIns) {
                    if (stock.StockInDetail.length === 1) {
                        await prisma.stockIn.delete({
                        where: { id_stock_in: stock.id_stock_in },
                        });
                    }
                }

                await prisma.stockInDetail.deleteMany({
                    where: { id_product: productId },
                });

                // ---- STOCK OUT ----
                const stockOutDetails = await prisma.stockOutDetail.findMany({
                    where: { id_product: productId },
                    select: { id_stock_out: true },
                });

                const stockOuts = await prisma.stockOut.findMany({
                    where: {
                        id_stock_out: { in: stockOutDetails.map((d) => d.id_stock_out) },
                    },
                    select: {
                        id_stock_out: true,
                        StockOutDetail: { select: { id_product: true } },
                    },
                });

                for (const stock of stockOuts) {
                    if (stock.StockOutDetail.length === 1) {
                        await prisma.stockOut.delete({
                        where: { id_stock_out: stock.id_stock_out },
                        });
                    }
                }

                await prisma.stockOutDetail.deleteMany({
                    where: { id_product: productId },
                });

                // ---- STOCK MUTATION ----
                const stockMutationDetails = await prisma.stockMutationDetail.findMany({
                    where: { id_product: productId },
                    select: { id_stock_mutation: true },
                });

                const stockMutations = await prisma.stockMutation.findMany({
                    where: {
                        id_stock_mutation: {
                        in: stockMutationDetails.map((d) => d.id_stock_mutation),
                        },
                    },
                    select: {
                        id_stock_mutation: true,
                        StockMutationDetail: { select: { id_product: true } },
                    },
                });

                for (const stock of stockMutations) {
                    if (stock.StockMutationDetail.length === 1) {
                        await prisma.stockMutation.delete({
                        where: { id_stock_mutation: stock.id_stock_mutation },
                        });
                    }
                }

                await prisma.stockMutationDetail.deleteMany({
                    where: { id_product: productId },
                });

                // ---- DELETE PRODUCT ----
                await prisma.product.delete({
                    where: { id_product: productId },
                });
            }
        });

        responseAPI(res, {
            status: 200,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const getAllProducts = async (req: Request, res: Response) => {
  try {
        const queryParams = req.query as QueryParams;
        const search = queryParams.search?.toString().trim();

        let where: any = {};

        // Search (case-insensitive) di beberapa field dan relasi
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { brand: { name: { contains: search, mode: 'insensitive' } } },
                { category: { name: { contains: search, mode: 'insensitive' } } },
                { unit: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Filter merek (brand)
        if (queryParams.brand) {
            const brands = JSON.parse(queryParams.brand as string) as string[];
            if (Array.isArray(brands) && brands.length > 0) {
                where.brand = {
                    id_brand: {
                        in: brands,
                    }
                };
            }
        }

        // Filter kategori (category)
        if (queryParams.category) {
            const categories = JSON.parse(queryParams.category as string) as string[];
            if (Array.isArray(categories) && categories.length > 0) {
                where.category = {
                id_category: {
                    in: categories,
                }
                };
            }
        }

        // Filter satuan (unit)
        if (queryParams.unit) {
            const units = JSON.parse(queryParams.unit as string) as string[];
            if (Array.isArray(units) && units.length > 0) {
                where.unit = {
                id_unit: {
                    in: units,
                }
                };
            }
        }

        // Filter createdAt
        if (queryParams.createdAt) {
            const createdAt = JSON.parse(queryParams.createdAt as string) as string[];
            const start = createdAt[0] ? new Date(createdAt[0]) : null;
            const end = createdAt[1] ? new Date(createdAt[1]) : null;
            if (start && end) {
                where.createdAt = {};
                if (start) {
                    start.setDate(start.getDate() + 1);
                    start.setUTCHours(0, 0, 0, 0);
                    where.createdAt.gte = start;
                }
                if (end) {
                    end.setDate(end.getDate() + 1);
                    end.setUTCHours(23, 59, 59, 999);
                    where.createdAt.lte = end;
                }
            }
        }

        // Filter updatedAt
        if (queryParams.updatedAt) {
            const updatedAt = JSON.parse(queryParams.updatedAt as string) as string[];

            const start = updatedAt[0] ? new Date(updatedAt[0]) : null;
            const end = updatedAt[1] ? new Date(updatedAt[1]) : null;
            if (start && end) {
                where.updatedAt = {};
                if (start) {
                    start.setDate(start.getDate() + 1)
                    start.setUTCHours(0, 0, 0, 0);
                    where.updatedAt.gte = start;
                }
                if (end) {
                    end.setDate(end.getDate() + 1);
                    end.setUTCHours(23, 59, 59, 999);
                    where.updatedAt.lte = end;
                }
            }
        }
        
        // Build query
        let queryTable: any = {
            where,
            select: {
                id_product: true,
                name: true,
                code: true,
                description: true,
                threshold: true,
                createdAt: true,
                updatedAt: true,
                category: {
                    select: {
                        id_category: true,
                        name: true,
                    },
                },
                unit: {
                    select: {
                        id_unit: true,
                        name: true,
                    },
                },
                brand: {
                    select: {
                        id_brand: true,
                        name: true,
                    },
                },
            },
        };

        // Sorting
        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
         queryTable.orderBy = orderBy;
        }

        // Pagination
        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage, paramLimit);
            queryTable.skip = page.skip;
            queryTable.take = page.take;
        }

        // Fetch
        const products = await prismaClient.product.findMany(queryTable);
        const totalRecords = await prismaClient.product.count({ where });
        const data = productList(products as any);
        responseAPITable(res, {
            status: 200,
            message: "Products retrieved successfully",
            data: {
                totalRecords,
                data: data,
            },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: 'Product ID is required',
            });
            return;
        }

        const product = await prismaClient.product.findUnique({
            where: {
                id_product: id,
            },
            select: {
                id_product: true,
                name: true,
                code: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                category: {
                    select: {
                        id_category: true,
                        name: true,
                    }
                },
                unit: {
                    select: {
                        id_unit: true,
                        name: true,
                    }
                },
                brand: {
                    select: {
                        id_brand: true,
                        name: true,
                    }
                },
            }
        });

        if (!product) {
            responseAPI(res, {
                status: 404,
                message: 'Product not found',
            });
            return;
        }

        const data = productById(product as any);

        responseAPIData(res, {
            status: 200,
            message: "Product retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getNextIndex = async (_req: Request, res: Response) => {
    try {
        const lastProduct = await prismaClient.product.findFirst({
            orderBy: {
                id_product: 'desc',
            },
            select: {
                id_product: true,
            },
        });

        const nextIndex = lastProduct ? lastProduct.id_product + 1 : 1;

        responseAPIData(res, {
            status: 200,
            message: "Next index retrieved successfully",
            data: { nextIndex },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getProductDropdown = async (_req: Request, res: Response) => {
    try {
        const products = await prismaClient.product.findMany({
            select: {
                id_product: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        const data = products.map(product => ({
            id: product.id_product,
            name: product.name,
        })).sort((a, b) => a.name.localeCompare(b.name));

        responseAPIData(res, {
            status: 200,
            message: "Products retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getOptionsProduct = async (req: Request, res: Response) => {
    try {
        const options = req.query as ProductOptionsFilter;
        
        let select: Prisma.ProductSelect = {};

        if (options.brand) {
            select.brand = {
                select: {
                    id_brand: true,
                    name: true,
                }
            };
        }

        if (options.category) {
            select.category = {
                select: {
                    id_category: true,
                    name: true,
                }
            };
        }

        if (options.unit) {
            select.unit = {
                select: {
                    id_unit: true,
                    name: true,
                }
            };
        }

        if (!options.brand && !options.category && !options.unit) {
            responseAPIData(res, {
                status: 200,
                message: "Products Options retrieved successfully",
                data: {
                    brand: [],
                    category: [],
                    unit: [],
                },
            });
            return;
        }

        const products = await prismaClient.product.findMany({
            select: select ?? {},
            orderBy: {
                name: 'asc',
            },
        });

        const getUniqueOptions = <T extends { label: string | null; value: string | number | null }>(items: T[]) => {
            const seen = new Map<T['value'], T>();
            for (const item of items) {
                if (item.value && !seen.has(item.value)) {
                    seen.set(item.value, item);
                }
            }
            return Array.from(seen.values());
        };

        const data = {
            brand: options?.brand ? getUniqueOptions(
                products.map((p) => ({
                    label: p.brand?.name ?? '',
                    value: p.brand?.id_brand ?? '',
                }))
            ) : [],
            category: options?.category ? getUniqueOptions(
                products.map((p) => ({
                    label: p.category?.name ?? '',
                    value: p.category?.id_category ?? '',
                }))
            ) : [],
            unit: options?.unit ? getUniqueOptions(
                products.map((p) => ({
                    label: p.unit?.name ?? '',
                    value: p.unit?.id_unit ?? '',
                }))
            ) : [],
        };

        responseAPIData(res, {
            status: 200,
            message: "Products Options retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const updateProductThreshold = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const id = Number(req.params.id);
        const body = req.body as { threshold: number };

        if (!body || !id) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (typeof body.threshold !== 'number' || body.threshold < 0) {
            responseAPI(res, {
                status: 400,
                message: 'Threshold must be a non-negative number',
            });
            return;
        }

        const existingProduct = await prismaClient.product.findUnique({
            where: {
                id_product: id,
            },
        });

        if (!existingProduct) {
            responseAPI(res, {
                status: 404,
                message: 'Product not found',
            });
            return;
        }

        await prismaClient.product.update({
            where: {
                id_product: id,
            },
            data: {
                threshold: body.threshold,
            }
        });

        // update status of product on store and warehouse stock based on new threshold
        const storeStocks = await prismaClient.storeStock.findFirst({
            where: {
                id_product: id,
            },
        });

        const warehouseStocks = await prismaClient.wareHouseStock.findFirst({
            where: {
                id_product: id,
            },
        });

        const threshold = body.threshold;


        if (storeStocks) {
            await prismaClient.storeStock.update({
                where: {
                    id_store_stock: storeStocks.id_store_stock,
                },
                data: {
                    status: setStatus(storeStocks.quantity, threshold),
                }
            });
        }

        if (warehouseStocks) {
            await prismaClient.wareHouseStock.update({
                where: {
                    id_warehouse_stock: warehouseStocks.id_warehouse_stock,
                },
                data: {
                    status: setStatus(warehouseStocks.quantity, threshold),
                }
            });
        }

        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);

        responseAPI(res, {
            status: 200,
            message: 'Product threshold updated successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}