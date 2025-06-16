export type UserLogin = {
    username: string;
    password: string;
}

export type CreateUser = {
    username: string;
    email: string;
    name: string;
    password: string;
    type?: string;
}