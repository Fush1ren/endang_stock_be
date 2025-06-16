import { Request, Response } from "express";
import { getPage, responseAPI, responseAPIData } from "../../utils";
import { prismaClient } from "../../config";
import { BodyDeleteProductData, BodyUpdateProductUnit, GetProductUnitParams } from "../../../dto/product.dto";
import { parseSort } from "../../utils/data.util";
import { Prisma } from "@prisma/client";
import { User } from "../../types";
import { getUnitList } from "./unit.service";

export const createUnit = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user as User;
        if (!userReq) {
            responseAPI(res, {
                status: 401,
                message: 'Unauthorized',
            });
            return;
        };

        const { name } = req.body;
        if (!name) {
            responseAPI(res, {
                status: 400,
                message: 'Name is required!',
            });
        }

        // check if unit already exists
        const existingUnit = await prismaClient.unit.findFirst({
            where: {
                name: name.trim(),
            },
        });

        if (existingUnit) {
            responseAPI(res, {
                status: 400,
                message: 'Unit already exists!',
            });
            return;
        }

        await prismaClient.unit.create({
            data: {
                name,
            }
        });
        responseAPI(res, {
            status: 200,
            message: 'Unit created successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const updateUnit = async (req: Request, res: Response) => {
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
        const body = req.body as BodyUpdateProductUnit;
        
        if (!body) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (!body.name) {
            responseAPI(res, {
                status: 400,
                message: 'Name is required for update!',
            });
            return;
        }

        const existingUnit = await prismaClient.unit.findUnique({
            where: {
                id_unit: id,
            },
        });
        if (!existingUnit) {
            responseAPI(res, {
                status: 404,
                message: 'Unit not found!',
            });
            return;
        }

        await prismaClient.unit.update({
            where: {
                id_unit: id,
            },
            data: {
                name: body.name.trim(),
            }
        });
        
        responseAPI(res, {
            status: 200,
            message: 'Unit updated successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const deleteUnit = async (req: Request, res: Response) => {
    try {
        const body = req.body as BodyDeleteProductData;
        if (!body) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        const unitIds = [...new Set(body.id.map((id) => id))];

        const [ existingUnitId ] = await Promise.all([
            prismaClient.unit.findMany({
                where: {
                    id_unit: {
                        in: unitIds,
                    },
                },
                select: {
                    id_unit: true,
                },
            })
        ]);

        if (existingUnitId.length === 0) {
            responseAPI(res, {
                status: 400,
                message: 'Unit ID is required for all units!',
            });
            return;
        }

        await Promise.all(
            body.id.map(unit => prismaClient.unit.delete({
                where: {
                    id_unit: unit,
                }
            }))
        )

        responseAPI(res, {
            status: 200,
            message: 'Unit deleted successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const getAllUnit = async (req: Request, res: Response) => {
    try {
        const queryParams = req.query as GetProductUnitParams;

        // Definisikan filter where
        let where: Prisma.UnitWhereInput = {};

        // Filter name (array exact match, insensitive)
        if (queryParams.name) {
            const names = JSON.parse(queryParams.name as string) as string[];
            if (Array.isArray(names) && names.length > 0) {
                where.OR = names.map(name => ({
                    name: {
                        equals: name.trim(),
                        mode: 'insensitive',
                    },
                }));
            }
        }

        // Filter search (contains, insensitive)
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

        // Bangun query
        let queryTable: Prisma.UnitFindManyArgs = {
            where,
            select: {
                id_unit: true,
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

        // Query data
        const units = await prismaClient.unit.findMany(queryTable);
        const totalRecords = await prismaClient.unit.count({ where });

        const data = getUnitList(units as any[]);

        responseAPIData(res, {
            status: 200,
            message: 'Units retrieved successfully',
            data: {
                totalRecords,
                data: data,
            },
        });
    } catch (error) {
        console.error(error);
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
};

export const getUnitDropdown = async (_req: Request, res: Response) => {
    try {
        const units = await prismaClient.unit.findMany({
            select: {
                id_unit: true,
                name: true,
            },
        });

        const data = units.map(unit => ({
            id: unit.id_unit,
            name: unit.name,
        }));

        responseAPIData(res, {
            status: 200,
            message: 'Units dropdown retrieved successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}