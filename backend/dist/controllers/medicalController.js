"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientPrescriptions = exports.createPrescription = exports.getPatientMedicalHistory = exports.createMedicalRecord = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
/**
 * Create medical record
 */
const createMedicalRecord = async (req, res) => {
    try {
        const { patientId, diagnosis, treatment, symptoms, vitalSigns, notes, appointmentId } = req.body;
        const doctorId = req.user?.id;
        // Verify doctor-patient relationship
        if (appointmentId) {
            const appointment = await (0, db_1.queryOne)('SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2 AND patient_id = $3', [appointmentId, doctorId, patientId]);
            if (!appointment) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }
        }
        const recordId = (0, uuid_1.v4)();
        await (0, db_1.query)(`INSERT INTO medical_records 
       (id, patient_id, doctor_id, appointment_id, diagnosis, treatment, symptoms, vital_signs, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            recordId, patientId, doctorId, appointmentId || null,
            diagnosis, treatment, symptoms || null,
            vitalSigns ? JSON.stringify(vitalSigns) : null,
            notes || null,
        ]);
        res.status(201).json({
            success: true,
            message: 'Medical record created',
            data: { id: recordId },
        });
    }
    catch (error) {
        console.error('Create medical record error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating medical record',
        });
    }
};
exports.createMedicalRecord = createMedicalRecord;
/**
 * Get patient medical history
 */
const getPatientMedicalHistory = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Verify access
        if (req.user?.role === 'patient' && req.user?.id !== patientId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const records = await (0, db_1.queryMany)(`SELECT m.id, m.diagnosis, m.treatment, m.symptoms, m.notes, m.created_at,
              u.first_name, u.last_name
       FROM medical_records m
       JOIN users u ON m.doctor_id = u.id
       WHERE m.patient_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`, [patientId, limit, offset]);
        res.json({
            success: true,
            data: records,
            pagination: {
                page: Number(page),
                limit: Number(limit),
            },
        });
    }
    catch (error) {
        console.error('Get medical history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching medical history',
        });
    }
};
exports.getPatientMedicalHistory = getPatientMedicalHistory;
/**
 * Create prescription
 */
const createPrescription = async (req, res) => {
    try {
        const { patientId, medicalRecordId, medications, notes, expiryDate } = req.body;
        const doctorId = req.user?.id;
        // Verify doctor-patient relationship through medical record
        const record = await (0, db_1.queryOne)('SELECT * FROM medical_records WHERE id = $1 AND doctor_id = $2 AND patient_id = $3', [medicalRecordId, doctorId, patientId]);
        if (!record) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }
        const prescriptionId = (0, uuid_1.v4)();
        await (0, db_1.query)(`INSERT INTO prescriptions 
       (id, patient_id, doctor_id, medical_record_id, medications, notes, expiry_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`, [
            prescriptionId, patientId, doctorId, medicalRecordId,
            JSON.stringify(medications), notes || null, expiryDate,
        ]);
        res.status(201).json({
            success: true,
            message: 'Prescription created',
            data: { id: prescriptionId, status: 'active' },
        });
    }
    catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating prescription',
        });
    }
};
exports.createPrescription = createPrescription;
/**
 * Get patient prescriptions
 */
const getPatientPrescriptions = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Verify access
        if (req.user?.role === 'patient' && req.user?.id !== patientId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        let sql = `
      SELECT p.id, p.medications, p.notes, p.expiry_date, p.status, p.created_at,
             u.first_name, u.last_name
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = $1
    `;
        const params = [patientId];
        if (status) {
            sql += ` AND p.status = $2`;
            params.push(status);
        }
        sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const prescriptions = await (0, db_1.queryMany)(sql, params);
        res.json({
            success: true,
            data: prescriptions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
            },
        });
    }
    catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching prescriptions',
        });
    }
};
exports.getPatientPrescriptions = getPatientPrescriptions;
//# sourceMappingURL=medicalController.js.map