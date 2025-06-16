import { Request } from "express";

export type user = {
  id: string;
  email: string;
  name: string;
}

export interface UserRequest extends Request {
  user?: user;
}