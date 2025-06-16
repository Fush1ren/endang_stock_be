import { Router } from 'express';
import { logout, refreshAccessToken, userLogin } from './auth.controller';

const authRouter = Router();

authRouter.post('/login', userLogin);
authRouter.post('/refresh', refreshAccessToken);
authRouter.post('/logout', logout);

export default authRouter;