"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.query = query;
exports.queryOne = queryOne;
exports.queryMany = queryMany;
exports.transaction = transaction;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/saludclick',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
/**
 * Get a connection from the pool
 */
async function getConnection() {
    return pool.connect();
}
/**
 * Execute a query
 */
async function query(text, params) {
    try {
        const result = await pool.query(text, params);
        return result;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}
/**
 * Get a single row
 */
async function queryOne(text, params) {
    const result = await query(text, params);
    return result.rows[0] || null;
}
/**
 * Get multiple rows
 */
async function queryMany(text, params) {
    const result = await query(text, params);
    return result.rows || [];
}
/**
 * Execute in transaction
 */
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
exports.default = pool;
//# sourceMappingURL=index.js.map