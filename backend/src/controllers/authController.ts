import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { query, queryOne } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, email, hashedPassword, firstName, lastName, phone || null, role]
    );

    // If patient, create patient record
    if (role === 'patient') {
      await query(
        'INSERT INTO patients (id) VALUES ($1)',
        [userId]
      );
    }

    // Generate token
    const token = generateToken({ id: userId, email, role });

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
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find user
    const user = await queryOne(
      'SELECT id, email, password, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

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
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
    });
  }
};

/**
 * Logout (client-side mostly)
 */
export const logout = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await queryOne(
      'SELECT id, email, first_name, last_name, role, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};
