import { Router } from "express";
import { JwtPayload } from "jsonwebtoken";

export type ResponseType = {
    status: number;
    message: string;
}

export interface ReponseDataType<T = any> extends ResponseType {
    data: T;
}

export interface ReponseTableDataType<T = any> extends ResponseType {
    data: {
        totalRecords: number;
        data: T[];
    }
}

export type APIRoute = {
    path: string;
    route: Router;
}

export interface Payload extends JwtPayload {
    userId: string;
}