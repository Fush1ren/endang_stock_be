import { Router } from 'express';
import { createCategory, deleteCategory, getAllCategory, getCategoryDropdown, updateCategory } from './category.controller';
import { verifyToken } from '../../../middleware';

const categoryRoute = Router();

categoryRoute.get('/', verifyToken, getAllCategory);
categoryRoute.get('/dropdown', verifyToken, getCategoryDropdown);
categoryRoute.post('/', verifyToken, createCategory);
categoryRoute.put('/:id', verifyToken, updateCategory);
categoryRoute.delete('/', verifyToken, deleteCategory);

export default categoryRoute;