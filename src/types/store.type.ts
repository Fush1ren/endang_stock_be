type StoreResponse = {
    name: string;
    user: {
        id: string;
        username: string;
        name: string;
    };
    createdAt: Date | string;
}

type Store = {
    id: string;
    name: string;
    userId: string;
    createdAt: Date | string;
}

export {
    Store,
    StoreResponse,
}