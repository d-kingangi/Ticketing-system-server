/**
 * Defines the type of product.
 * - simple: A standalone product with its own SKU, price, and quantity (e.g., a can of soda).
 * - variable: A product that has multiple variations, each with its own SKU, price, and quantity (e.g., a T-shirt with different sizes and colors).
 */
export enum ProductType {
    SIMPLE = 'simple',
    VARIABLE = 'variable',
}

/**
 * Represents a single attribute of a product variation, like "Color: Red" or "Size: Medium".
 */
export interface VariationAttribute {
    name: string; // e.g., 'Color', 'Size'
    value: string; // e.g., 'Red', 'Medium'
}

/**
 * Defines the available options for a variable product to help build UI selectors.
 * For example, a T-shirt might have options for "Color" and "Size".
 */
export interface VariationOption {
    name: string; // e.g., 'Color'
    values: string[]; // e.g., ['Red', 'Blue', 'Green']
}