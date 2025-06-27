import { Router } from 'express';
import { createUser, deleteUser, getAllUser, getOptionsUser, getUserById, getUserProfile, updateUser, updateUserProfile } from './user.controller';
import multer from 'multer';
import { verifyToken } from '../../../middleware';

const upload = multer();

const userRouter = Router();

userRouter.get('/', verifyToken, getAllUser);
userRouter.get('/options', verifyToken, getOptionsUser);
userRouter.get('/profile/:id', verifyToken, getUserProfile);
userRouter.get('/:id', verifyToken, getUserById);
userRouter.post('/', upload.single('photo'), verifyToken, createUser);
userRouter.put('/:id', upload.single('photo'), verifyToken, updateUser)
userRouter.put('/profile/:id', verifyToken, upload.single('photo'), updateUserProfile);
userRouter.delete('/', verifyToken, deleteUser); 

export default userRouter;