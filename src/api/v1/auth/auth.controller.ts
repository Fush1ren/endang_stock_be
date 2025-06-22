import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { responseAPI, responseAPIData } from '../../utils'
import { BodyUserLogin } from '../../dto'
import { prismaClient } from '../../config'
import { UserLoginResponse } from '../../types/auth.type'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.util'

export const userLogin = async (req: Request, res: Response) => {
    try {
        const body = req.body as BodyUserLogin;
        if (!body) {
            responseAPI(res, {status: 400, message: "No data provided"});
        };

        if (!body.identifier) {
            responseAPI(res, {
                status: 400,
                message: 'Username Or Email is required!',
            });
        };
        if (!body.password) {
            responseAPI(res, {
                status: 400,
                message: 'Password is required!',
            });
        };

        const user = await prismaClient.user.findFirst({
            where: {
                OR: [
                    { username: body.identifier },
                    { email: body.identifier },
                ]
            },
            select: {
                id_user: true,
                username: true,
                name: true,
                email: true,
                photo: true,
                password: true,
                roles: {
                    select: {
                        id_role: true,
                        name: true,
                        permissions: true,
                    }
                }
            }
        })

        if (!user) {
            responseAPI(res, {
                status: 401,
                message: 'Your username or email is incorrect',
            })
            return;
        }

        const isPasswordValid = await bcrypt.compare(body.password, user?.password as string);
        if (!isPasswordValid) {
            responseAPI(res, {
                status: 401,
                message: 'Your password is incorrect',
            })
            return;
        }

        const accessToken = generateAccessToken({
            id: user?.id_user as number,
            username: user?.username as string,
        });

        const refreshToken = generateRefreshToken({
            id: user?.id_user as number,
            username: user?.username as string,
        });

        let data: UserLoginResponse = {
            id: user?.id_user as number,
            name: user?.name as string,
            username: user?.username as string,
            email: user?.email as string,
            photo: user?.photo as string | null,
            role: {
                id: user?.roles?.id_role as number,
                name: user?.roles?.name as string,
            },
            permissions: user?.roles?.permissions as any,
            accessToken: accessToken,
        }

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        responseAPIData(res, {
            status: 200,
            message: 'Login successfully',
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        })
    }
}

export const refreshAccessToken = async (req: Request, res: Response) => {
    const token = req?.cookies?.refreshToken;
    if (!token) {
        responseAPI(res, {
            status: 400,
            message: 'Refresh token is required',
        });
        return;
    }

    try {
        const payload = verifyRefreshToken(token) as { id: number, username: string } | null;
        const newAccessToken = generateAccessToken({
            id: payload?.id as number,
            username: payload?.username as string,
        });
        responseAPIData(res, {
            status: 200,
            message: 'Access token refreshed successfully',
            data: {
                accessToken: newAccessToken,
            },
        })
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: 'Internal server error',
        });
    }
};

export const logout = async (_req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    responseAPI(res, {
        status: 204,
        message: 'Logout successfully',
    });
}