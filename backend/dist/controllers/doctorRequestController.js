"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDoctorRequest = void 0;
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mailer_1 = require("../utils/mailer");
const createDoctorRequest = async (req, res) => {
    try {
        const { name, email, phone, clinic, license, message } = req.body;
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }
        const insertText = `INSERT INTO doctor_requests (name, email, phone, clinic, license_number, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
        const values = [name, email, phone || null, clinic || null, license || null, message || null];
        try {
            const result = await (0, db_1.query)(insertText, values);
            // send admin notification
            await (0, mailer_1.sendAdminNotification)(result.rows[0]);
            return res.status(201).json({ success: true, data: result.rows[0] });
        }
        catch (dbErr) {
            // Fallback: write to a local JSON file if DB is unavailable
            console.warn('Database unavailable, falling back to file storage for doctor requests', dbErr.code || dbErr.message);
            const dataDir = path_1.default.join(__dirname, '../../data');
            if (!fs_1.default.existsSync(dataDir))
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            const filePath = path_1.default.join(dataDir, 'doctor_requests.json');
            const record = {
                id: Date.now().toString(),
                name,
                email,
                phone: phone || null,
                clinic: clinic || null,
                license: license || null,
                message: message || null,
                status: 'pending',
                created_at: new Date().toISOString(),
            };
            let existing = [];
            try {
                if (fs_1.default.existsSync(filePath)) {
                    const raw = fs_1.default.readFileSync(filePath, 'utf8');
                    existing = JSON.parse(raw || '[]');
                }
            }
            catch (e) {
                existing = [];
            }
            existing.push(record);
            fs_1.default.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
            // attempt to notify admin via email about the local-saved request
            try {
                await (0, mailer_1.sendAdminNotification)({
                    subject: 'Nueva solicitud de médico (guardada localmente)',
                    text: `Nueva solicitud de médico:\n\nNombre: ${record.name}\nEmail: ${record.email}\nTeléfono: ${record.phone || '-'}\nClínica: ${record.clinic || '-'}\nLicencia: ${record.license || '-'}\nMensaje: ${record.message || '-'}\n`,
                });
            }
            catch (e) {
                console.warn('Failed to send admin notification for local request', e);
            }
            return res.status(201).json({ success: true, data: record, note: 'saved_locally' });
        }
    }
    catch (err) {
        console.error('createDoctorRequest error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createDoctorRequest = createDoctorRequest;
exports.default = { createDoctorRequest: exports.createDoctorRequest };
//# sourceMappingURL=doctorRequestController.js.map