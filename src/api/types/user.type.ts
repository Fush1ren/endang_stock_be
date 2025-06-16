export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    photo: string | null;
    refreshToken: string | null;
    role: string;
}

export interface UserOptionsFilter {
    [key: string]: string | number | boolean;
    role: string;
}

export interface UserListPayload {
    id_user: number;
    name: string;
    username: string;
    email: string;
    photo: string | null;
    roles: {
        id_role: number;
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export type StockRoleAttribute = 'brand' | 'category' | 'product' | 'unit' |
'product_in' | 'product_out' | 'product_mutation' |
'store' | 'store_stock' | 'warehouse_stock' |
'setting_user' | 'setting_role';

export interface PermissionType {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}

export type Permissions = Record<StockRoleAttribute, PermissionType>;

export interface BodyCreateRole {
    name: string;
    permissions: Permissions;
}

export interface BodyUpdateRole {
    name: string;
    permissions: Permissions;
}