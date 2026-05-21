import { Request, Response } from 'express';
import { query } from '../db';
import fs from 'fs';
import path from 'path';
import { sendAdminNotification } from '../utils/mailer';

export const createDoctorRequest = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, clinic, license, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const insertText = `INSERT INTO doctor_requests (name, email, phone, clinic, license_number, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
    const values = [name, email, phone || null, clinic || null, license || null, message || null];

    try {
      const result = await query(insertText, values);
      // send admin notification
      await sendAdminNotification(result.rows[0]);
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (dbErr: any) {
      // Fallback: write to a local JSON file if DB is unavailable
      console.warn('Database unavailable, falling back to file storage for doctor requests', dbErr.code || dbErr.message);
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const filePath = path.join(dataDir, 'doctor_requests.json');
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

      let existing: any[] = [];
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          existing = JSON.parse(raw || '[]');
        }
      } catch (e) {
        existing = [];
      }

      existing.push(record);
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');

      // attempt to notify admin via email about the local-saved request
      try {
        await sendAdminNotification({
          subject: 'Nueva solicitud de médico (guardada localmente)',
          text: `Nueva solicitud de médico:\n\nNombre: ${record.name}\nEmail: ${record.email}\nTeléfono: ${record.phone || '-'}\nClínica: ${record.clinic || '-'}\nLicencia: ${record.license || '-'}\nMensaje: ${record.message || '-'}\n`,
        });
      } catch (e) {
        console.warn('Failed to send admin notification for local request', e);
      }

      return res.status(201).json({ success: true, data: record, note: 'saved_locally' });
    }
  } catch (err: any) {
    console.error('createDoctorRequest error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default { createDoctorRequest };

