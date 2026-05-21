"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeToken = exports.comparePassword = exports.hashPassword = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
/**
 * Generate JWT token
 */
const generateToken = (payload) => {
    return (0, jsonwebtoken_1.sign)(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};
exports.generateToken = generateToken;
/**
 * Verify JWT token
 */
const verifyToken = (token) => {
    return (0, jsonwebtoken_1.verify)(token, JWT_SECRET);
};
exports.verifyToken = verifyToken;
/**
 * Hash password
 */
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(10);
    return bcryptjs_1.default.hash(password, salt);
};
exports.hashPassword = hashPassword;
/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
    return (0, jsonwebtoken_1.decode)(token);
};
exports.decodeToken = decodeToken;
//# sourceMappingURL=auth.js.map