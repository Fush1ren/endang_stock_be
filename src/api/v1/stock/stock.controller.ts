import { Request, Response } from "express";
import { getPage, responseAPI, responseAPIData, responseAPITable, validateStockInPayload } from "../../utils";
import { prismaClient } from "../../config";
import { IQuery } from "../../types/data.type";
import { BodyCreateStockIn, BodyCreateStockMutation, BodyCreateStockOut, BodyCreateStoreStock, BodyCreateWareHouseStock, GetStockInQueryParams, GetStockMutationParams, GetStockOutParams } from "../../../dto/stock.dto";
import { QueryParams } from "../../dto";
import { validateStockMutationPayload, validateStockOutPayload } from "../../utils/validation";
import { parseSort } from "../../utils/data.util";
import { Prisma, StatusProduct } from "@prisma/client";
import { getStoreStockData, notificationStockLinearLength } from "./stock.service";
import { emitStockNotificationLength } from "../../socket/socketInstance";
import { BodyUpdateStock, StoreStockFilter, WarehouseOptionsFilter } from "../../types/stock.type";
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

export const createStoreStock = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };
        
        const { quantity, status, storeId, productId } = req.body as BodyCreateStoreStock;

        if (!quantity) {
            responseAPI(res, {
                status: 400,
                message: "Quantity is required",
            });
        }

        if (!status) {
            responseAPI(res, {
                status: 400,
                message: "Status is required",
            });
        }

        if (!storeId) {
            responseAPI(res, {
                status: 400,
                message: "Store ID is required",
            });
        }

        if (!productId) {
            responseAPI(res, {
                status: 400,
                message: "Product ID is required",
            });
        }

        await prismaClient.storeStock.create({
            data: {
                quantity: quantity,
                status: status,
                store: {
                    connect: {
                        id_store: storeId,
                    }
                },
                product: {
                    connect: {
                        id_product: productId,
                    }
                },
                
            },
        });

        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);

        responseAPI(res, {
            status: 201,
            message: "Store stock created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        })
    }
}

