import { Request, Response } from "express";
import { createClient } from '@supabase/supabase-js';
import { BodyCreateUser } from "../../../dto";
import { getPage, responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { prismaClient } from "../../config";
import { QueryParams } from "../../dto";
import bcrypt from 'bcryptjs'
import config from "../../../config";
import { BodyUpdateProfile, BodyUpdateUser } from "../../../dto/user.dto";
import { parseSort } from "../../utils/data.util";
import { UserOptionsFilter } from "../../types/user.type";
import { Prisma } from "@prisma/client";
import { getUserList } from "./user.service";

const supabaseStorage = createClient(config.bucketUrl, config.bucketKey);
const bucketName = config.bucketName;

const uploadToSupabaseStorage = async (file: Express.Multer.File, username: string): Promise<string | undefined> => {
    try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${username}-${Date.now()}.${fileExt}`;

        const { error } = await supabaseStorage.storage.from(bucketName).upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
        });

        if (error) {
            console.error('Error uploading file:', error);
        }

        return supabaseStorage.storage.from(bucketName).getPublicUrl(fileName).data.publicUrl;
    } catch (error) {
        console.error('Error uploading file to Supabase Storage:', error);
    }
}

const deleteFromSupabaseStorage = async (avatarUrl: string): Promise<void> => {
    try {
        const publicPrefix = '/storage/v1/object/public/';
        const startIndex = avatarUrl.indexOf(publicPrefix);
        if (startIndex === -1) return;

        const fullPath = avatarUrl.substring(startIndex + publicPrefix.length); 
        const bucket = fullPath.split('/')[0];
        const filePath = fullPath.split('/').slice(1).join('/');

        await supabaseStorage.storage.from(bucket).remove([filePath]);
    } catch (error) {
        console.error('Error deleting file from Supabase Storage:', error);
    }
}

export const createUser = async (req: Request, res: Response) => {
    try {
        const body = req.body as BodyCreateUser;
        if (!body) {
            responseAPI(res, {status: 400, message: "No data provided"});
        };

        if (!body.username) {
            responseAPI(res, {
                status: 400,
                message: 'Username is required!',
            });
        }

        if (!body.password) {
            responseAPI(res, {
                status: 400,
                message: 'Password is required!',
            });
        }

        if (!body.email) {
            responseAPI(res, {
                status: 400,
                message: 'Email is required!',
            });
        }

        if (!body.name) {
            responseAPI(res, {
                status: 400,
                message: 'Name is required!',
            });
        }

        if (!body.role) {
            responseAPI(res, {
                status: 400,
                message: 'Role is required!',
            });
        }

        const existingUser = await prismaClient.user.findUnique({
            where: {
                username: body.username?.toLowerCase(),
            },
        });

        if (existingUser) {
            return responseAPI(res, {
                status: 400,
                message: 'Username already exists!',
            });
        }

        const existingEmail = await prismaClient.user.findUnique({
            where: {
                email: body.email?.toLowerCase(),
            },
        });
        
        if (existingEmail) {
            return responseAPI(res, {
                status: 400,
                message: 'Email already exists!',
            });
        }

        // Check if the role exists
        const existingRole = await prismaClient.role.findUnique({
            where: {
                id_role: Number(body.role),
            },
        });

        if (!existingRole) {
            return responseAPI(res, {
                status: 400,
                message: 'Role does not exist!',
            });
        }

        let avatarUrl: string | undefined = undefined;
        if (req.file) {
            avatarUrl = await uploadToSupabaseStorage(req.file, body.username?.toLowerCase());
        }

        const hashed = await bcrypt.hash(body.password, 10)

        await prismaClient.user.create({
            data: {
                name: body.name,
                username: body.username?.toLowerCase(),
                email: body.email?.toLowerCase(),
                password: hashed,
                photo: avatarUrl || null,
                roles: {
                    connect: {
                        id_role: Number(body.role),
                    },
                },
            }
        })
        
        responseAPI(res, {
            status: 200,
            message: 'User created successfully',
        })
    } catch (error) {
        res.status(403);
    }
}

export const getAllUser = async (req: Request, res: Response) => {
  try {
    const queryParams = req.query as QueryParams;
    const search = queryParams.search?.toString().trim();

    let where: any = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          username: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          roles: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (queryParams.role) {
        const roles = JSON.parse(queryParams.role as string) as string[];
        if (Array.isArray(roles) && roles.length > 0) {
            where.roles = {
                id_role: {
                    in: roles,
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

    let queryTable: any = {
      where,
      select: {
        id_user: true,
        name: true,
        username: true,
        email: true,
        photo: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            id_role: true,
            name: true,
          },
        },
      },
    };

    const orderBy = parseSort({
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });

    if (orderBy) {
      queryTable.orderBy = orderBy;
    }

    if (queryParams.page || queryParams.limit) {
      const paramPage = queryParams.page ? Number(queryParams.page) : 1;
      const paramLimit = queryParams.limit ? Number(queryParams.limit) : 10;
      const page = getPage(paramPage, paramLimit);
      queryTable.skip = page.skip;
      queryTable.take = page.take;
    }

    const users = await prismaClient.user.findMany(queryTable);
    const totalRecords = await prismaClient.user.count({ where });

    const data = getUserList(users as any);

    responseAPITable(res, {
      status: 200,
      message: 'Get all user successfully',
      data: {
        totalRecords,
        data: data,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getOptionsUser = async (req: Request, res: Response) => {
    try {
        const options = req.query as UserOptionsFilter;

        let select: Prisma.UserSelect = {};

        if (options.role) {
            select.roles = {
                select: {
                    id_role: true,
                    name: true,
                },
            };
        }

        if (!options.role) {
            responseAPIData(res, {
                status: 200,
                message: 'User Options retrieved successfully',
                data: {
                    roles: [],
                },
            });
        }

        const users = await prismaClient.user.findMany({
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
            role: getUniqueOptions(users.map(user => ({
                label: user.roles?.name ?? '',
                value: user.roles?.id_role ?? '',
            }))),
        }
        responseAPIData(res, {
            status: 200,
            message: 'User Options retrieved successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}


export const getUserById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return responseAPI(res, {
                status: 400,
                message: 'User ID is required',
            });
        }

        const user = await prismaClient.user.findUnique({
            where: { id_user: id },
            select: {
                id_user: true,
                name: true,
                username: true,
                email: true,
                photo: true,
                createdAt: true,
                updatedAt: true,
                roles: {
                    select: {
                        id_role: true,
                        name: true,
                    }
                },
            }
        });

        if (!user) {
            return responseAPI(res, {
                status: 404,
                message: 'User not found',
            });
        }
        
        const data = {
            id: user.id_user,
            name: user.name,
            username: user.username,
            email: user.email,
            photo: user.photo,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            roles: user.roles ? {
                id: user.roles.id_role,
                name: user.roles.name,
            }: null,
        }

        responseAPIData(res, {
            status: 200,
            message: 'User retrieved successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const updateUser = async (req: Request, res: Response) => {
    try {

        const id = Number(req.params.id);
        const body = req.body as BodyUpdateUser;
        if (!body) {
            responseAPI(res, {status: 400, message: "No data provided"});
        };

        if (!id) {
            return responseAPI(res, {
                status: 400,
                message: 'User ID is required',
            });
        }

        if (!body.name) {
            return responseAPI(res, {
                status: 400,
                message: 'Name is required',
            });
        }

        if (!body.username) {
            return responseAPI(res, {
                status: 400,
                message: 'Username is required',
            });
        }

        if (!body.email) {
            return responseAPI(res, {
                status: 400,
                message: 'Email is required',
            });
        }

        if (!body.role) {
            return responseAPI(res, {
                status: 400,
                message: 'Role is required',
            });
        }

        const existingUser = await prismaClient.user.findUnique({
            where: { id_user: id },
        });

        if (!existingUser) {
            return responseAPI(res, {
                status: 404,
                message: 'User not found',
            });
        }

        if (body.password) {
            const hashed = await bcrypt.hash(body.password, 10)
            body.password = hashed;
        } else {
            if (!existingUser) {
                return responseAPI(res, {
                    status: 404,
                    message: 'User not found',
                });
            }
            body.password = existingUser.password; // Keep the existing password if not provided
        }

        let avatarUrl: string | undefined = undefined;
        if (req.file) {
            if (existingUser.photo) {
                await deleteFromSupabaseStorage(existingUser.photo);
            }
            avatarUrl = await uploadToSupabaseStorage(req.file, existingUser.username);
        } else {
            if(existingUser.photo) {
                await deleteFromSupabaseStorage(existingUser.photo);
                avatarUrl = undefined;
            }
            avatarUrl = undefined;
        }


        await prismaClient.user.update({
            where: { id_user: Number(id) },
            data: {
                name: body.name,
                username: body.username?.toLowerCase(),
                email: body.email?.toLowerCase(),
                password: body.password,
                photo: avatarUrl || null,
                roles: {
                    connect: {
                        id_role: Number(body.role),
                    },
                },
            },
        })
        
        responseAPI(res, {
            status: 200,
            message: 'User updated successfully',
        })
    } catch (error) {
        res.status(403);
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const body = req.body as { id: string[] };

        if (!body || !body.id || body.id.length === 0) {
            return responseAPI(res, {
                status: 400,
                message: 'No user ID provided',
            });
        }

        const userIds = body.id.map(id => Number(id));
        const users = await prismaClient.user.findMany({
            where: {
                id_user: {
                    in: userIds,
                },
            },
            select: {
                id_user: true,
                photo: true, // Include photo field to handle deletion if needed
            },
        });

        if (users.length === 0) {
            return responseAPI(res, {
                status: 404,
                message: 'No users found with the provided IDs',
            });
        }

        await Promise.all(
            users.map(async user => {
                if (user.photo) {
                    await deleteFromSupabaseStorage(user.photo);
                }
            })
        )

        await Promise.all(
            users.map(user => 
                prismaClient.user.delete({
                    where: { id_user: user.id_user },
                })
            )
        )
        
        responseAPI(res, {
            status: 200,
            message: 'User deleted successfully',
        });
    } catch (error) {
        res.status(403);
    }
}

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id ? Number(req.params.id) : null;

        if (!userId) {
            return responseAPI(res, {
                status: 400,
                message: 'User ID is required',
            });
        }

        const userProfile = await prismaClient.user.findUnique({
            where: { id_user: userId },
            select: {
                id_user: true,
                name: true,
                username: true,
                email: true,
                photo: true,
                roles: {
                    select: {
                        id_role: true,
                        name: true,
                    }
                }
            }
        });

        if (!userProfile) {
            return responseAPI(res, {
                status: 404,
                message: 'User not found',
            });
        }

        if (userId !== userProfile.id_user) {
            return responseAPI(res, {
                status: 403,
                message: 'Forbidden: You do not have permission to access this resource',
            });
        }

        const data = {
            id: userProfile.id_user,
            name: userProfile.name,
            username: userProfile.username,
            email: userProfile.email,
            photo: userProfile.photo,
            roles: userProfile.roles ? {
                id: userProfile.roles.id_role,
                name: userProfile.roles.name,
            } : null,
        }

        responseAPIData(res, {
            status: 200,
            message: 'User profile retrieved successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}

export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id ? Number(req.params.id) : null;

        if (!userId) {
            return responseAPI(res, {
                status: 400,
                message: 'User ID is required',
            });
        }

        const body = req.body as BodyUpdateProfile;
        if (!body) {
            return responseAPI(res, {status: 400, message: "No data provided"});
        };

        if (!body.name) {
            return responseAPI(res, {
                status: 400,
                message: 'Name is required',
            });
        }

        if (!body.username) {
            return responseAPI(res, {
                status: 400,
                message: 'Username is required',
            });
        }

        if (!body.email) {
            return responseAPI(res, {
                status: 400,
                message: 'Email is required',
            });
        }

        const existingUser = await prismaClient.user.findUnique({
            where: {
                id_user: userId,
            },
        });

        if (!existingUser) {
            return responseAPI(res, {
                status: 404,
                message: 'User not found',
            });
        }
        
        let avatarUrl: string | undefined = undefined;
        if (req.file) {
            if (existingUser.photo) {
                await deleteFromSupabaseStorage(existingUser.photo);
            }
            avatarUrl = await uploadToSupabaseStorage(req.file, existingUser.username);
        } else {
            if (existingUser.photo) {
                await deleteFromSupabaseStorage(existingUser.photo);
                avatarUrl = undefined;
            }
            avatarUrl = undefined;
        }

        if (body.password) {
            const hashed = await bcrypt.hash(body.password, 10)
            body.password = hashed;
        } else {
            if (!existingUser) {
                return responseAPI(res, {
                    status: 404,
                    message: 'User not found',
                });
            }
            body.password = existingUser.password; // Keep the existing password if not provided
        }

        await prismaClient.user.update({
            where: { id_user: userId },
            data: {
                name: body.name,
                username: body.username,
                email: body.email,
                password: body.password,
                photo: avatarUrl || null,
            }
        });

        responseAPI(res, {
            status: 200,
            message: 'User profile updated successfully',
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
}