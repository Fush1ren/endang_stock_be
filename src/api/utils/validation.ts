import { BodyCreateStockIn, BodyCreateStockMutation, BodyCreateStockOut } from "../../dto/stock.dto";
import { BodyUpdateStockIn } from "../../types/stock.type";

export function validateStockInPayload(data: BodyCreateStockIn): { valid: boolean; message?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: "Invalid payload format" };
  }

  if (!data.transactionCode || typeof data.transactionCode !== 'string') {
    return { valid: false, message: "stockInCode is required and must be a string" };
  }

  if (!data.date || isNaN(Date.parse(new Date(data.date).toString()))) {
    return { valid: false, message: "Valid date is required" };
  }

  if (typeof data.toWarehouse !== 'boolean') {
    return { valid: false, message: "toWarehouse must be a boolean" };
  }

  if (!data.toWarehouse && (typeof data.storeId !== 'number' || isNaN(data.storeId))) {
    return { valid: false, message: "storeId is required when toWarehouse is false" };
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    return { valid: false, message: "products must be a non-empty array" };
  }

  for (const [index, product] of data.products.entries()) {
    if (typeof product !== 'object' || product === null) {
      return { valid: false, message: `Product at index ${index} is not valid` };
    }

    if (typeof product.productId !== 'number' || isNaN(product.productId)) {
      return { valid: false, message: `productId at index ${index} must be a number` };
    }

    if (typeof product.quantity !== 'number' || product.quantity <= 0) {
      return { valid: false, message: `quantity at index ${index} must be a positive number` };
    }
  }

  return { valid: true };
}

export function validateStockOutPayload(data: BodyCreateStockOut): { valid: boolean; message?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: "Invalid payload format" };
  }

  if (!data.transactionCode || typeof data.transactionCode !== 'string') {
    return { valid: false, message: "stockOutCode is required and must be a string" };
  }

  if (!data.date || isNaN(Date.parse(new Date(data.date).toString()))) {
    return { valid: false, message: "Valid date is required" };
  }

  if (typeof data.storeId !== 'number' || isNaN(data.storeId)) {
    return { valid: false, message: "storeId is required and must be a number" };
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    return { valid: false, message: "products must be a non-empty array" };
  }

  for (const [index, product] of data.products.entries()) {
    if (typeof product !== 'object' || product === null) {
      return { valid: false, message: `Product at index ${index} is not valid` };
    }

    if (typeof product.productId !== 'number' || isNaN(product.productId)) {
      return { valid: false, message: `productId at index ${index} must be a number` };
    }

    if (typeof product.quantity !== 'number' || product.quantity <= 0) {
      return { valid: false, message: `quantity at index ${index} must be a positive number` };
    }
  }

  return { valid: true };
}

export function validateStockMutationPayload(data: BodyCreateStockMutation): { valid: boolean; message?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: "Invalid payload format" };
  }

  if (!data.transactionCode || typeof data.transactionCode !== 'string') {
    return { valid: false, message: "stockMutationCode is required and must be a string" };
  }

  if (!data.date || isNaN(Date.parse(new Date(data.date).toString()))) {
    return { valid: false, message: "Valid date is required" };
  }

  if (typeof data.fromWarehouse !== 'boolean') {
    return { valid: false, message: "fromWarehouse must be a boolean" };
  }

  if (data.fromWarehouse === false && (typeof data.fromStoreId !== 'number' || isNaN(data.fromStoreId))) {
    return { valid: false, message: "fromStoreId is required when fromWarehouse is true" };
  }

  if (typeof data.toStoreId !== 'number' || isNaN(data.toStoreId)) {
    return { valid: false, message: "toStoreId is required and must be a number" };
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    return { valid: false, message: "products must be a non-empty array" };
  }

  for (const [index, product] of data.products.entries()) {
    if (typeof product !== 'object' || product === null) {
      return { valid: false, message: `Product at index ${index} is not valid` };
    }

    if (typeof product.productId !== 'number' || isNaN(product.productId)) {
      return { valid: false, message: `productId at index ${index} must be a number` };
    }

    if (typeof product.quantity !== 'number' || product.quantity <= 0) {
      return { valid: false, message: `quantity at index ${index} must be a positive number` };
    }
  }

  return { valid: true };
}

export function validateStockInUpdatePayload(data: BodyUpdateStockIn): { valid: boolean; message?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: "Invalid payload format" };
  }

  if (!data.date || isNaN(Date.parse(new Date(data.date).toString()))) {
    return { valid: false, message: "Valid date is required" };
  }

  if (typeof data.toWarehouse !== 'boolean') {
    return { valid: false, message: "toWarehouse must be a boolean" };
  }

  if (!data.toWarehouse && (typeof data.toStoreId !== 'number' || isNaN(data.toStoreId))) {
    return { valid: false, message: "toStoreId is required when toWarehouse is false" };
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    return { valid: false, message: "products must be a non-empty array" };
  }

  for (const [index, product] of data.products.entries()) {
    if (typeof product !== 'object' || product === null) {
      return { valid: false, message: `Product at index ${index} is not valid` };
    }

    if (typeof product.productId !== 'number' || isNaN(product.productId)) {
      return { valid: false, message: `productId at index ${index} must be a number` };
    }

    if (typeof product.quantity !== 'number' || product.quantity <= 0) {
      return { valid: false, message: `quantity at index ${index} must be a positive number` };
    }
  }

  return { valid: true };
}