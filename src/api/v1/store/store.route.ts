import { Router } from 'express';
import { createStore, deleteStore, getAllStore, getStoreById, getStoreDropdown, updateStore } from './store.controller';
import { verifyToken } from '../../../middleware';

const storeRoute = Router();

storeRoute.get('/', verifyToken, getAllStore);
storeRoute.get('/dropdown', verifyToken, getStoreDropdown);
storeRoute.get('/:id', verifyToken, getStoreById); 
storeRoute.post('/', verifyToken, createStore);
storeRoute.put('/:id', verifyToken, updateStore);
storeRoute.delete('/', verifyToken, deleteStore); 

export default storeRoute;