import { StockItem } from "../../types/stock.type";

export function linearSearchStock(
  stocks: StockItem[],
  targetStatuses: ("lowStock" | "outOfStock")[]
): StockItem[] {
  const result: StockItem[] = [];
  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    if (
      stock.status === targetStatuses[0] ||
      stock.status === targetStatuses[1]
    ) {
      result.push(stock);
    }
  }
  return result;
}
