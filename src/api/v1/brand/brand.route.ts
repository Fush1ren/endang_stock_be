import { Router } from 'express';
import { createBrand, deleteBrand, getAllBrand, getBrandDropdown, updateBrand } from './brand.controller';
import { verifyToken } from '../../../middleware';

const brandRouter = Router();

brandRouter.get('/', verifyToken, getAllBrand);
brandRouter.get('/dropdown', verifyToken, getBrandDropdown);
brandRouter.post('/', verifyToken, createBrand);
brandRouter.put('/:id', verifyToken, updateBrand);
brandRouter.delete('/', verifyToken, deleteBrand);

export default brandRouter;