import { Router } from "express";
import { getDashboardMinimumStock, getDashboardTotalData, getStockInChartDataProduct, getStockMutationChartDataProduct, getStockOutChartDataProduct } from "./dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.get('/total-data', getDashboardTotalData);
dashboardRouter.get('/low-stock', getDashboardMinimumStock);
dashboardRouter.get('/chart/stock-in', getStockInChartDataProduct);
dashboardRouter.get('/chart/stock-out', getStockOutChartDataProduct);
dashboardRouter.get('/chart/stock-mutation', getStockMutationChartDataProduct);
export default dashboardRouter;