type User = {
    id: string;
    username: string;
    name: string;
    role: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

type UserData = {
    id: string;
    username: string;
    name: string;
}

export {
    User,
    UserData,
}