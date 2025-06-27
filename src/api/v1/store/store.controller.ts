import { Request, Response } from "express";
import { prismaClient } from "../../config";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { capitalizeWords, parseSort } from "../../utils/data.util";
import { GetStoreParams } from "../../../dto/store.dto";
import { Prisma } from "@prisma/client";

export const createStore = async (req: Request, res: Response) => {
    try {

        const { name } = req.body;

        if (!name) {
            responseAPI(res, {
                status: 400,
                message: "Name is required",
            });
        }

        const existingStore = await prismaClient.store.findFirst({
            where: {
                name: capitalizeWords(name.trim().toLowerCase()),
            },
        });

        if (existingStore) {
            responseAPI(res, {
                status: 400,
                message: "Store already exists",
            });
            return;
        }

        await prismaClient.store.create({
            data: {
                name: capitalizeWords(name.trim().toLowerCase()),
            },
        });


        responseAPI(res, {
            status: 201,
            message: "Store created successfully",
        });

    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const getAllStore = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as GetStoreParams;
        
        // Definisikan where secara terpisah agar lebih fleksibel
        let where: Prisma.StoreWhereInput = {};

        // Filter nama berdasarkan queryParams.name (array of exact match)
        if (queryParams.name) {
            const names = JSON.parse(queryParams.name as string) as string[];
            if (Array.isArray(names) && names.length > 0) {
                where.OR = names.map(name => ({
                    name: {
                        equals: name.trim(),
                        mode: 'insensitive',
                    }
                }));
            }
        }

        // Filter nama berdasarkan search string (contains, case-insensitive)
        if (queryParams.search) {
            const search = queryParams.search.toString().trim();
            if (search.length > 0) {
                where.name = {
                    contains: search,
                    mode: 'insensitive',
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

        // Siapkan queryTable
        let queryTable: Prisma.StoreFindManyArgs = {
            where,
            select: {
                id_store: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        };

        // Sort
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

        const stores = await prismaClient.store.findMany(queryTable);
        const totalRecords = await prismaClient.store.count({
            where,
        });

        const data = stores.map(store => ({
            id: store.id_store,
            name: store.name,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
        }));

        responseAPITable(res, {
            status: 200,
            message: "Stores retrieved successfully",
            data: {
                totalRecords,
                data: data,
            }
        });
    } catch (error) {
        console.error(error);
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
};

export const getStoreById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: "ID is required",
            });
            return;
        }

        const store = await prismaClient.store.findUnique({
            where: { id_store: id },
            select: {
                id_store: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!store) {
            responseAPI(res, {
                status: 404,
                message: "Store not found",
            });
            return;
        }

        responseAPIData(res, {
            status: 200,
            message: "Store retrieved successfully",
            data: store,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const updateStore = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as { name: string; };

        if (!body || !body.name) {
            responseAPI(res, {
                status: 400,
                message: "ID and Name are required",
            });
            return;
        }
        
        const existingStore = await prismaClient.store.findUnique({
            where: {
                id_store: id,
            },
        });

         // Check if the store exists
        if (!existingStore) {
            responseAPI(res, {
                status: 404,
                message: "Store not found",
            });
            return;
        }

        // Check if the name already exists
        const existingStoreName = await prismaClient.store.findFirst({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        if (existingStoreName && existingStoreName.id_store !== id) {
            responseAPI(res, {
                status: 400,
                message: "Store with this name already exists",
            });
            return;
        }
        
        await prismaClient.store.update({
            where: { id_store: id },
            data: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        }); // Respond with success message

        responseAPI(res, {
            status: 200,
            message: "Store updated successfully",
        });

    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const deleteStore = async (req: Request, res: Response) => {
    try {
        const body = req.body as { id: number[] };

        if (!body || !body.id || body.id.length === 0) {
            responseAPI(res, {
                status: 400,
                message: "ID is required",
            });
            return;
        }

        const existingStores = await prismaClient.store.findMany({
            where: {
                id_store: {
                    in: body.id,
                },
            },
        });

        if (existingStores.length === 0) {
            responseAPI(res, {
                status: 404,
                message: "Store not found",
            });
            return;
        }
        // If all checks passed, proceed to delete the store

        await Promise.all(
            body.id.map(id => 
                prismaClient.store.delete({
                    where: { id_store: id },
                })
            )
        ); // Delete multiple stores

        responseAPI(res, {
            status: 200,
            message: "Store deleted successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const getStoreDropdown = async (_req: Request, res: Response) => {
    try {
        const stores = await prismaClient.store.findMany({
            select: {
                id_store: true,
                name: true,
            },
        });

        const data = stores.map(store => ({
            id: store.id_store,
            name: store.name,
        }));

        responseAPIData(res, {
            status: 200,
            message: "Stores retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}