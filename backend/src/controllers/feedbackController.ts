import { Request, Response } from 'express';
import { query, queryOne } from '../db';

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureFeedbackTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS feedback_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      type VARCHAR(30) NOT NULL,
      audience VARCHAR(30) NOT NULL DEFAULT 'general',
      subject VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      admin_response TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )
  `);
}

export const createFeedback = async (req: Request, res: Response) => {
  try {
    await ensureFeedbackTable();

    const type = cleanText(req.body.type) || 'question';
    const audience = cleanText(req.body.audience) || req.user?.role || 'general';
    const subject = cleanText(req.body.subject);
    const message = cleanText(req.body.message);
    const allowedTypes = ['question', 'recommendation'];
    const allowedAudiences = ['general', 'patient', 'doctor', 'secretary', 'admin'];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipo no permitido' });
    }

    if (!allowedAudiences.includes(audience)) {
      return res.status(400).json({ success: false, message: 'Audiencia no permitida' });
    }

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Asunto y mensaje son obligatorios' });
    }

    const result = await query(
      `INSERT INTO feedback_items (user_id, type, audience, subject, message)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [req.user?.id || null, type, audience, subject, message]
    );

    return res.status(201).json({
      success: true,
      message: 'Solicitud recibida exitosamente',
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('createFeedback error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listFeedback = async (req: Request, res: Response) => {
  try {
    await ensureFeedbackTable();

    const { type, status, audience } = req.query;
    const params: any[] = [];
    let sql = `
      SELECT
        f.*,
        u.first_name,
        u.last_name,
        u.email,
        u.role
      FROM feedback_items f
      LEFT JOIN users u ON u.id = f.user_id
      WHERE 1=1`;

    if (type) {
      params.push(type);
      sql += ` AND f.type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND f.status = $${params.length}`;
    }

    if (audience) {
      params.push(audience);
      sql += ` AND f.audience = $${params.length}`;
    }

    sql += ' ORDER BY f.created_at DESC';

    const result = await query(sql, params);
    const summary = result.rows.reduce(
      (acc: any, item: any) => {
        acc.total += 1;
        acc[item.type] = (acc[item.type] || 0) + 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, question: 0, recommendation: 0, new: 0, reviewing: 0, resolved: 0, archived: 0 }
    );

    return res.json({ success: true, data: result.rows, summary });
  } catch (err: any) {
    console.error('listFeedback error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateFeedback = async (req: Request, res: Response) => {
  try {
    await ensureFeedbackTable();

    const { id } = req.params;
    const status = cleanText(req.body.status);
    const adminResponse = cleanText(req.body.adminResponse);
    const allowedStatuses = ['new', 'reviewing', 'resolved', 'archived'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado no permitido' });
    }

    const item = await queryOne('SELECT id FROM feedback_items WHERE id = $1', [id]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Entrada no encontrada' });
    }

    const result = await query(
      `UPDATE feedback_items
       SET status = $1::varchar,
           admin_response = $2,
           updated_at = CURRENT_TIMESTAMP,
           resolved_at = CASE WHEN $1::varchar = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE id = $3
       RETURNING *`,
      [status, adminResponse, id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('updateFeedback error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
