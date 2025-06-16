import { Router } from 'express';
import { createStockIn, createStockMutation, createStockOut, createStoreStock, createWarehouseStock, deleteStockIn, deleteStockMutation, deleteStockOut, getAllStocksIn, getAllStocksMutation, getAllStocksOut, getAllStoreStocks, getAllWarehouseStocks, getOptionsStoreStocks, getOptionsWarehouseStocks, getStockInById, getStockInNextCode, getStockInReport, getStockMutationById, getStockMutationNextCode, getStockMutationReport, getStockOutById, getStockOutNextCode, getStockOutReport, getStockStoreById, getStoreStockList, getWarehouseStockDropdown, updateStockIn, updateStockMutation, updateStockOut, verifyStockIn, verifyStockMutation, verifyStockOut } from './stock.controller';
import { verifyToken } from '../../../middleware';

const stockRoute = Router();

stockRoute.get('/store', verifyToken, getAllStoreStocks);
stockRoute.get('/warehouse', verifyToken, getAllWarehouseStocks);
stockRoute.get('/warehouse/options', verifyToken, getOptionsWarehouseStocks);
stockRoute.get('/warehouse/dropdown', verifyToken, getWarehouseStockDropdown);
stockRoute.get('/in/report', verifyToken, getStockInReport);
stockRoute.get('/out/report', verifyToken, getStockOutReport);
stockRoute.get('/mutation/report', verifyToken, getStockMutationReport);
stockRoute.get('/in', verifyToken, getAllStocksIn);
stockRoute.get('/out', verifyToken, getAllStocksOut);
stockRoute.get('/mutation', verifyToken, getAllStocksMutation);
stockRoute.get('/in/next-index', verifyToken, getStockInNextCode);
stockRoute.get('/in/:id', verifyToken, getStockInById);
stockRoute.get('/out/next-index', verifyToken, getStockOutNextCode);
stockRoute.get('/out/:id', verifyToken, getStockOutById);
stockRoute.get('/mutation/next-index', verifyToken, getStockMutationNextCode);
stockRoute.get('/mutation/:id', verifyToken, getStockMutationById);
stockRoute.get('/store/stock/:id/options', verifyToken, getOptionsStoreStocks);
stockRoute.get('/store/stock/:id', verifyToken, getStoreStockList);
stockRoute.get('/store/:id', verifyToken, getStockStoreById);

stockRoute.post('/', verifyToken, createStoreStock);
stockRoute.post('/warehouse', verifyToken, createWarehouseStock);
stockRoute.post('/in', verifyToken, createStockIn);
stockRoute.post('/out', verifyToken, createStockOut);
stockRoute.post('/mutation', verifyToken, createStockMutation);

stockRoute.put('/in/:id', verifyToken, updateStockIn);
stockRoute.put('/out/:id', verifyToken, updateStockOut);
stockRoute.put('/mutation/:id', verifyToken, updateStockMutation);

stockRoute.patch('/in/:id', verifyToken, verifyStockIn);
stockRoute.patch('/out/:id', verifyToken, verifyStockOut);
stockRoute.patch('/mutation/:id', verifyToken, verifyStockMutation);

stockRoute.delete('/in/:id', verifyToken, deleteStockIn);
stockRoute.delete('/out/:id', verifyToken, deleteStockOut);
stockRoute.delete('/mutation/:id', verifyToken, deleteStockMutation);

export default stockRoute;