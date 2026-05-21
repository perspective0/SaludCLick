"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthCenters = exports.updateDoctorProfile = exports.getDoctorById = exports.getDoctors = void 0;
const db_1 = require("../db");
/**
 * Get all doctors with filters
 */
const getDoctors = async (req, res) => {
    try {
        const { specialty, healthCenter, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let sql = `
      SELECT 
        d.id, d.license_number, 
        u.first_name, u.last_name, u.email, u.avatar,
        d.specialties, d.bio, d.years_experience, d.consultation_price,
        d.average_rating, d.health_center_id, hc.name as health_center_name
      FROM doctors d
      JOIN users u ON d.id = u.id
      JOIN health_centers hc ON d.health_center_id = hc.id
      WHERE d.is_verified = true
    `;
        const params = [];
        if (specialty) {
            sql += ` AND $${params.length + 1} = ANY(d.specialties)`;
            params.push(specialty);
        }
        if (healthCenter) {
            sql += ` AND d.health_center_id = $${params.length + 1}`;
            params.push(healthCenter);
        }
        sql += ` ORDER BY d.average_rating DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const doctors = await (0, db_1.queryMany)(sql, params);
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM doctors d WHERE d.is_verified = true';
        if (specialty)
            countSql += ` AND $1 = ANY(d.specialties)`;
        if (healthCenter)
            countSql += ` AND d.health_center_id = $${specialty ? 2 : 1}`;
        const countParams = [];
        if (specialty)
            countParams.push(specialty);
        if (healthCenter)
            countParams.push(healthCenter);
        const countResult = await (0, db_1.queryOne)(countSql, countParams.length > 0 ? countParams : undefined);
        const total = countResult?.total || 0;
        res.json({
            success: true,
            data: doctors,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: Number(total),
            },
        });
    }
    catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctors',
        });
    }
};
exports.getDoctors = getDoctors;
/**
 * Get doctor by ID
 */
const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await (0, db_1.queryOne)(`SELECT 
        d.id, d.license_number, d.bio, d.years_experience, d.consultation_price,
        d.average_rating, d.specialties, d.health_center_id,
        u.first_name, u.last_name, u.email, u.phone, u.avatar,
        hc.name as health_center_name, hc.address, hc.city
      FROM doctors d
      JOIN users u ON d.id = u.id
      JOIN health_centers hc ON d.health_center_id = hc.id
      WHERE d.id = $1`, [id]);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found',
            });
        }
        // Get reviews
        const reviews = await (0, db_1.queryMany)(`SELECT r.id, r.rating, r.comment, u.first_name, u.last_name, r.created_at
       FROM reviews r
       JOIN users u ON r.patient_id = u.id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`, [id]);
        // Get availability
        const availability = await (0, db_1.queryMany)('SELECT day_of_week, start_time, end_time, is_break FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week', [id]);
        res.json({
            success: true,
            data: {
                ...doctor,
                reviews,
                availability,
            },
        });
    }
    catch (error) {
        console.error('Get doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching doctor',
        });
    }
};
exports.getDoctorById = getDoctorById;
/**
 * Update doctor profile
 */
const updateDoctorProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { bio, consultationPrice, availability } = req.body;
        // Verify ownership
        if (req.user?.id !== id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        // Update doctor profile
        if (bio !== undefined || consultationPrice !== undefined) {
            const updates = [];
            const params = [];
            if (bio !== undefined) {
                updates.push(`bio = $${params.length + 1}`);
                params.push(bio);
            }
            if (consultationPrice !== undefined) {
                updates.push(`consultation_price = $${params.length + 1}`);
                params.push(consultationPrice);
            }
            params.push(id);
            await (0, db_1.query)(`UPDATE doctors SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        }
        // Update availability
        if (availability && Array.isArray(availability)) {
            await (0, db_1.query)('DELETE FROM doctor_availability WHERE doctor_id = $1', [id]);
            for (const slot of availability) {
                await (0, db_1.query)(`INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_break)
           VALUES ($1, $2, $3, $4, $5)`, [id, slot.dayOfWeek, slot.startTime, slot.endTime, slot.isBreak || false]);
            }
        }
        res.json({
            success: true,
            message: 'Doctor profile updated successfully',
        });
    }
    catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating doctor profile',
        });
    }
};
exports.updateDoctorProfile = updateDoctorProfile;
/**
 * Get health centers
 */
const getHealthCenters = async (req, res) => {
    try {
        const healthCenters = await (0, db_1.queryMany)('SELECT id, name, address, city, phone, email, image, description FROM health_centers ORDER BY name');
        res.json({
            success: true,
            data: healthCenters,
        });
    }
    catch (error) {
        console.error('Get health centers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching health centers',
        });
    }
};
exports.getHealthCenters = getHealthCenters;
//# sourceMappingURL=doctorController.js.map