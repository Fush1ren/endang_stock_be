export type Token = {
    accessToken: string;
    refreshToken?: string;
}

export interface PermissionType {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}

export interface Permissions {
    product: PermissionType;
    brand: PermissionType;
    category: PermissionType;
    unit: PermissionType;
    product_in: PermissionType;
    product_out: PermissionType;
    product_mutation: PermissionType;
    store: PermissionType;
    store_stock: PermissionType;
    warehouse_stock: PermissionType;
    setting_user: PermissionType;
    setting_role: PermissionType;
}

export interface UserLoginResponse {
    id: number;
    name: string;
    username: string;
    email: string;
    photo: string | null;
    role: {
        id: number;
        name: string;
    };
    permissions: Permissions;
    accessToken: string;
    refreshToken?: string;
}