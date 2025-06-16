import { UserListPayload } from "../../types/user.type";

export const getUserList = (users: UserListPayload[]) => {
    return users.map((user) => ({
        id: user.id_user,
        name: user.name,
        username: user.username,
        email: user.email,
        photo: user.photo,
        roles: user?.roles ? {
            id: user.roles.id_role,
            name: user.roles.name,
        }: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }));
}