import { Request } from 'express';
import { PoolClient } from 'pg';
import { query } from '../db';

type AuditPayload = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
  oldData?: any;
  newData?: any;
};

export async function auditClinicalAction(req: Request, payload: AuditPayload, client?: PoolClient) {
  const params = [
    payload.userId || req.user?.id || null,
    payload.action,
    payload.entity,
    payload.entityId || null,
    payload.patientId || null,
    payload.doctorId || null,
    payload.oldData ? JSON.stringify(payload.oldData) : null,
    payload.newData ? JSON.stringify(payload.newData) : null,
    req.ip || null,
    req.headers['user-agent'] || null,
  ];

  const sql = `
    INSERT INTO audit_logs
      (user_id, action, entity, entity_id, patient_id, doctor_id, old_data, new_data, ip_address, user_agent)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `;

  if (client) {
    await client.query(sql, params);
    return;
  }

  await query(sql, params);
}
