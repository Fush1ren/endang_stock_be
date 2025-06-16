import { Response } from "express";
import { ReponseDataType, ReponseTableDataType, ResponseType } from "../types";

export const responseAPI = (res: Response, resAPI: ResponseType) => {
    res.status(resAPI.status).json({
        status: resAPI.status,
        message: resAPI.message,
    });
};

export const responseAPIData = (res: Response, resAPI: ReponseDataType) => {
    res.status(resAPI.status).json({
        status: resAPI.status,
        message: resAPI.message,
        data: resAPI.data,
    });
}

export const responseAPITable = (res: Response, resAPI: ReponseTableDataType) => {
    res.status(resAPI.status).json({
        status: resAPI.status,
        message: resAPI.message,
        data: {
            totalRecords: resAPI.data.totalRecords,
            data: resAPI.data.data,
        }
    });
}