import dotenv from 'dotenv';

dotenv.config();

interface Config {
    portApi: number;
    nodeEnv: string;
    jwtSecret: string;
    refreshTokenSecret: string;
    clientUrl: string;
    bucketUrl: string;
    bucketName: string;
    bucketKey: string;
}

const config: Config = {
    portApi: Number(process.env.PORT_API) || 3000,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    jwtSecret: process.env.JWT_SECRET ?? '',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET ?? '',
    clientUrl: process.env.CLIENT_URL ?? '*',
    bucketUrl: process.env.BUCKET_URL ?? '',
    bucketName: process.env.BUCKET_NAME ?? '',
    bucketKey: process.env.BUCKET_KEY ?? ''
};

export default config;