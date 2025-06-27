import { Request, Response } from "express";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { prismaClient } from "../../config";
import { QueryParams } from "../../dto";
import { capitalizeWords, parseSort } from "../../utils/data.util";
import { getCategoryList } from "./category.service";

export const createCategory = async (req: Request, res: Response) => {
    try {

        const { name } = req.body;

        if (!name) {
            return responseAPI(res, {
                status: 400,
                message: "Name is required",
            });
        }

        const existingCategory = await prismaClient.category.findFirst({
            where: {
                name: capitalizeWords(name.trim().toLowerCase()),
            },
        });

        if (existingCategory) {
            return responseAPI(res, {
                status: 400,
                message: "Category already exists",
            });
        }

        await prismaClient.category.create({
            data: {
                name: name,
            },
        });

        responseAPI(res, {
            status: 201,
            message: "Category created successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        })
    }
}

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.body as { id: string[] };

        if (!id || id.length === 0) {
            responseAPI(res, {
                status: 400,
                message: "Category ID is required",
            });
            return;
        }


        const existingCategory = await prismaClient.category.findMany({
            where: { id_category: {
                in: id.map(item => Number(item)),
            } },
        });

        if (!existingCategory || existingCategory.length === 0) {
            return responseAPI(res, {
                status: 404,
                message: "Category not found",
            });
        }

        await Promise.all(
            id.map(categoryId => 
                prismaClient.category.delete({
                    where: { id_category: Number(categoryId) },
                })

        ));


        responseAPI(res, {
            status: 200,
            message: "Category deleted successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const body = req.body as { name: string };

        if (!body || !id || !body.name) {
            return responseAPI(res, {
                status: 400,
                message: "Invalid request body",
            });
        }

        const existingCategory = await prismaClient.category.findFirst({
            where: { 
                id_category: Number(id)
            },
        });

        if (!existingCategory) {
            return responseAPI(res, {
                status: 404,
                message: "Category not found",
            });
        }

        const existingCategoryName = await prismaClient.category.findFirst({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
                id_category: {
                    not: id, // Exclude the current category being updated
                },
            },
        });

        if (existingCategoryName) {
            return responseAPI(res, {
                status: 400,
                message: "Category with this name already exists",
            });
        }

        await prismaClient.category.update({
            where: { id_category: id },
            data: {
                name: body.name.trim(),
            },
        });

        responseAPI(res, {
            status: 200,
            message: "Category updated successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllCategory = async (req: Request, res: Response) => {
  try {
    const queryParams = req.query as QueryParams;
    const search = queryParams.search?.toString().trim();

    let where: any = {};

    // Search nama kategori (case-insensitive)
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
        id_category: true,
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
    const categories = await prismaClient.category.findMany(queryTable);
    const totalRecords = await prismaClient.category.count({ where });

    const data = getCategoryList(categories as any);

    responseAPITable(res, {
      status: 200,
      message: "Categories fetched successfully",
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

export const getCategoryDropdown = async (_req: Request, res: Response) => {
    try {
        const categories = await prismaClient.category.findMany({
            select: {
                id_category: true,
                name: true,
            },
        });

        const data = categories.map(category => ({
            id: category.id_category,
            name: category.name,
        }));

        responseAPIData(res, {
            status: 200,
            message: "Categories fetched successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}