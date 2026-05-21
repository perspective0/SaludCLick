import { Pool, PoolClient } from 'pg';
declare const pool: Pool;
/**
 * Get a connection from the pool
 */
export declare function getConnection(): Promise<PoolClient>;
/**
 * Execute a query
 */
export declare function query(text: string, params?: any[]): Promise<import("pg").QueryResult<any>>;
/**
 * Get a single row
 */
export declare function queryOne(text: string, params?: any[]): Promise<any>;
/**
 * Get multiple rows
 */
export declare function queryMany(text: string, params?: any[]): Promise<any[]>;
/**
 * Execute in transaction
 */
export declare function transaction(callback: (client: PoolClient) => Promise<any>): Promise<any>;
export default pool;
//# sourceMappingURL=index.d.ts.map