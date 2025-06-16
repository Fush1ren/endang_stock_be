import { Router } from 'express';
import { createUnit, deleteUnit, getAllUnit, getUnitDropdown, updateUnit } from './unit.controller';
import { verifyToken } from '../../../middleware';

const unitRoute = Router();

unitRoute.get('/', verifyToken, getAllUnit);
unitRoute.get('/dropdown', verifyToken, getUnitDropdown);
unitRoute.post('/', verifyToken, createUnit);
unitRoute.put('/:id', verifyToken, updateUnit);
unitRoute.delete('/', verifyToken, deleteUnit);

export default unitRoute;