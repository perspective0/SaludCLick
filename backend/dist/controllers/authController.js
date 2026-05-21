"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.logout = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const auth_1 = require("../utils/auth");
const db_1 = require("../db");
const uuid_1 = require("uuid");
/**
 * Register a new user
 */
const register = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
        const { email, password, firstName, lastName, phone, role } = req.body;
        // Check if user exists
        const existingUser = await (0, db_1.queryOne)('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered',
            });
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Create user
        const userId = (0, uuid_1.v4)();
        await (0, db_1.query)('INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)', [userId, email, hashedPassword, firstName, lastName, phone || null, role]);
        // If patient, create patient record
        if (role === 'patient') {
            await (0, db_1.query)('INSERT INTO patients (id) VALUES ($1)', [userId]);
        }
        // Generate token
        const token = (0, auth_1.generateToken)({ id: userId, email, role });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: userId,
                    email,
                    firstName,
                    lastName,
                    role,
                },
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
        });
    }
};
exports.register = register;
/**
 * Login user
 */
const login = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        // Find user
        const user = await (0, db_1.queryOne)('SELECT id, email, password, first_name, last_name, role FROM users WHERE email = $1', [email]);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }
        // Compare password
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }
        // Generate token
        const token = (0, auth_1.generateToken)({ id: user.id, email: user.email, role: user.role });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
        });
    }
};
exports.login = login;
/**
 * Logout (client-side mostly)
 */
const logout = (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful',
    });
};
exports.logout = logout;
/**
 * Get current user
 */
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
        }
        const user = await (0, db_1.queryOne)('SELECT id, email, first_name, last_name, role, avatar FROM users WHERE id = $1', [req.user.id]);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=authController.js.map