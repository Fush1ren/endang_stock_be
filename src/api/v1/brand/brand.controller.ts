import { Request, Response } from "express";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { prismaClient } from "../../config";
import { QueryParams } from "../../dto";
import { BodyCreateBrand } from "../../../dto/brand.dto";
import { capitalizeWords, parseSort } from "../../utils/data.util";
import { getBrandList } from "./brand.service";

export const createBrand = async (req: Request, res: Response) => {
    try {
        const body = req.body as BodyCreateBrand;

        if (!body.name) {
            return responseAPI(res, {
                status: 400,
                message: 'Name is required!',
            });
        }

        const existingBrand = await prismaClient.brand.findFirst({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        if (existingBrand) {
            return responseAPI(res, {
                status: 400,
                message: 'Brand already exists!',
            });
        }

        await prismaClient.brand.create({
            data: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        responseAPI(res, {
            status: 200,
            message: 'Brand created successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const getAllBrand = async (req: Request, res: Response) => {
  try {
    const queryParams = req.query as QueryParams;
    const search = queryParams.search?.toString().trim();

    let where: any = {};

    // Search nama brand (case-insensitive)
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
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

    let queryTable: any = {
      where,
      select: {
        id_brand: true,
        name: true,
        createdAt: true,
        updatedAt: true,
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

    // Fetch data
    const brands = await prismaClient.brand.findMany(queryTable);
    const totalRecords = await prismaClient.brand.count({ where });

    const data = getBrandList(brands as any);

    responseAPITable(res, {
      status: 200,
      message: 'Get all brands successfully',
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

export const getBrandDropdown = async (_req: Request, res: Response) => {
    try {
        const brands = await prismaClient.brand.findMany({
            select: {
                id_brand: true,
                name: true,
            },
        });

        const data = brands.map(brand => ({
            id: brand.id_brand,
            name: brand.name,
        })).sort((a, b) => a.name.localeCompare(b.name));

        responseAPIData(res, {
            status: 200,
            message: 'Get brand dropdown successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const deleteBrand = async (req: Request, res: Response) => {
    try {
        const body = req.body as { id: number[] };
        if (!body.id || body.id.length === 0) {
            return responseAPI(res, {
                status: 400,
                message: 'Brand ID is required',
            });
        }

        const existingBrands = await prismaClient.brand.findMany({
            where: {
                id_brand: {
                    in: body.id
                },
            },
        });

        if (existingBrands.length === 0) {
            return responseAPI(res, {
                status: 404,
                message: 'Brand not found',
            });
        }

        await prismaClient.brand.deleteMany({
            where: {
                id_brand: {
                    in: body.id
                }
            }
        })

        responseAPI(res, {
            status: 200,
            message: 'Brand deleted successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const updateBrand = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as { name: string };
        if (!body || !id || !body.name) {
            return responseAPI(res, {
                status: 400,
                message: 'Invalid request body',
            });
        }

        const existingBrands = await prismaClient.brand.findFirst({
            where: {
                id_brand: id,
            },
        });

        if (!existingBrands) {
            return responseAPI(res, {
                status: 404,
                message: 'Brand not found',
            });
        }

        const existingBrandName = await prismaClient.brand.findFirst({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
                id_brand: {
                    not: id, // Exclude the current brand being updated
                },
            },
        });

        if (existingBrandName) {
            return responseAPI(res, {
                status: 400,
                message: 'Brand with this name already exists',
            });
        }

        await prismaClient.brand.update({
            where: { id_brand: id },
            data: {
                name: body.name.trim(),
            },
        });
        
        responseAPI(res, {
            status: 200,
            message: 'Brand updated successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}