"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided',
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};
exports.authMiddleware = authMiddleware;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
            });
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=auth.js.map