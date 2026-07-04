import { queryOne } from '../db';

export async function doctorCanAccessPatient(doctorId: string, patientId: string) {
  const relation = await queryOne(
    `SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2
     UNION
     SELECT 1 FROM medical_records WHERE doctor_id = $1 AND patient_id = $2
     LIMIT 1`,
    [doctorId, patientId]
  );

  return Boolean(relation);
}

export async function secretaryCanAccessDoctor(secretaryId: string, doctorId: string) {
  const relation = await queryOne(
    'SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2 LIMIT 1',
    [secretaryId, doctorId]
  );

  return Boolean(relation);
}

export async function userCanAccessPatient(user: { id?: string; role?: string } | undefined, patientId: string) {
  if (!user?.id || !user?.role) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'patient') return user.id === patientId;
  if (user.role === 'doctor') return doctorCanAccessPatient(user.id, patientId);
  if (user.role === 'secretary') {
    const relation = await queryOne(
      `SELECT 1
       FROM secretaries s
       WHERE s.id = $1
         AND EXISTS (
           SELECT 1 FROM appointments a WHERE a.doctor_id = s.doctor_id AND a.patient_id = $2
           UNION
           SELECT 1 FROM medical_records mr WHERE mr.doctor_id = s.doctor_id AND mr.patient_id = $2
         )
       LIMIT 1`,
      [user.id, patientId]
    );
    return Boolean(relation);
  }
  return false;
}

export async function getUserRole(userId: string) {
  return queryOne('SELECT role FROM users WHERE id = $1', [userId]);
}
