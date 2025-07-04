import { StockNotification } from "../../../types/stock.type";
import { prismaClient } from "../../config";
import { PayloadStoreStockList } from "../../types/stock.type";

function linearSearch(stockList: any, targetStatus: string) {
  const found = [];
  for (let i = 0; i < stockList.length; i++) {
    if (stockList[i].status === targetStatus) {
      found.push(stockList[i]);
    }
  }
  return found;
}

export async function notificationStockLinearLength() {
    let result: StockNotification = {
        length: 0,
        data: [],
        lowStock: [],
        outOfStock: []
    };

    const storeStocks = await prismaClient.storeStock.findMany(
        {
            select: {
                status: true,
                quantity: true,
                product: {
                    select: {
                        name: true,
                        threshold: true,
                    },
                },
                store: {
                    select: {
                        name: true,
                    },
                },
            }
        }
    );

    const warehouseStocks = await prismaClient.wareHouseStock.findMany({
        select:{
            status: true,
            quantity: true,
            product: {
                select: {
                    name: true,
                    threshold: true,
                },
            },
        }
    });

    const outOfStockStore = linearSearch(storeStocks, 'outOfStock');
    const lowStockStore = linearSearch(storeStocks, 'lowStock');
    const outOfStockWarehouse = linearSearch(warehouseStocks, 'outOfStock');
    const lowStockWarehouse = linearSearch(warehouseStocks, 'lowStock');

    for (const stock of outOfStockStore) {
    result.outOfStock.push({
      productName: stock.product.name,
      location: stock.store.name,
    });
    result.data.push({
      status: stock.status,
      product: {
        name: stock.product.name,
      },
      location: stock.store.name,
    });
    result.length += 1;
  }

  for (const stock of lowStockStore) {
    result.lowStock.push({
      productName: stock.product.name,
      quantity: stock.quantity,
      location: stock.store.name,
    });
    result.data.push({
      status: stock.status,
      product: {
        name: stock.product.name,
      },
      location: stock.store.name,
    });
    result.length += 1;
  }

  for (const stock of outOfStockWarehouse) {
    result.outOfStock.push({
      productName: stock.product.name,
      location: "Gudang",
    });
    result.data.push({
      status: stock.status,
      product: {
        name: stock.product.name,
      },
      location: "Gudang",
    });
    result.length += 1;
  }

  for (const stock of lowStockWarehouse) {
    result.lowStock.push({
      productName: stock.product.name,
      quantity: stock.quantity,
      location: "Gudang",
    });
    result.data.push({
      status: stock.status,
      product: {
        name: stock.product.name,
      },
      location: "Gudang",
    });
    result.length += 1;
  }

  return result;
}
// for (let i = 0; i < storeStocks.length; i++) {
//     const stock = storeStocks[i];

//     if (stock.status === 'outOfStock') {
//         if (!result.outOfStock) {
//             result.outOfStock = [];
//         }
//         result.outOfStock.push({
//             productName: stock.product.name,
//             location: stock.store.name,
//         });
//         result.data.push({
//             status: stock.status,
//             product: {
//                 name: stock.product.name,
//             },
//             location: stock.store.name,
//         });
//         result.length += 1;
//     } else if (stock.status === 'lowStock') {
//         if (!result.lowStock) {
//             result.lowStock = [];
//         }
//         result.lowStock.push({
//             productName: stock.product.name,
//             quantity: stock.quantity,
//             location: stock.store.name,
//         });
//         result.data.push({
//             status: stock.status,
//             product: {
//                 name: stock.product.name,
//             },
//             location: stock.store.name,
//         });
//         result.length += 1;
//     }
// }

// for (let i = 0; i < warehouseStocks.length; i++) {
//     const stock = warehouseStocks[i];

//     if (stock.status === 'outOfStock') {
//         if (!result.outOfStock) {
//             result.outOfStock = [];
//         }
//         result.outOfStock.push({
//             productName: stock.product.name,
//             location: "Gudang",
//         });
//         result.data.push({
//             status: stock.status,
//             product: {
//                 name: stock.product.name,
//             },
//             location: "Gudang",
//         });
//         result.length += 1;
//     } else if (stock.status === 'lowStock') {
//         if (!result.lowStock) {
//             result.lowStock = [];
//         }
//         result.lowStock.push({
//             productName: stock.product.name,
//             quantity: stock.quantity,
//             location: "Gudang",
//         });
//         result.data.push({
//             status: stock.status,
//             product: {
//                 name: stock.product.name,
//             },
//             location: "Gudang",
//         });
//         result.length += 1;
//     }

// }

export const getStoreStockData = (data: PayloadStoreStockList[]) => {
    return data.map((item) => ({
        id: item.id_store_stock,
        quantity: item.quantity,
        status: item.status,
        product: {
            id: item.product.id_product,
            name: item.product.name,
            brand: {
                id: item.product.brand.id_brand,
                name: item.product.brand.name,
            }
        },
        stock: item.stock,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    }));
}