import { QueryParams } from "./api.dto";

export interface BodyCreateUser {
    name: string;
    username: string;
    email: string;
    password: string;
    photo: string | undefined;
    role: number;
}

export interface BodyUpdateUser {
    name: string;
    username: string;
    email: string;
    password?: string;
    photo?: string | undefined;
    role: number;
}

export type BodyUpdateProfile = Omit<BodyUpdateUser, 'role'>;

export interface GetUserParams extends QueryParams {
    role?: string;
    updatedAt?: string;
    createdAt?: string;
}