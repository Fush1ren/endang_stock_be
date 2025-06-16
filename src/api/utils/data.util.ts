import { Prisma } from "@prisma/client";
import { IQuery, ISortParams } from "../types/data.type";

export const getPage = (page: number, limit: number): IQuery => {
    const skip = (page * limit) - limit;
    const take = limit;
    return {
        take,
        skip
    }
}

export function parseSort({
  sortBy,
  sortOrder
}: ISortParams): Prisma.WareHouseStockFindManyArgs['orderBy'] | undefined {
  if (!sortBy) return undefined

  const sortOrderValue = Number(sortOrder ?? 1)
  const direction: 'asc' | 'desc' = sortOrderValue === -1 ? 'desc' : 'asc'

  const keys = sortBy.split('.').reverse()

  let nestedOrder: any = direction
  for (const key of keys) {
    nestedOrder = { [key]: nestedOrder }
  }

  return nestedOrder
}