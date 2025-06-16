import { Router } from 'express';
import { createProduct, deleteProduct, getAllProducts, getNextIndex, getOptionsProduct, getProductById, getProductDropdown, updateProduct, updateProductThreshold } from './product.controller';
import { verifyToken } from '../../../middleware';

const productRoute = Router();

productRoute.get('/', verifyToken, getAllProducts);
productRoute.get('/next-index', verifyToken, getNextIndex);
productRoute.get('/options', verifyToken, getOptionsProduct);
productRoute.get('/dropdown', verifyToken, getProductDropdown);
productRoute.get('/:id', verifyToken, getProductById);
productRoute.post('/', verifyToken, createProduct);
productRoute.patch('/:id/threshold', verifyToken, updateProductThreshold);
productRoute.put('/:id', verifyToken, updateProduct); // Assuming updateProduct is similar to createProduct
productRoute.delete('/', verifyToken, deleteProduct);

export default productRoute;