export const createWarehouseStock = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };
        const { quantity, status, productId } = req.body as BodyCreateWareHouseStock;

        if (!quantity) {
            responseAPI(res, {
                status: 400,
                message: "Quantity is required",
            });
        }

        if (!status) {
            responseAPI(res, {
                status: 400,
                message: "Status is required",
            });
        }

        if (!productId) {
            responseAPI(res, {
                status: 400,
                message: "Product ID is required",
            });
        }

        await prismaClient.wareHouseStock.create({
            data: {
                quantity: quantity,
                status: status,
                product: {
                    connect: {
                        id_product: productId,
                    }
                },
            },
        });

        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);

        responseAPI(res, {
            status: 201,
            message: "Warehouse stock created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const createStockIn = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const body = req.body as BodyCreateStockIn;
        const validation = validateStockInPayload(body);
        if (!validation.valid) {
            responseAPI(res, {
                status: 400,
                message: validation.message as string,
            });
            return;
        }

        const existing = await prismaClient.stockIn.findFirst({
            where: {
                transactionCode: body.transactionCode,
            }
        });

        if (existing) {
            responseAPI(res, {
                status: 400,
                message: "Stock in with this code already exists",
            });
            return;
        }

        for (const item of body.products) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.productId },
            });

            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.productId} does not exist.`,
                });
                return;
            }
        }

        await prismaClient.stockIn.create({
            data: {
                transactionCode: body.transactionCode,
                date: new Date(body.date),
                toWarehouse: body.toWarehouse,
                id_store: body.toWarehouse ? null : body.storeId,
                StockInDetail: {
                    create: body.products.map((product) => ({
                        id_product: product.productId,
                        quantity: product.quantity,
                    })),
                },
                id_user: userReq.id,
            },
            include: {
                StockInDetail: true,
            }
        });

        responseAPI(res, {
            status: 201,
            message: "Stock in created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const verifyStockIn = async (req: Request, res: Response) => {
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
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock in ID is required",
            });
            return;
        }
        const stockIn = await prismaClient.stockIn.findUnique({
            where: { id_stock_in: id },
            include: {
                StockInDetail: true,
            }
        });
        if (!stockIn) {
            responseAPI(res, {
                status: 404,
                message: "Stock in not found",
            });
            return;
        }

        if (stockIn.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Stock in already verified",
            });
            return;
        }

        for (const item of stockIn.StockInDetail) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.id_product },
            });

            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.id_product} does not exist.`,
                });
                return;
            }

            if (stockIn.toWarehouse) {
                const existingStock = await prismaClient.wareHouseStock.findFirst({
                    where: { id_product: item.id_product },
                });

                if (existingStock) {
                    const status = setStatus(existingStock.quantity + item.quantity, product.threshold);
                    await prismaClient.wareHouseStock.update({
                        where: { id_warehouse_stock: existingStock.id_warehouse_stock },
                        data: {
                            quantity: { increment: item.quantity },
                            status: status,
                        },
                    });
                } else {
                    await prismaClient.wareHouseStock.create({
                        data: {
                            id_product: item.id_product,
                            quantity: item.quantity,
                            status: setStatus(item.quantity, product.threshold),
                        },
                    });
                }
            } else {
                const existingStoreStock = await prismaClient.storeStock.findFirst({
                    where: {
                        id_product: item.id_product,
                        id_store: stockIn.id_store!,
                    },
                });

                if (existingStoreStock) {
                    const status = setStatus(existingStoreStock.quantity + item.quantity, product.threshold);
                    await prismaClient.storeStock.update({
                        where: { id_store_stock: existingStoreStock.id_store_stock },
                        data: {
                            quantity: { increment: item.quantity },
                            status: status,
                        },
                    });
                } else {
                    await prismaClient.storeStock.create({
                        data: {
                            id_product: item.id_product,
                            id_store: stockIn.id_store!,
                            quantity: item.quantity,
                            status: setStatus(item.quantity, product.threshold),
                        },
                    });
                }
            }
        }
        await prismaClient.stockIn.update({
            where: { id_stock_in: id },
            data: {
                status: 'completed',
                id_user: userReq.id,
            },
        });
        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);
        responseAPI(res, {
            status: 200,
            message: "Stock in verified successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getStockInNextCode = async (_req: Request, res: Response) => {
    try {
        const lastStockIn = await prismaClient.stockIn.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id_stock_in: true,
            },
        });

        const nextCode = lastStockIn ? lastStockIn.id_stock_in + 1 : 1;

        responseAPIData(res, {
            status: 200,
            message: "Next stock in code retrieved successfully",
            data: { nextCode },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const createStockOut = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const body = req.body as BodyCreateStockOut;

        const validation = validateStockOutPayload(body);
        if (!validation.valid) {
            responseAPI(res, {
                status: 400,
                message: validation.message as string,
            });
            return;
        }

        const existing = await prismaClient.stockOut.findFirst({
            where: {
                transactionCode: body.transactionCode,
            }
        });

        if (existing) {
            responseAPI(res, {
                status: 400,
                message: "Stock out with this code already exists",
            });
            return;
        };

        for (const item of body.products) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.productId },
            });
            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.productId} does not exist.`,
                });
                return;
            }
        }

        await prismaClient.stockOut.create({
            data: {
                transactionCode: body.transactionCode,
                date: new Date(body.date),
                id_store: body.storeId,

                StockOutDetail: {
                    create: body.products.map((product) => ({
                        id_product: product.productId,
                        quantity: product.quantity,
                    })),
                },
                id_user: userReq.id,
            },
            include: {
                StockOutDetail: true,
            }
        });
        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);
        responseAPI(res, {
            status: 201,
            message: "Stock out created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const verifyStockOut = async (req: Request, res: Response) => {
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
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock out ID is required",
            });
            return;
        }
        const stockOut = await prismaClient.stockOut.findUnique({
            where: { id_stock_out: id },
            include: {
                StockOutDetail: true,
            }
        });
        if (!stockOut) {
            responseAPI(res, {
                status: 404,
                message: "Stock out not found",
            });
            return;
        }

        if (stockOut.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Stock out already verified",
            });
            return;
        }

        for (const item of stockOut.StockOutDetail) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.id_product },
            });

            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.id_product} does not exist.`,
                });
                return;
            }

            const existingStoreStock = await prismaClient.storeStock.findFirst({
                where: {
                    id_product: item.id_product,
                    id_store: stockOut.id_store!,
                },
            });

            if (!existingStoreStock || existingStoreStock.quantity < item.quantity) {
                responseAPI(res, {
                    status: 400,
                    message: `Insufficient stock for product ID ${item.id_product}.`,
                });
                return;
            }

            const status = setStatus(existingStoreStock.quantity - item.quantity, product.threshold);
            
            await prismaClient.storeStock.update({
                where: { id_store_stock: existingStoreStock.id_store_stock },
                data: {
                    quantity: { decrement: item.quantity },
                    status: status,
                },
            });
        }
        
        await prismaClient.stockOut.update({
            where: { id_stock_out: id },
            data: {
                status: 'completed',
                id_user: userReq.id,
            },
        });

        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);

        responseAPI(res, {
            status: 200,
            message: "Stock out verified successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getStockOutNextCode = async (_req: Request, res: Response) => {
    try {
        const lastStockOut = await prismaClient.stockOut.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id_stock_out: true,
            },
        });

        const nextCode = lastStockOut ? lastStockOut.id_stock_out + 1 : 1;

        responseAPIData(res, {
            status: 200,
            message: "Next stock out code retrieved successfully",
            data: { nextCode },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const createStockMutation = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const body = req.body as BodyCreateStockMutation;

        const validation = validateStockMutationPayload(body);

        if (!validation.valid) {
            responseAPI(res, {
                status: 400,
                message: validation.message as string,
            });
            return;
        }

        const existing = await prismaClient.stockMutation.findFirst({
            where: {
                transactionCode: body.transactionCode,
            }
        });

        if (existing) {
            responseAPI(res, {
                status: 400,
                message: "Stock mutation with this code already exists",
            });
            return;
        }

        if (body.fromWarehouse && !body.products.every(item => item.productId)) {
            responseAPI(res, {
                status: 400,
                message: "Product ID is required for warehouse stock mutation",
            });
            return;
        }

        if (body.fromWarehouse === false && !body.fromStoreId) {
            responseAPI(res, {
                status: 400,
                message: "From Store ID is required for store stock mutation",
            });
            return;
        }

        if (!body.toStoreId) {
            responseAPI(res, {
                status: 400,
                message: "To Store ID is required for stock mutation",
            });
            return;
        }

        for (const item of body.products) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.productId },
            });

            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.productId} does not exist.`,
                });
                return;
            }

            if (item.quantity <= 0) {
                responseAPI(res, {
                    status: 400,
                    message: `Quantity for product ID ${item.productId} must be greater than zero.`,
                });
                return;
            }

        };
        await prismaClient.stockMutation.create({
            data: {
                transactionCode: body.transactionCode,
                date: new Date(body.date),
                fromWarehouse: body.fromWarehouse,
                id_from_store: body.fromWarehouse ? null : body.fromStoreId,
                id_to_store: body.toStoreId,
                StockMutationDetail: {
                    create: body.products.map((product) => ({
                        id_product: product.productId,
                        quantity: product.quantity,
                    })),
                },
                id_user: userReq.id,
            },
        });
        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);

        responseAPI(res, {
            status: 201,
            message: "Stock mutation created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const verifyStockMutation = async (req: Request, res: Response) => {
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
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock mutation ID is required",
            });
            return;
        }
        const stockMutation = await prismaClient.stockMutation.findUnique({
            where: { id_stock_mutation: id },
            include: {
                StockMutationDetail: true,
            }
        });
        if (!stockMutation) {
            responseAPI(res, {
                status: 404,
                message: "Stock mutation not found",
            });
            return;
        }

        if (stockMutation.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Stock mutation already verified",
            });
            return;
        }

        for (const item of stockMutation.StockMutationDetail) {
            const product = await prismaClient.product.findUnique({
                where: { id_product: item.id_product },
            });

            if (!product) {
                responseAPI(res, {
                    status: 400,
                    message: `Product with ID ${item.id_product} does not exist.`,
                });
                return;
            }

            if (stockMutation.fromWarehouse) {
                const existingWarehouseStock = await prismaClient.wareHouseStock.findFirst({
                    where: { id_product: item.id_product },
                });

                if (!existingWarehouseStock || existingWarehouseStock.quantity < item.quantity) {
                    responseAPI(res, {
                        status: 400,
                        message: `Insufficient warehouse stock for product ID ${item.id_product}.`,
                    });
                    return;
                }

                const toStoreStock = await prismaClient.storeStock.findFirst({
                    where: {
                        id_product: item.id_product,
                        id_store: stockMutation.id_to_store!,
                    },
                });

                const statusWarehouse = setStatus(existingWarehouseStock.quantity - item.quantity, product.threshold);

                if (toStoreStock) {
                    const statusStore = setStatus(toStoreStock.quantity + item.quantity, product.threshold);
                    await prismaClient.storeStock.update({
                        where: { id_store_stock: toStoreStock.id_store_stock },
                        data: {
                            quantity: { increment: item.quantity },
                            status: statusStore,
                        },
                    });
                } else {
                    await prismaClient.storeStock.create({
                        data: {
                            id_product: item.id_product,
                            id_store: stockMutation.id_to_store!,
                            quantity: item.quantity,
                            status: setStatus(item.quantity, product.threshold),
                        },
                    });
                }
                await prismaClient.wareHouseStock.update({
                    where: { id_warehouse_stock: existingWarehouseStock.id_warehouse_stock },
                    data: {
                        quantity: { decrement: item.quantity },
                        status: statusWarehouse,
                    },
                });
            }
            else {
                const fromStoreStock = await prismaClient.storeStock.findFirst({
                    where: {
                        id_product: item.id_product,
                        id_store: stockMutation.id_from_store!,
                    },
                });

                if (!fromStoreStock || fromStoreStock.quantity < item.quantity) {
                    responseAPI(res, {
                        status: 400,
                        message: `Insufficient stock for product ID ${item.id_product} in store ID ${stockMutation.id_from_store}.`,
                    });
                    return;
                }

                const toStoreStock = await prismaClient.storeStock.findFirst({
                    where: {
                        id_product: item.id_product,
                        id_store: stockMutation.id_to_store!,
                    },
                });

                const statusFromStore = setStatus(fromStoreStock.quantity - item.quantity, product.threshold);
                if (toStoreStock) {
                    const statusToStore = setStatus(toStoreStock.quantity + item.quantity, product.threshold);
                    await prismaClient.storeStock.update({
                        where: { id_store_stock: toStoreStock.id_store_stock },
                        data: {
                            quantity: { increment: item.quantity },
                            status: statusToStore,
                        },
                    });
                } else {
                    await prismaClient.storeStock.create({
                        data: {
                            id_product: item.id_product,
                            id_store: stockMutation.id_to_store!,
                            quantity: item.quantity,
                            status: setStatus(item.quantity, product.threshold),
                        },
                    });
                }

                await prismaClient.storeStock.update({
                    where: { id_store_stock: fromStoreStock.id_store_stock },
                    data: {
                        quantity: { decrement: item.quantity },
                        status: statusFromStore,
                    },
                });
            }
        }
        await prismaClient.stockMutation.update({
            where: { id_stock_mutation: id },
            data: {
                status: 'completed',
                id_user: userReq.id,
            },
        });

        const notif = await notificationStockLinearLength();
        emitStockNotificationLength(notif);
        responseAPI(res, {
            status: 200,
            message: "Stock mutation verified successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const deleteStockIn = async (req: Request, res: Response) => {
    try {
       const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock in ID is required",
            });
            return;
        }

        const stockIn = await prismaClient.stockIn.findUnique({
            where: { id_stock_in: id },
            include: {
                StockInDetail: true,
            }
        });

        if (!stockIn) {
            responseAPI(res, {
                status: 404,
                message: "Stock in not found",
            });
            return;
        }

        // Check if stock in is already verified
        if (stockIn.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Cannot delete completed stock in",
            });
            return;
        }

        // Delete stock in details
        await Promise.all(
            stockIn.StockInDetail.map(detail => 
                prismaClient.stockInDetail.delete({
                    where: { id_stock_in_detail: detail.id_stock_in_detail },
                })
            )
        );

        // Delete stock in record
        await prismaClient.stockIn.delete({
            where: { id_stock_in: id },
        });

        responseAPI(res, {
            status: 200,
            message: "Stock in deleted successfully",
        });

    } catch (error) {
        console.error("Error deleting stock in:", error);
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const deleteStockOut = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock out ID is required",
            });
            return;
        }

        const stockOut = await prismaClient.stockOut.findUnique({
            where: { id_stock_out: id },
            include: {
                StockOutDetail: true,
            }
        });

        if (!stockOut) {
            responseAPI(res, {
                status: 404,
                message: "Stock out not found",
            });
            return;
        }

        // Check if stock out is already verified
        if (stockOut.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Cannot delete completed stock out",
            });
            return;
        }

        // Delete stock out details
        await Promise.all(
            stockOut.StockOutDetail.map(detail => 
                prismaClient.stockOutDetail.delete({
                    where: { id_stock_out_detail: detail.id_stock_out_detail },
                })
            )
        );

        // Delete stock out record
        await prismaClient.stockOut.delete({
            where: { id_stock_out: id },
        });

        responseAPI(res, {
            status: 200,
            message: "Stock out deleted successfully",
        });

    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const deleteStockMutation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Stock mutation ID is required",
            });
            return;
        }

        const stockMutation = await prismaClient.stockMutation.findUnique({
            where: { id_stock_mutation: id },
            include: {
                StockMutationDetail: true,
            }
        });

        if (!stockMutation) {
            responseAPI(res, {
                status: 404,
                message: "Stock mutation not found",
            });
            return;
        }

        // Check if stock mutation is already verified
        if (stockMutation.status === 'completed') {
            responseAPI(res, {
                status: 400,
                message: "Cannot delete completed stock mutation",
            });
            return;
        }

        // Delete stock mutation details
        await Promise.all(
            stockMutation.StockMutationDetail.map(detail => 
                prismaClient.stockMutationDetail.delete({
                    where: { id_stock_mutation_detail: detail.id_stock_mutation_detail },
                })
            )
        );

        // Delete stock mutation record
        await prismaClient.stockMutation.delete({
            where: { id_stock_mutation: id },
        });

        responseAPI(res, {
            status: 200,
            message: "Stock mutation deleted successfully",
        });

    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getStockMutationNextCode = async (_req: Request, res: Response) => {
    try {
        const lastStockMutation = await prismaClient.stockMutation.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id_stock_mutation: true,
            },
        });

        const nextCode = lastStockMutation ? lastStockMutation.id_stock_mutation + 1 : 1;

        responseAPIData(res, {
            status: 200,
            message: "Next stock mutation code retrieved successfully",
            data: { nextCode },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllStoreStocks = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryParams;

        let queryTable = {
            select: {
                id_store_stock: true,
                quantity: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                store: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                product: {
                    select: {
                        id_product: true,
                        name: true,
                    }
                },
            }
        } as IQuery;

        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        const storeStocks = await prismaClient.storeStock.findMany(queryTable);
        const totalRecords = await prismaClient.storeStock.count(queryTable.where);

        responseAPITable(res, {
            status: 200,
            message: "Store stocks retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: storeStocks,
            }
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getOptionsStoreStocks = async (req: Request, res: Response) => {
    try  {
        const id = Number(req.params.id);
        const options = req.query as StoreStockFilter;

        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "Store ID is required",
            });
            return;
        }

        if (!options.brand && !options.product) {
            responseAPIData(res, {
                status: 200,
                message: "Store stocks options retrieved successfully",
                data: {
                    brands: [],
                    products: [],
                }
            });
            return;
        }

        const storeStocks = await prismaClient.storeStock.findMany({
            select: {
                id_store_stock: true,
                product: {
                    select: {
                        id_product: true,
                        name: true,
                        brand: {
                            select: {
                                id_brand: true,
                                name: true,
                            }
                        }
                    }
                }
            }
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
            storeStocks.map((stock) => ({
                label: stock?.product?.brand?.name ?? '',
                value: stock?.product?.brand?.id_brand ?? '',
            }))
        ) : [],
            product: options?.product ? getUniqueOptions(
                storeStocks.map((stock) => ({
                    label: stock?.product?.name ?? '',
                    value: stock?.product?.id_product ?? '',
                }))
            ) : [],
        }

        responseAPIData(res, {
            status: 200,
            message: "Store stocks options retrieved successfully",
            data,
        });

    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllWarehouseStocks = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryParams;
        const search = queryParams.search?.toString().trim();

        let where: any = {};

        if (search) {
            where.OR = [
                {
                    product: {
                        code: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }
                },
                {
                    product: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }  
                },
                {
                    product: {
                        brand: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            }
                        }
                    }
                },
            ] as Prisma.WareHouseStockWhereInput;
        }

        if (queryParams.product) {
            const product = JSON.parse(queryParams.product as string) as string[];
            if (Array.isArray(product) && product.length > 0) {
                where.product = {
                    id_product: {
                        in: product,
                    }
                }
            }
        }

        if (queryParams.status) {
            const status = JSON.parse(queryParams.status as string) as string[];
            if (Array.isArray(status) && status.length > 0) {
                where.status = {
                    in: status,
                }
            }
        }

        if (queryParams.brand) {
            const brand = JSON.parse(queryParams.brand as string) as string[];
            if (Array.isArray(brand) && brand.length > 0) {
                where.product = {
                    brand: {
                        id_brand: {
                            in: brand,
                        }
                    }
                }
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

        let queryTable = {
            where,
            select: {
                id_warehouse_stock: true,
                quantity: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                product: {
                    select: {
                        id_product: true,
                        name: true,
                        brand: {
                            select: {
                                id_brand: true,
                                name: true,
                            }
                        }
                    }
                },
            }
        } as IQuery;

        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
            queryTable = {
                ...queryTable,
                orderBy,
            };
        }

         if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        const warehouseStocks = await prismaClient.wareHouseStock.findMany(queryTable);
        const totalRecords = await prismaClient.wareHouseStock.count({ where });

        responseAPITable(res, {
            status: 200,
            message: "Warehouse stocks retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: warehouseStocks,
            }
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getOptionsWarehouseStocks = async (req: Request, res: Response) => {
   try {
    const options = req.query as WarehouseOptionsFilter;

    if (!options.brand && !options.product) {
        responseAPIData(res, {
            status: 200,
            message: "Warehouse stocks options retrieved successfully",
            data: {
                brands: [],
                products: [],
            }
        });
        return;
    }

    const warehouseStocks = await prismaClient.wareHouseStock.findMany({
        select: {
            product: {
                select: {
                    id_product: true,
                    name: true,
                    brand: {
                        select: {
                            id_brand: true,
                            name: true,
                        }
                    }
                }
            }
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
            warehouseStocks.map((stock) => ({
                label: stock?.product?.brand?.name ?? '',
                value: stock?.product?.brand?.id_brand ?? '',
            }))
        ) : [],
        product: options?.product ? getUniqueOptions(
            warehouseStocks.map((stock) => ({
                label: stock?.product?.name ?? '',
                value: stock?.product?.id_product  ?? '',
            }))
        ) : [],
    }

    responseAPIData(res, {
        status: 200,
        message: "Warehouse stocks options retrieved successfully",
        data,
    });
   } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }

}

export const getAllStocksIn = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as GetStockInQueryParams;
        const search = queryParams.search?.toString().trim();
        
        let where: any = {};

        if (search) {
            where.OR = [
                {
                    transactionCode: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    StockInDetail: {
                        some: {
                            product: {
                                name: {
                                    contains: search,
                                    mode: 'insensitive',
                                }
                            }
                        }
                    }
                },
                {
                    user: {
                        name: {
                            contains: search,
                            mode: 'insensitive',    
                        }
                    }
                }
            ] as Prisma.StockInWhereInput;
        }

        if (queryParams.date) {
            const date = JSON.parse(queryParams.date as string) as string[];
            const start = date[0] ? new Date(date[0]) : null;
            const end = date[1] ? new Date(date[1]) : null;
            if (start && end) {
                where.date = {};
                if (start) {
                    start.setDate(start.getDate() + 1);
                    start.setUTCHours(0, 0, 0, 0);
                    where.date.gte = start;
                }
                if (end) {
                    end.setDate(end.getDate() + 1);
                    end.setUTCHours(23, 59, 59, 999);
                    where.date.lte = end;
                }
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

        let queryTable = {
            where,
        } as IQuery;

        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
            queryTable = {
                ...queryTable,
                orderBy,
            };
        }

        // const filter = filterStockIn(queryParams);

        // if (filter && Object.keys(filter).length > 0) {
        //     queryTable = {
        //         ...queryTable,
        //         where: filter,
        //     };
        // }

        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        const sortProduct = {} as {
            product: {
                name?: 'asc' | 'desc'
                quantity?: 'asc' | 'desc'
            }
        }

        if (queryTable?.orderBy?.product) {
            const { name, quantity } = queryTable.orderBy.product;

            sortProduct.product = {
                ...(name && { name }),
                ...(quantity && { quantity }),
            }

            delete queryTable.orderBy.product.name;
            delete queryTable.orderBy.product.quantity;

            if (Object.keys(queryTable.orderBy.product).length === 0) {
                delete queryTable.orderBy.product;
            }
        };

        const stocksIn = await prismaClient.stockIn.findMany({
            where: queryTable.where,
            include: {
                StockInDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: queryTable.orderBy,
        });
        
        const totalRecords = await prismaClient.stockIn.count({
            where: queryTable.where,
        });

        const sortedProductdata = stocksIn.sort((a, b) => {
            const aProduct = a.StockInDetail[0]?.product;
            const bProduct = b.StockInDetail[0]?.product;
            const aQuantity = a.StockInDetail[0]?.quantity ?? 0;
            const bQuantity = b.StockInDetail[0]?.quantity ?? 0;

            // Prioritaskan sorting by name jika ada
            if (sortProduct.product?.name) {
                const direction = sortProduct.product.name === 'asc' ? 1 : -1;
                const compare = (aProduct?.name ?? '').localeCompare(bProduct?.name ?? '');
                if (compare !== 0) return compare * direction;
            }

            // Lanjutkan sorting by quantity jika ada
            if (sortProduct.product?.quantity) {
                const direction = sortProduct.product.quantity === 'asc' ? 1 : -1;
                if (aQuantity !== bQuantity) return (aQuantity - bQuantity) * direction;
            }

            return 0; // no sorting if not defined
        });

        const data = sortedProductdata.map((stock) => ({
            id: stock.id_stock_in,
            transactionCode: stock.transactionCode,
            status: stock.status,
            date: stock.date,
            createdAt: stock.createdAt,
            updatedAt: stock.updatedAt,
            toWarehouse: stock.toWarehouse,
            toStore: stock.toStore,
            products: stock.StockInDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stock.user ? {
                id: stock.user.id_user,
                name: stock.user.name,
            } : null,
        }))

        responseAPITable(res, {
            status: 200,
            message: "Stocks in retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllStocksOut = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as GetStockOutParams;
        const search = queryParams.search?.toString().trim();

        let where: any = {};

        if (search) {
            where.OR = [
                {
                    transactionCode: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    StockOutDetail: {
                        some: {
                            product: {
                                name: {
                                    contains: search,
                                    mode: 'insensitive',
                                }
                            }
                        }
                    }
                },
                {
                    user: {
                        name: {
                            contains: search,
                            mode: 'insensitive',    
                        }
                    }
                }
            ] as Prisma.StockOutWhereInput;
        }

        if (queryParams.date) {
            const date = JSON.parse(queryParams.date as string) as string[];
            const start = date[0] ? new Date(date[0]) : null;
            const end = date[1] ? new Date(date[1]) : null;
            if (start && end) {
                where.date = {};
                if (start) {
                    start.setDate(start.getDate() + 1);
                    start.setUTCHours(0, 0, 0, 0);
                    where.date.gte = start;
                }
                if (end) {
                    end.setDate(end.getDate() + 1);
                    end.setUTCHours(23, 59, 59, 999);
                    where.date.lte = end;
                }
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

        let queryTable = {
            where,
        } as IQuery;

        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
            queryTable = {
                ...queryTable,
                orderBy,
            };
        }

        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        const sortProduct = {} as {
            product: {
                name?: 'asc' | 'desc'
                quantity?: 'asc' | 'desc'
            }
        }

        if (queryTable?.orderBy?.product) {
            const { name, quantity } = queryTable.orderBy.product;

            sortProduct.product = {
                ...(name && { name }),
                ...(quantity && { quantity }),
            }

            delete queryTable.orderBy.product.name;
            delete queryTable.orderBy.product.quantity;

            if (Object.keys(queryTable.orderBy.product).length === 0) {
                delete queryTable.orderBy.product;
            }
        }

        const stocksOut = await prismaClient.stockOut.findMany({
            where: queryTable.where,
            include: {
                StockOutDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: queryTable.orderBy,
        });

        const totalRecords = await prismaClient.stockOut.count({
            where: queryTable.where,
        });

        const sortedProductdata = stocksOut.sort((a, b) => {
            const aProduct = a.StockOutDetail[0]?.product;
            const bProduct = b.StockOutDetail[0]?.product;
            const aQuantity = a.StockOutDetail[0]?.quantity ?? 0;
            const bQuantity = b.StockOutDetail[0]?.quantity ?? 0;

            // Prioritaskan sorting by name jika ada
            if (sortProduct.product?.name) {
                const direction = sortProduct.product.name === 'asc' ? 1 : -1;
                const compare = (aProduct?.name ?? '').localeCompare(bProduct?.name ?? '');
                if (compare !== 0) return compare * direction;
            }

            // Lanjutkan sorting by quantity jika ada
            if (sortProduct.product?.quantity) {
                const direction = sortProduct.product.quantity === 'asc' ? 1 : -1;
                if (aQuantity !== bQuantity) return (aQuantity - bQuantity) * direction;
            }

            return 0; // no sorting if not defined
        });

        const data = sortedProductdata.map((stock) => ({
            id: stock.id_stock_out,
            transactionCode: stock.transactionCode,
            status: stock.status,
            date: stock.date,
            createdAt: stock.createdAt,
            updatedAt: stock.updatedAt,
            fromStore: {
                id: stock.fromStore.id_store,
                name: stock.fromStore.name,
            },
            products: stock.StockOutDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stock.user ? {
                id: stock.user.id_user,
                name: stock.user.name,
            } : null,
        }));

        responseAPITable(res, {
            status: 200,
            message: "Stocks out retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllStocksMutation = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as GetStockMutationParams;
        const search = queryParams.search?.toString().trim();

        let where: any = {};
        
        if (search) {
            where.OR = [
                {
                    transactionCode: {
                        contains: search,
                        mode: 'insensitive',
                    }
                },
                {
                    fromStore: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }
                },
                {
                    toStore: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }
                },
                {
                    StockMutationDetail: {
                        some: {
                            product: {
                                name: {
                                    contains: search,
                                    mode: 'insensitive',
                                }
                            }
                        }
                    }
                },
            ] as Prisma.StockMutationWhereInput[];
        }

        if (queryParams.date) {
            const date = JSON.parse(queryParams.date as string) as string[];
            const start = date[0] ? new Date(date[0]) : null;
            const end = date[1] ? new Date(date[1]) : null;
            if (start && end) {
                where.date = {};
                if (start) {
                    start.setDate(start.getDate() + 1);
                    start.setUTCHours(0, 0, 0, 0);
                    where.date.gte = start;
                }
                if (end) {
                    end.setDate(end.getDate() + 1);
                    end.setUTCHours(23, 59, 59, 999);
                    where.date.lte = end;
                }
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

        let queryTable = {
            where,
            select: {
                id_stock_mutation: true,
                transactionCode: true,
                date: true,
                createdAt: true,
                updatedAt: true,
                fromWarehouse: true,
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                StockMutationDetail: {
                    select: {
                        id_product: true,
                        quantity: true,
                    }
                },
                createdBy: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                },
                updatedBy: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                },
            }
        } as IQuery;

        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
            queryTable = {
                ...queryTable,
                orderBy,
            };
        }

        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        const sortProduct = {} as {
            product: {
                name?: 'asc' | 'desc'
                quantity?: 'asc' | 'desc'
            }
        }

        if (queryTable?.orderBy?.product) {
            const { name, quantity } = queryTable.orderBy.product;

            sortProduct.product = {
                ...(name && { name }),
                ...(quantity && { quantity }),
            }

            delete queryTable.orderBy.product.name;
            delete queryTable.orderBy.product.quantity;

            if (Object.keys(queryTable.orderBy.product).length === 0) {
                delete queryTable.orderBy.product;
            }
        }

        const stocksMutation = await prismaClient.stockMutation.findMany({
            where: queryTable.where,
            include: {
                StockMutationDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: queryTable.orderBy,
        });
        const totalRecords = await prismaClient.stockMutation.count({
            where: queryTable.where,
        });

        const sortedProductdata = stocksMutation.sort((a, b) => {
            const aProduct = a.StockMutationDetail[0]?.product;
            const bProduct = b.StockMutationDetail[0]?.product;
            const aQuantity = a.StockMutationDetail[0]?.quantity ?? 0;
            const bQuantity = b.StockMutationDetail[0]?.quantity ?? 0;

            // Prioritaskan sorting by name jika ada
            if (sortProduct.product?.name) {
                const direction = sortProduct.product.name === 'asc' ? 1 : -1;
                const compare = (aProduct?.name ?? '').localeCompare(bProduct?.name ?? '');
                if (compare !== 0) return compare * direction;
            }

            // Lanjutkan sorting by quantity jika ada
            if (sortProduct.product?.quantity) {
                const direction = sortProduct.product.quantity === 'asc' ? 1 : -1;
                if (aQuantity !== bQuantity) return (aQuantity - bQuantity) * direction;
            }

            return 0; // no sorting if not defined
        });

        const data = sortedProductdata.map((stock) => ({
            id: stock.id_stock_mutation,
            transactionCode: stock.transactionCode,
            status: stock.status,
            date: stock.date,
            createdAt: stock.createdAt,
            updatedAt: stock.updatedAt,
            fromWarehouse: stock.fromWarehouse,
            fromStore: stock.fromStore,
            toStore: stock.toStore,
            products: stock.StockMutationDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stock.user ? {
                id: stock.user.id_user,
                name: stock.user.name,
            } : null,
        }));

        responseAPITable(res, {
            status: 200,
            message: "Stocks mutation retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getStockStoreById = async(req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        const stock = await prismaClient.storeStock.findMany({
            where: { id_store: id },
            include: {
                product: {
                    select: {
                        id_product: true,
                        name: true,
                    }
                },
                store: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
            }
        });

        if (!stock) {
            return responseAPI(res, { status: 404, message: "Stock not found" });
        }

        const data = stock.map((item) => ({
            id: item.id_store_stock,
            quantity: item.quantity,
            status: item.status,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            product: {
                id: item.product.id_product,
                name: item.product.name,
            },
            store: {
                id: item.store.id_store,
                name: item.store.name,
            },
        }));

        responseAPIData(res, {
            status: 200,
            message: "Stock retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStoreStockList = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const queryParams = req.query as QueryParams;
        const search = queryParams.search?.toString().trim();

        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        let where: any = {};

        if (search) {
            where.OR = [
                {
                    product: {
                        code: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }
                }, 
                {
                    product: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        }
                    }
                },
                {
                    product: {
                        brand: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            }
                        }
                    }
                },
            ] as Prisma.StoreStockWhereInput[];
        }

        if (queryParams.product) {
            const product = JSON.parse(queryParams.product as string) as string[];
            if (Array.isArray(product) && product.length > 0) {
                where.product = {
                    id_product: {
                        in: product,
                    }
                }
            }
        }

        if (queryParams.status) {
            const status = JSON.parse(queryParams.status as string) as string[];
            if (Array.isArray(status) && status.length > 0) {
                where.status = {
                    in: status,
                }
            }
        }

        if (queryParams.brand) {
            const brand = JSON.parse(queryParams.brand as string) as string[];
            if (Array.isArray(brand) && brand.length > 0) {
                where.product = {
                    brand: {
                        id_brand: {
                            in: brand,
                        }
                    }
                }
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

        let queryTable = {
            where,
            select: {
                id_store_stock: true,
                quantity: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                store: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                product: {
                    select: {
                        id_product: true,
                        name: true,
                        brand: {
                            select: {
                                id_brand: true,
                                name: true,
                            }
                        },
                    }
                },
            }
        } as IQuery;

        const orderBy = parseSort({
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder,
        });

        if (orderBy) {
            queryTable = {
                ...queryTable,
                orderBy,
            };
        }

        if (queryParams.page || queryParams.limit) {
            const paramPage = queryParams.page ? Number(queryParams.page) : 1;
            const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
            const page = getPage(paramPage,paramLimit);
            queryTable = {
                ...queryTable,
                skip: page.skip,
                take: page.take,
            }
        }

        // const sortProduct = {} as {
        //     product: {
        //         name?: 'asc' | 'desc'
        //         quantity?: 'asc' | 'desc'
        //     }
        // }

        where.id_store = id;

        const storeStocks = await prismaClient.storeStock.findMany(queryTable);
        const totalRecords = await prismaClient.storeStock.count({
            where: queryTable.where,
        });

        const data = getStoreStockData(storeStocks as any);

        responseAPITable(res, {
            status: 200,
            message: "Store stocks retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getWarehouseStockDropdown = async (_req: Request, res: Response) => {
    try {
        const stocks = await prismaClient.wareHouseStock.findMany({
            select: {
                id_warehouse_stock: true,
                product: {
                    select: {
                        id_product: true,
                        name: true,
                    }
                },
                quantity: true,
            },
            orderBy: {
                product: {
                    name: 'asc',
                }
            }
        });

        const dropdownData = stocks.map(stock => ({
            id: stock.id_warehouse_stock,
            name: `${stock.product.name}`,
            quantity: stock.quantity,
        }));

        responseAPIData(res, {
            status: 200,
            message: "Warehouse stock dropdown retrieved successfully",
            data: dropdownData,
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockInById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        const stockIn = await prismaClient.stockIn.findUnique({
            where: { id_stock_in: id },
            include: {
                StockInDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            }
        });

        if (!stockIn) {
            return responseAPI(res, { status: 404, message: "Stock In not found" });
        }

        const data = {
            id: stockIn.id_stock_in,
            transactionCode: stockIn.transactionCode,
            status: stockIn.status,
            date: stockIn.date,
            createdAt: stockIn.createdAt,
            updatedAt: stockIn.updatedAt,
            toWarehouse: stockIn.toWarehouse,
            toStore: stockIn.toStore,
            products: stockIn.StockInDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stockIn.user ? {
                id: stockIn.user.id_user,
                name: stockIn.user.name,
            } : null,
        };

        responseAPIData(res, {
            status: 200,
            message: "Stock In retrieved successfully",
            data
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockOutById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        const stockOut = await prismaClient.stockOut.findUnique({
            where: { id_stock_out: id },
            include: {
                StockOutDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            }
        });

        if (!stockOut) {
            return responseAPI(res, { status: 404, message: "Stock Out not found" });
        }

        const data = {
            id: stockOut.id_stock_out,
            transactionCode: stockOut.transactionCode,
            status: stockOut.status,
            date: stockOut.date,
            createdAt: stockOut.createdAt,
            updatedAt: stockOut.updatedAt,
            fromStore: stockOut.fromStore,
            products: stockOut.StockOutDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stockOut.user ? {
                id: stockOut.user.id_user,
                name: stockOut.user.name,
            } : null,
        };

        responseAPIData(res, {
            status: 200,
            message: "Stock Out retrieved successfully",
            data
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockMutationById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        const stockMutation = await prismaClient.stockMutation.findUnique({
            where: { id_stock_mutation: id },
            include: {
                StockMutationDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            }
        });

        if (!stockMutation) {
            return responseAPI(res, { status: 404, message: "Stock Mutation not found" });
        }

        const data = {
            id: stockMutation.id_stock_mutation,
            transactionCode: stockMutation.transactionCode,
            status: stockMutation.status,
            date: stockMutation.date,
            createdAt: stockMutation.createdAt,
            updatedAt: stockMutation.updatedAt,
            fromWarehouse: stockMutation.fromWarehouse,
            fromStore: stockMutation.fromStore,
            toStore: stockMutation.toStore,
            products: stockMutation.StockMutationDetail.map((detail) => ({
                id: detail.id_product,
                quantity: detail.quantity,
                name: detail.product.name,
            })),
            user: stockMutation.user ? {
                id: stockMutation.user.id_user,
                name: stockMutation.user.name,
            } : null,
        };

        responseAPIData(res, {
            status: 200,
            message: "Stock Mutation retrieved successfully",
            data
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const updateStockIn = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as BodyUpdateStock;
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        if (!body || !body.products || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products are required" });
        }

        if (!body.date) {
            return responseAPI(res, { status: 400, message: "Date is required" });
        }

        if (!Array.isArray(body.products) || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products must be an array" });
        }

        for (const product of body.products) {
            if (!product.id || !product.quantity) {
                return responseAPI(res, { status: 400, message: "Product ID and quantity are required" });
            }
        }

        const stockIn = await prismaClient.stockIn.findUnique({
            where: { id_stock_in: id },
        });

        if (!stockIn) {
            return responseAPI(res, { status: 404, message: "Stock In not found" });
        }

        await prismaClient.$transaction(async (prisma) => {
            // Update StockIn
            await prisma.stockIn.update({
                where: { id_stock_in: id },
                data: {
                    date: new Date(body.date),
                    updatedAt: new Date(),
                }
            });

            // Delete existing StockInDetail
            await prisma.stockInDetail.deleteMany({
                where: { id_stock_in: id },
            });

            // Create new StockInDetail
            const stockInDetails = body.products.map(product => ({
                id_stock_in: id,
                id_product: product.id,
                quantity: product.quantity,
            }));

            await prisma.stockInDetail.createMany({
                data: stockInDetails,
            });
        });
        responseAPI(res, {
            status: 200,
            message: "Stock In updated successfully",
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const updateStockOut = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as BodyUpdateStock;
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        if (!body || !body.products || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products are required" });
        }

        if (!body.date) {
            return responseAPI(res, { status: 400, message: "Date is required" });
        }

        if (!Array.isArray(body.products) || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products must be an array" });
        }

        for (const product of body.products) {
            if (!product.id || !product.quantity) {
                return responseAPI(res, { status: 400, message: "Product ID and quantity are required" });
            }
        }

        const stockOut = await prismaClient.stockOut.findUnique({
            where: { id_stock_out: id },
        });

        if (!stockOut) {
            return responseAPI(res, { status: 404, message: "Stock Out not found" });
        }

        await prismaClient.$transaction(async (prisma) => {
            // Update StockOut
            await prisma.stockOut.update({
                where: { id_stock_out: id },
                data: {
                    date: new Date(body.date),
                    updatedAt: new Date(),
                }
            });

            // Delete existing StockOutDetail
            await prisma.stockOutDetail.deleteMany({
                where: { id_stock_out: id },
            });

            // Create new StockOutDetail
            const stockOutDetails = body.products.map(product => ({
                id_stock_out: id,
                id_product: product.id,
                quantity: product.quantity,
            }));

            await prisma.stockOutDetail.createMany({
                data: stockOutDetails,
            });
        });
        responseAPI(res, {
            status: 200,
            message: "Stock Out updated successfully",
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const updateStockMutation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as BodyUpdateStock;
        if (!id) {
            return responseAPI(res, { status: 400, message: "ID is required" });
        }

        if (!body || !body.products || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products are required" });
        }

        if (!body.date) {
            return responseAPI(res, { status: 400, message: "Date is required" });
        }

        if (!Array.isArray(body.products) || body.products.length === 0) {
            return responseAPI(res, { status: 400, message: "Products must be an array" });
        }

        for (const product of body.products) {
            if (!product.id || !product.quantity) {
                return responseAPI(res, { status: 400, message: "Product ID and quantity are required" });
            }
        }

        const stockMutation = await prismaClient.stockMutation.findUnique({
            where: { id_stock_mutation: id },
        });

        if (!stockMutation) {
            return responseAPI(res, { status: 404, message: "Stock Mutation not found" });
        }

        await prismaClient.$transaction(async (prisma) => {
            // Update StockMutation
            await prisma.stockMutation.update({
                where: { id_stock_mutation: id },
                data: {
                    date: new Date(body.date),
                    updatedAt: new Date(),
                }
            });

            // Delete existing StockMutationDetail
            await prisma.stockMutationDetail.deleteMany({
                where: { id_stock_mutation: id },
            });

            // Create new StockMutationDetail
            const stockMutationDetails = body.products.map(product => ({
                id_stock_mutation: id,
                id_product: product.id,
                quantity: product.quantity,
            }));

            await prisma.stockMutationDetail.createMany({
                data: stockMutationDetails,
            });
        });
        responseAPI(res, {
            status: 200,
            message: "Stock Mutation updated successfully",
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockInReport = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryParams;

        if (!queryParams.month || !queryParams.year) {
            return responseAPIData(res, {
                status: 200,
                message: 'Stock In report retrieved successfully',
                data: {
                    totalRecords: 0,
                    data: [],
                },
            })
        };

        const start = new Date(`${queryParams?.year}-${queryParams.month}-01`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Set to last day of the month

        const stockInReport = await prismaClient.stockIn.findMany({
            where: {
                status: 'completed',
                date: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                StockInDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                date: 'asc',
            }
        });

        const totalRecords = stockInReport.length;

        const productCode = await prismaClient.product.findMany({
            where: {
                id_product: {
                    in: stockInReport.flatMap(stock => stock.StockInDetail.map(detail => detail.id_product)),
                }
            },
            select: {
                id_product: true,
                code: true,
            }
        });

        const productCodeMap = new Map(productCode.map(product => [product.id_product, product.code]));

        const data = stockInReport.map(stock => ({
            id: stock.id_stock_in,
            transactionCode: stock.transactionCode,
            date: stock.date,
            toStore: stock.toStore ? stock.toStore.name : 'Gudang',
            products: stock.StockInDetail.map((detail) => ({
                id: detail.id_product,
                code: productCodeMap.get(detail.id_product) || '-',
                quantity: detail.quantity,
                name: detail.product.name,
            })),
        }));

        responseAPITable(res, {
            status: 200,
            message: "Stock In report retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockOutReport = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryParams;

        if (!queryParams.month || !queryParams.year) {
            return responseAPIData(res, {
                status: 200,
                message: 'Stock Out report retrieved successfully',
                data: {
                    totalRecords: 0,
                    data: [],
                },
            })
        };

        const start = new Date(`${queryParams?.year}-${queryParams.month}-01`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Set to last day of the month

        const stockOutReport = await prismaClient.stockOut.findMany({
            where: {
                status: 'completed',
                date: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                StockOutDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                date: 'asc',
            }
        });

        const totalRecords = stockOutReport.length;

        const productCode = await prismaClient.product.findMany({
            where: {
                id_product: {
                    in: stockOutReport.flatMap(stock => stock.StockOutDetail.map(detail => detail.id_product)),
                }
            },
            select: {
                id_product: true,
                code: true,
            }
        });

        const productCodeMap = new Map(productCode.map(product => [product.id_product, product.code]));

        const data = stockOutReport.map(stock => ({
            id: stock.id_stock_out,
            transactionCode: stock.transactionCode,
            date: stock.date,
            fromStore: stock.fromStore ? stock.fromStore.name : 'Gudang',
            products: stock.StockOutDetail.map((detail) => ({
                id: detail.id_product,
                code: productCodeMap.get(detail.id_product) || '-',
                quantity: detail.quantity,
                name: detail.product.name,
            })),
        }));

        responseAPITable(res, {
            status: 200,
            message: "Stock Out report retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });    
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}

export const getStockMutationReport = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryParams;

        if (!queryParams.month || !queryParams.year) {
            return responseAPIData(res, {
                status: 200,
                message: 'Stock Mutation report retrieved successfully',
                data: {
                    totalRecords: 0,
                    data: [],
                },
            })
        };

        const start = new Date(`${queryParams?.year}-${queryParams.month}-01`);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Set to last day of the month

        const stockMutationReport = await prismaClient.stockMutation.findMany({
            where: {
                status: 'completed',
                date: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                StockMutationDetail: {
                    include: {
                        product: {
                            select: {
                                id_product: true,
                                name: true,
                            }
                        }
                    }
                },
                fromStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                toStore: {
                    select: {
                        id_store: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id_user: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                date: 'asc',
            }
        });

        const totalRecords = stockMutationReport.length;

        const productCode = await prismaClient.product.findMany({
            where: {
                id_product: {
                    in: stockMutationReport.flatMap(stock => stock.StockMutationDetail.map(detail => detail.id_product)),
                }
            },
            select: {
                id_product: true,
                code: true,
            }
        });

        const productCodeMap = new Map(productCode.map(product => [product.id_product, product.code]));

        const data = stockMutationReport.map(stock => ({
            id: stock.id_stock_mutation,
            transactionCode: stock.transactionCode,
            date: stock.date,
            fromStore: stock.fromStore ? stock.fromStore.name : 'Gudang',
            toStore: stock.toStore?.name,
            products: stock.StockMutationDetail.map((detail) => ({
                id: detail.id_product,
                code: productCodeMap.get(detail.id_product) || '-',
                quantity: detail.quantity,
                name: detail.product.name,
            })),
        }));
        responseAPITable(res, {
            status: 200,
            message: "Stock Mutation report retrieved successfully",
            data: {
                totalRecords: totalRecords,
                data: data,
            }
        });
    } catch (error) {
        responseAPI(res, { status: 500, message: "Internal server error" });
    }
}