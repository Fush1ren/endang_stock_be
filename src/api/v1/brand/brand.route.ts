import { Router } from 'express';
import { createBrand, deleteBrand, getAllBrand, getBrandDropdown, updateBrand } from './brand.controller';
import { verifyToken } from '../../../middleware';

const brandRouter = Router();

brandRouter.get('/', verifyToken, getAllBrand);
brandRouter.get('/dropdown', verifyToken, getBrandDropdown);
brandRouter.post('/', verifyToken, createBrand);
brandRouter.put('/:id', verifyToken, updateBrand); // Assuming updateBrand is similar to createBrand
brandRouter.delete('/', verifyToken, deleteBrand); // Assuming deleteBrand is similar to updateBrand

export default brandRouter;