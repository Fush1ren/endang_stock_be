import { Router } from 'express';
import { createRole, deleteRole, getAllRole, getRoleById, getRoleDropdown, updateRole } from './role.controller';
import { verifyToken } from '../../../middleware';

const roleRouter = Router();

roleRouter.post('/', verifyToken,  createRole);
roleRouter.get('/', verifyToken, getAllRole);
roleRouter.get('/dropdown', verifyToken, getRoleDropdown);
roleRouter.get('/:id', verifyToken, getRoleById);
roleRouter.put('/:id', verifyToken, updateRole);
roleRouter.delete('/', verifyToken, deleteRole); 

export default roleRouter;