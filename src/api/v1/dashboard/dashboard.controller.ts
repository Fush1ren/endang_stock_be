import { Request, Response } from "express";
import { responseAPI, responseAPIData, responseAPITable } from "../../utils";
import { prismaClient } from "../../config";
import { startOfYear, endOfYear, getMonth } from "date-fns";

function getRandomRGBA(opacity = 0.2): { backgroundColor: string; borderColor: string } {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    borderColor: `rgb(${r}, ${g}, ${b})`,
  };
}

export const getDashboardTotalData = async (_req: Request, res: Response) => {
    try {
        const totalProducts = await prismaClient.product.count();
        const totalBrands = await prismaClient.brand.count();
        const totalCategories = await prismaClient.category.count();
        const totalUnits = await prismaClient.unit.count();
        const totalProductInCompleted = await prismaClient.stockIn.count({
            where: {
                status: "completed",
            },
        });
        const totalProductInPending = await prismaClient.stockIn.count({
            where: {
                status: "pending",
            },
        });
        const totalProductOutCompleted = await prismaClient.stockOut.count({
            where: {
                status: "completed",
            },
        });
        const totalProductOutPending = await prismaClient.stockOut.count({
            where: {
                status: "pending",
            },
        });
        const totalProductMutationCompleted = await prismaClient.stockMutation.count({
            where: {
                status: "completed",
            },
        });
        const totalProductMutationPending = await prismaClient.stockMutation.count({
            where: {
                status: "pending",
            },
        });
        const totalStores = await prismaClient.store.count();
        const totalWarehouseStocks = await prismaClient.wareHouseStock.count();
        const totalUsers = await prismaClient.user.count();
        const totalRoles = await prismaClient.role.count();

        const data = {
            totalProducts,
            totalBrands,
            totalCategories,
            totalUnits,
            totalProductInCompleted,
            totalProductInPending,
            totalProductOutCompleted,
            totalProductOutPending,
            totalProductMutationCompleted,
            totalProductMutationPending,
            totalStores,
            totalWarehouseStocks,
            totalUsers,
            totalRoles,
        }

        responseAPIData(res, {
            status: 200,
            message: "Dashboard total data retrieved successfully",
            data: data,
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal Server Error",
        });
    }
}

