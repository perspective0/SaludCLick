"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllUsers = exports.approveDoctorRequest = exports.listDoctorRequests = void 0;
const auth_1 = require("../utils/auth");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mailer_1 = require("../utils/mailer");
const stripe_1 = require("../utils/stripe");
const DATA_FILE = path_1.default.join(__dirname, '../../data/doctor_requests.json');
async function getOrCreateDefaultCenter(client) {
    const centerResult = await client.query('SELECT id FROM health_centers LIMIT 1');
    if (centerResult.rowCount > 0) {
        return centerResult.rows[0].id;
    }
    const insertResult = await client.query('INSERT INTO health_centers (name, address, city, phone, email, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', ['SaludClick Network', 'No asignada', 'Virtual', '000-000-0000', 'admin@saludclick.com', 'Centro médico predeterminado para médicos registrados']);
    return insertResult.rows[0].id;
}
const listDoctorRequests = async (req, res) => {
    try {
        try {
            const result = await (0, db_1.query)('SELECT * FROM doctor_requests ORDER BY created_at DESC');
            return res.json({ success: true, data: result.rows });
        }
        catch (dbErr) {
            let existing = [];
            if (fs_1.default.existsSync(DATA_FILE)) {
                existing = JSON.parse(fs_1.default.readFileSync(DATA_FILE, 'utf8') || '[]');
            }
            return res.json({ success: true, data: existing });
        }
    }
    catch (err) {
        console.error('listDoctorRequests error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.listDoctorRequests = listDoctorRequests;
function splitName(fullName) {
    const parts = fullName.trim().split(' ');
    const firstName = parts.shift() || 'Doctor';
    const lastName = parts.join(' ') || 'SaludClick';
    return { firstName, lastName };
}
function generateRandomPassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
const approveDoctorRequest = async (req, res) => {
    try {
        const id = req.params.id;
        const request = await (0, db_1.queryOne)('SELECT * FROM doctor_requests WHERE id = $1', [id]);
        if (!request) {
            // fallback to file if DB is unavailable or request does not exist
            if (!fs_1.default.existsSync(DATA_FILE))
                return res.status(404).json({ success: false, message: 'Not found' });
            const existing = JSON.parse(fs_1.default.readFileSync(DATA_FILE, 'utf8') || '[]');
            const idx = existing.findIndex((x) => x.id === id);
            if (idx === -1)
                return res.status(404).json({ success: false, message: 'Not found' });
            existing[idx].status = 'approved';
            fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2), 'utf8');
            return res.json({ success: true, data: existing[idx], note: 'approved_locally' });
        }
        const { firstName, lastName } = splitName(request.name);
        const plainPassword = generateRandomPassword();
        const doctorPassword = plainPassword;
        let stripeCustomer = null;
        let stripeSubscription = null;
        const updatedRequest = await (0, db_1.transaction)(async (client) => {
            const updated = await client.query('UPDATE doctor_requests SET status = $1 WHERE id = $2 RETURNING *', ['approved', id]);
            const requestData = updated.rows[0];
            const existingUser = await client.query('SELECT id, role FROM users WHERE email = $1', [requestData.email]);
            const userId = existingUser.rowCount && existingUser.rowCount > 0 ? existingUser.rows[0].id : (0, uuid_1.v4)();
            const userRole = 'doctor';
            if (existingUser.rowCount === 0) {
                const hashedPassword = await (0, auth_1.hashPassword)(doctorPassword);
                await client.query('INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1,$2,$3,$4,$5,$6,$7)', [userId, requestData.email, hashedPassword, firstName, lastName, requestData.phone || null, userRole]);
            }
            else if (existingUser.rows[0].role !== userRole) {
                await client.query('UPDATE users SET role = $1 WHERE id = $2', [userRole, userId]);
            }
            const doctorExists = await client.query('SELECT id FROM doctors WHERE id = $1', [userId]);
            const centerId = await getOrCreateDefaultCenter(client);
            if (doctorExists.rowCount === 0) {
                await client.query('INSERT INTO doctors (id, health_center_id, license_number, years_experience, bio, consultation_price, is_verified, specialties, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
                    userId,
                    centerId,
                    requestData.license_number || '',
                    0,
                    `Solicitud aprobada desde ${requestData.clinic || 'SaludClick'}`,
                    0.0,
                    true,
                    [],
                    0,
                ]);
            }
            else {
                await client.query('UPDATE doctors SET license_number = $1, is_verified = $2 WHERE id = $3', [requestData.license_number || '', true, userId]);
            }
            return requestData;
        });
        try {
            if (process.env.STRIPE_SECRET_KEY) {
                stripeCustomer = await (0, stripe_1.createStripeCustomer)(updatedRequest.email, updatedRequest.name);
                if (stripeCustomer?.id) {
                    stripeSubscription = await (0, stripe_1.createDoctorSubscription)(stripeCustomer.id);
                }
            }
        }
        catch (stripeErr) {
            console.warn('Stripe integration failed:', stripeErr);
        }
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
        const subscriptionNote = stripeSubscription
            ? `\nTu suscripción se ha creado en Stripe con ID: ${stripeSubscription.id}\nEstado: ${stripeSubscription.status}\n`
            : process.env.STRIPE_SECRET_KEY
                ? '\nNo se pudo crear la suscripción Stripe automáticamente. Revisa la configuración.'
                : '\nStripe no está configurado, se omitió la creación de suscripción.';
        await (0, mailer_1.sendEmail)({
            to: updatedRequest.email,
            subject: 'Tu solicitud de médico ha sido aprobada',
            text: `Hola ${updatedRequest.name},

Tu solicitud ha sido aprobada y tu cuenta de médico ha sido creada en SaludClick.

Email: ${updatedRequest.email}
Contraseña temporal: ${doctorPassword}

Por favor cambia tu contraseña la primera vez que inicies sesión.
Inicia sesión aquí: ${loginUrl}
${subscriptionNote}

Gracias,
Equipo SaludClick`,
        });
        return res.json({
            success: true,
            data: updatedRequest,
            doctorCreated: true,
            stripe: {
                customerId: stripeCustomer?.id || null,
                subscriptionId: stripeSubscription?.id || null,
                status: stripeSubscription?.status || null,
            },
        });
    }
    catch (err) {
        console.error('approveDoctorRequest error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.approveDoctorRequest = approveDoctorRequest;
const listAllUsers = async (req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.role, 
        u.phone, 
        u.is_active, 
        u.created_at 
      FROM users u 
      ORDER BY u.created_at DESC`);
        return res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    }
    catch (err) {
        console.error('listAllUsers error', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};
exports.listAllUsers = listAllUsers;
exports.default = { listDoctorRequests: exports.listDoctorRequests, approveDoctorRequest: exports.approveDoctorRequest, listAllUsers: exports.listAllUsers };
//# sourceMappingURL=adminController.js.map