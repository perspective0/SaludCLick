"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrescriptionById = exports.getPatientPrescriptions = exports.createPrescription = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
/**
 * Create a prescription (doctor only)
 */
const createPrescription = async (req, res) => {
    try {
        const { patientId, appointmentId, medications, instructions, expiresAt } = req.body;
        const doctorId = req.user?.id;
        if (req.user?.role !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Only doctors can create prescriptions' });
        }
        const prescriptionId = (0, uuid_1.v4)();
        await (0, db_1.query)(`INSERT INTO prescriptions (id, patient_id, doctor_id, appointment_id, medications, instructions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            prescriptionId,
            patientId,
            doctorId,
            appointmentId || null,
            JSON.stringify(medications),
            instructions || null,
            expiresAt || null,
        ]);
        res.status(201).json({
            success: true,
            message: 'Prescription created successfully',
            data: { id: prescriptionId },
        });
    }
    catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({ success: false, message: 'Error creating prescription' });
    }
};
exports.createPrescription = createPrescription;
/**
 * Get prescriptions for a patient
 */
const getPatientPrescriptions = async (req, res) => {
    try {
        const { patientId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (userRole === 'patient' && userId !== patientId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const prescriptions = await (0, db_1.queryMany)(`SELECT p.id, p.medications, p.instructions, p.expires_at, p.created_at,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              d.specialties
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN doctors d ON p.doctor_id = d.id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC`, [patientId]);
        res.json({ success: true, data: prescriptions });
    }
    catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({ success: false, message: 'Error fetching prescriptions' });
    }
};
exports.getPatientPrescriptions = getPatientPrescriptions;
/**
 * Get single prescription
 */
const getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const prescription = await (0, db_1.queryOne)(`SELECT p.id, p.medications, p.instructions, p.expires_at, p.created_at,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN users pu ON p.patient_id = pu.id
       WHERE p.id = $1`, [id]);
        if (!prescription) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }
        res.json({ success: true, data: prescription });
    }
    catch (error) {
        console.error('Get prescription error:', error);
        res.status(500).json({ success: false, message: 'Error fetching prescription' });
    }
};
exports.getPrescriptionById = getPrescriptionById;
//# sourceMappingURL=prescriptionsController.js.map