/**
 * @file permissions.ts
 * @description Application permission constants.
 * Defines all available permissions used for role-based access control (RBAC).
 * These permissions can be assigned to roles or individual users.
 */

/**
 * System permissions used for authorization
 * Each permission controls access to specific features
 */
export const PERMISSIONS = {
  /** Permission to create and add new products */
  ADD_PRODUCT: 'ADD_PRODUCT',
  
  /** Permission to view stock levels and inventory information */
  VIEW_STOCK: 'VIEW_STOCK',
  
  /** Permission to record items being added to inventory (scan in) */
  SCAN_IN: 'SCAN_IN',
  
  /** Permission to record items being removed from inventory (scan out) */
  SCAN_OUT: 'SCAN_OUT',
  
  /** Permission to manage users and their roles */
  MANAGE_USERS: 'MANAGE_USERS',
  
  /** Permission to create and register new assets */
  ADD_ASSET: 'ADD_ASSET',
  
  /** Permission to view asset information and details */
  VIEW_ASSET: 'VIEW_ASSET',
  
  /** Permission to update existing asset information */
  EDIT_ASSET: 'EDIT_ASSET',
  
  /** Permission to delete assets from the system */
  DELETE_ASSET: 'DELETE_ASSET'
};