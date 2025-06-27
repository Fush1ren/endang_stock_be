import { Request, Response } from "express";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { prismaClient } from "../../config";
import { QueryParams } from "../../dto";
import { capitalizeWords, parseSort } from "../../utils/data.util";
import { BodyCreateRole, BodyUpdateRole } from "../../types/user.type";

export const createRole = async (req: Request, response: Response) => {
    try {
        const { name, permissions } = req.body as BodyCreateRole;
        if (!name) {
            return responseAPI(response, {
                status: 400,
                message: "Name is required",
            });
        }

        if (!permissions || typeof permissions !== 'object') {
            return responseAPI(response, {
                status: 400,
                message: "Permissions must be an object",
            });
        }

        const existingRole = await prismaClient.role.findUnique({
            where: {
                name: capitalizeWords(name.trim().toLowerCase()),
            },
        });


        if (existingRole) {
            responseAPI(response, {
                status: 400,
                message: "Role already exists",
            });
            return;
        }

        await prismaClient.role.create({
            data: {
                name: capitalizeWords(name.trim().toLowerCase()),
                permissions: permissions as object,
            },
        });

        responseAPI(response, {
            status: 201,
            message: "Role created successfully",
        });
    } catch (error) {
        responseAPI(response, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getAllRole = async (req: Request, response: Response) => {
  try {
    const queryParams = req.query as QueryParams;
    const search = queryParams.search?.toString().trim();

    let where: any = {};

    // 🔍 Search by role name
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
        id_role: true,
        name: true,
        createdAt: true,
        permissions: true,
        updatedAt: true,
      },
    };

    // 🔃 Sorting
    const orderBy = parseSort({
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });
    if (orderBy) {
      queryTable.orderBy = orderBy;
    }

    // 📄 Pagination
    if (queryParams.page || queryParams.limit) {
      const paramPage = queryParams.page ? Number(queryParams.page) : 1;
      const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
      const page = getPage(paramPage, paramLimit);
      queryTable.skip = page.skip;
      queryTable.take = page.take;
    }

    // 📥 Fetch data
    const roles = await prismaClient.role.findMany(queryTable);
    const totalRecords = await prismaClient.role.count({ where });

    const data = roles.map(role => ({
        id: role.id_role,
        name: role.name,
        permissions: role.permissions as object,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
    }));

    responseAPITable(response, {
      status: 200,
      message: 'Roles retrieved successfully',
      data: {
        totalRecords,
        data: data,
      },
    });
  } catch (error) {
    console.error(error);
    responseAPI(response, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

export const getRoleById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            responseAPI(res, {
                status: 400,
                message: 'Role ID is required',
            });
            return;
        }

        const role = await prismaClient.role.findUnique({
            where: { id_role: id },
            select: {
                id_role: true,
                name: true,
                permissions: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!role) {
            responseAPI(res, {
                status: 404,
                message: "Role not found",
            });
            return;
        }

        responseAPIData(res, {
            status: 200,
            message: "Role retrieved successfully",
            data: {
                id: role.id_role,
                name: role.name,
                permissions: role.permissions as object,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const updateRole = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body as BodyUpdateRole;

        if (!body || !body.name) {
            responseAPI(res, {
                status: 400,
                message: 'Name is required',
            });
            return;
        }

        if (typeof body.name !== 'string' || body.name.trim() === '') {
            responseAPI(res, {
                status: 400,
                message: 'Name must be a non-empty string',
            });
            return;
        }


        const existingRole = await prismaClient.role.findUnique({
            where: { id_role: id },
        });

        if (!existingRole) {
            responseAPI(res, {
                status: 404,
                message: "Role not found",
            });
            return;
        }

        const existingRoleName = await prismaClient.role.findUnique({
            where: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
            },
        });

        if (existingRoleName && existingRoleName.id_role !== id) {
            responseAPI(res, {
                status: 400,
                message: "Role with this name already exists",
            });
            return;
        }

        await prismaClient.role.update({
            where: { id_role: id },
            data: {
                name: capitalizeWords(body.name.trim().toLowerCase()),
                permissions: body.permissions ? body.permissions as object : existingRole.permissions as object,
            },
        });

        responseAPI(res, {
            status: 200,
            message: "Role updated successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const getRoleDropdown = async (_req: Request, res: Response) => {
    try {
        const roles = await prismaClient.role.findMany({
            select: {
                id_role: true,
                name: true,
            },
        });

        const data = roles.map(role => ({
            id: role.id_role,
            name: role.name,
        }));

        responseAPIData(res, {
            status: 200,
            message: "Roles retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const body = req.body as { id: number[] };

        if (!body) {
            responseAPI(res, {
                status: 400,
                message: 'No data provided',
            });
            return;
        }

        if (!body.id || body.id.length === 0) {
            responseAPI(res, {
                status: 400,
                message: 'Role ID is required',
            });
            return;
        }

        const existingRoles = await prismaClient.role.findMany({
            where: {
                id_role: {
                    in: body.id,
                },
            },
        });

        if (existingRoles.length === 0) {
            responseAPI(res, {
                status: 404,
                message: "Role not found",
            });
            return;
        }

        await Promise.all(
            body.id.map(id => 
                prismaClient.role.delete({
                    where: { id_role: id },
                }
            )
        )); // Delete multiple roles by ID

        responseAPI(res, {
            status: 200,
            message: "Role deleted successfully",
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal server error",
        });
    }
}