export const getDashboardMinimumStock = async (_req: Request, res: Response) => {
    try {
        const products = await prismaClient.product.findMany({
            select: {
                id_product: true,
                name: true,
                threshold: true,
            }
        });

        const warehouseStocks = await prismaClient.wareHouseStock.findMany({
            select: {
                id_warehouse_stock: true,
                product: {
                    select: {
                        id_product: true,
                        name: true,
                        threshold: true,
                        code: true,
                        brand: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
                status: true,
                quantity: true,
            }
        });

        const storeStocks = await prismaClient.storeStock.findMany({
            select: {
                id_store_stock: true,
                product: {
                    select: {
                        id_product: true,
                        name: true,
                        threshold: true,
                        code: true,
                        brand: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
                store: {
                    select: {
                        name: true,
                    }
                },
                status: true,
                quantity: true,
            }
        });
        let lowStock = [] as {
            id?: number;
            codeProduct: string;
            brand?: string;
            productName: string;
            location: string;
            quantity: number;
        }[];
        for (const product of products) {
            const warehouseStock = warehouseStocks.find(stock => stock.product.id_product === product.id_product);
            const storeStock = storeStocks.filter(stock => stock.product.id_product === product.id_product);

            if (warehouseStock && warehouseStock.status === 'lowStock') {
                lowStock.push({
                    codeProduct: warehouseStock.product.code,
                    brand: warehouseStock.product.brand?.name,
                    productName: warehouseStock.product.name,
                    location: "Warehouse",
                    quantity: warehouseStock.quantity,
                });
            }

            for (const store of storeStock) {
                if (store.status === 'lowStock') {
                    lowStock.push({
                        codeProduct: store.product.code,
                        brand: store.product.brand?.name,
                        productName: store.product.name,
                        location: store.store.name,
                        quantity: store.quantity,
                    });
                }
            }
        }
        lowStock?.map((item, index) => {
            item.id = index + 1; // Assigning a unique ID for each low stock item
            return item;
        })
        responseAPITable(res, {
            status: 200,
            message: "Dashboard minimum stock data retrieved successfully",
            data: {
                totalRecords: lowStock.length,
                data: lowStock,
            },
        });
    } catch (error) {
        responseAPI(res, {
            status: 500,
            message: "Internal Server Error",
        });
    }
}

export const getStockInChartDataProduct = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    if (!year) {
      return responseAPI(res, {
        status: 400,
        message: "Year is required",
      });
    }

    const parsedYear = parseInt(year as string);
    const startDate = startOfYear(new Date(parsedYear, 0));
    const endDate = endOfYear(startDate);

    const stockInDetails = await prismaClient.stockInDetail.findMany({
      where: {
        stockIn: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        product: true,
        stockIn: true,
      },
    });

    const productMonthlyMap: Record<string, number[]> = {};

    for (const detail of stockInDetails) {
      const productName = detail.product.name;
      const monthIndex = getMonth(detail.stockIn.date); // 0 (Jan) - 11 (Dec)

      if (!productMonthlyMap[productName]) {
        productMonthlyMap[productName] = Array(12).fill(0);
      }

      productMonthlyMap[productName][monthIndex] += detail.quantity;
    }

    const labels = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];

    const datasets = Object.entries(productMonthlyMap).map(([productName, data]) => ({
        label: productName,
        data,
        backgroundColor: Array(12).fill(getRandomRGBA().backgroundColor),
        borderColor: Array(12).fill(getRandomRGBA().borderColor),
        borderWidth: 1,
    }));

    return responseAPIData(res, {
      status: 200,
      message: "Stock In chart data by product per month retrieved successfully",
      data: {
        labels,
        datasets,
      },
    });
  } catch (error) {
    console.error(error);
    return responseAPI(res, {
      status: 500,
      message: "Internal Server Error",
    });
  }
};

export const getStockOutChartDataProduct = async (req: Request, res: Response) => {
    try {
        const { year } = req.query;
    
        if (!year) {
        return responseAPI(res, {
            status: 400,
            message: "Year is required",
        });
        }
    
        const parsedYear = parseInt(year as string);
        const startDate = startOfYear(new Date(parsedYear, 0));
        const endDate = endOfYear(startDate);
    
        const stockOutDetails = await prismaClient.stockOutDetail.findMany({
        where: {
            stockOut: {
            date: {
                gte: startDate,
                lte: endDate,
            },
            },
        },
        include: {
            product: true,
            stockOut: true,
        },
        });
    
        const productMonthlyMap: Record<string, number[]> = {};
    
        for (const detail of stockOutDetails) {
            const productName = detail.product.name;
            const monthIndex = getMonth(detail.stockOut.date); // 0 (Jan) - 11 (Dec)
        
            if (!productMonthlyMap[productName]) {
                productMonthlyMap[productName] = Array(12).fill(0);
            }
        
            productMonthlyMap[productName][monthIndex] += detail.quantity;
        }
    
        const labels = [
            "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
        ];
    
        const datasets = Object.entries(productMonthlyMap).map(([productName, data]) => ({
            label: productName,
            data,
            backgroundColor: Array(12).fill(getRandomRGBA().backgroundColor),
            borderColor: Array(12).fill(getRandomRGBA().borderColor),
            borderWidth: 1,
        }));
    
        return responseAPIData(res, {
            status: 200,
            message: "Stock Out chart data by product per month retrieved successfully",
            data: {
                labels,
                datasets,
            },
        });
    } catch (error) {
        console.error(error);
        responseAPI(res, {
            status: 500,
            message: "Internal Server Error",
        });
    }
}

export const getStockMutationChartDataProduct = async (req: Request, res: Response) => {
    try {
        const { year } = req.query;

        if (!year) {
            return responseAPI(res, {
                status: 400,
                message: "Year is required",
            });
        }

        const parsedYear = parseInt(year as string);
        const startDate = startOfYear(new Date(parsedYear, 0));
        const endDate = endOfYear(startDate);

        const stockMutationDetails = await prismaClient.stockMutationDetail.findMany({
            where: {
                stockMutation: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
            },
            include: {
                product: true,
                stockMutation: true,
            },
        });

        const productMonthlyMap: Record<string, number[]> = {};

        for (const detail of stockMutationDetails) {
            const productName = detail.product.name;
            const monthIndex = getMonth(detail.stockMutation.date); // 0 (Jan) - 11 (Dec)

            if (!productMonthlyMap[productName]) {
                productMonthlyMap[productName] = Array(12).fill(0);
            }

            productMonthlyMap[productName][monthIndex] += detail.quantity;
        }

        const labels = [
            "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
        ];

        const datasets = Object.entries(productMonthlyMap).map(([productName, data]) => ({
            label: productName,
            data,
            backgroundColor: Array(12).fill(getRandomRGBA().backgroundColor),
            borderColor: Array(12).fill(getRandomRGBA().borderColor),
            borderWidth: 1,
        }));

        return responseAPIData(res, {
            status: 200,
            message: "Stock Mutation chart data by product per month retrieved successfully",
            data: {
                labels,
                datasets,
            },
        });
    } catch (error) {
        console.error(error);
        return responseAPI(res, {
            status: 500,
            message: "Internal Server Error",
        });
    }
}