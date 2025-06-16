export interface IApiRoles {
    superAdmin: string[];
    admin: string[];
    employee: string[];
}

const roles: IApiRoles = {
    superAdmin: ['*', 'getUsers', 'createUser', 'updateUser', 'deleteUser', 'getItems', 'createItem', 'updateItem', 'deleteItem'],
    admin: ['getUsers', 'createUser', 'updateUser', 'deleteUser', 'getItems', 'createItem', 'updateItem', 'deleteItem'],
    employee: ['getItems', 'createItem', 'updateItem', 'deleteItem'],
}

export const apiRoles = Object.keys(roles);

export const apiRolesRights = new Map(Object.entries(roles));