import { createAppointment, cancelAppointment } from '../src/controllers/appointmentController';
import { queryOne, query, queryMany } from '../src/db';

jest.mock('../src/db', () => ({
  queryOne: jest.fn(),
  query: jest.fn(),
  queryMany: jest.fn(),
}));

describe('Appointment controller', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates an appointment when the doctor exists and the slot is free', async () => {
    const req: any = {
      body: {
        doctorId: 'doctor-123',
        appointmentDate: '2026-06-15',
        appointmentTime: '10:00',
        reasonForVisit: 'Consulta general',
      },
      user: {
        id: 'patient-123',
        role: 'patient',
      },
    };

    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn();
    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    (queryOne as jest.Mock)
      .mockResolvedValueOnce({ id: 'patient-123' })
      .mockResolvedValueOnce({
        health_center_id: 'center-123',
        teleconsultation_enabled: false,
        vacation_mode: false,
      })
      .mockResolvedValueOnce({ health_center_id: 'center-123' })
      .mockResolvedValueOnce({
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      })
      .mockResolvedValueOnce(null);
    (query as jest.Mock).mockResolvedValue({});
    (queryMany as jest.Mock).mockResolvedValue([]);

    await createAppointment(req, res);

    expect(queryOne).toHaveBeenCalledWith(
      'SELECT id FROM patients WHERE id = $1',
      ['patient-123']
    );
    expect(queryOne).toHaveBeenCalledWith(
      'SELECT health_center_id, teleconsultation_enabled, vacation_mode FROM doctors WHERE id = $1',
      ['doctor-123']
    );
    expect(queryOne).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM appointments'),
      ['doctor-123', '2026-06-15', '10:00']
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO appointments'),
      expect.any(Array)
    );
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Appointment scheduled successfully',
      })
    );
  });

  it('cancels an appointment when the patient is authorized', async () => {
    const req: any = {
      params: { id: 'appointment-123' },
      body: { reason: 'Enfermedad' },
      user: { id: 'patient-123', role: 'patient' },
    };

    const jsonMock = jest.fn();
    const res: any = {
      json: jsonMock,
      status: jest.fn().mockReturnThis(),
    };

    (queryOne as jest.Mock).mockResolvedValueOnce({ patient_id: 'patient-123', doctor_id: 'doctor-123' });
    (query as jest.Mock).mockResolvedValue({});

    await cancelAppointment(req, res);

    expect(queryOne).toHaveBeenCalledWith(
      'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
      ['appointment-123']
    );
    expect(query).toHaveBeenCalledWith(
      'UPDATE appointments SET status = $1, canceled_at = NOW(), canceled_by = $2 WHERE id = $3',
      ['cancelled', 'patient-123', 'appointment-123']
    );
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Appointment cancelled successfully',
      })
    );
  });

  it('rejects cancellation when the patient does not own the appointment', async () => {
    const req: any = {
      params: { id: 'appointment-123' },
      body: { reason: 'No puedo asistir' },
      user: { id: 'other-patient', role: 'patient' },
    };

    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn();
    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    (queryOne as jest.Mock).mockResolvedValueOnce({ patient_id: 'patient-123', doctor_id: 'doctor-123' });

    await cancelAppointment(req, res);

    expect(query).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('rejects cancellation when the secretary is not assigned to the doctor', async () => {
    const req: any = {
      params: { id: 'appointment-123' },
      body: { reason: 'Agenda llena' },
      user: { id: 'secretary-123', role: 'secretary' },
    };

    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn();
    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    (queryOne as jest.Mock)
      .mockResolvedValueOnce({ patient_id: 'patient-123', doctor_id: 'doctor-123' })
      .mockResolvedValueOnce(null);

    await cancelAppointment(req, res);

    expect(queryOne).toHaveBeenCalledWith(
      'SELECT doctor_id FROM secretaries WHERE id = $1 AND doctor_id = $2',
      ['secretary-123', 'doctor-123']
    );
    expect(query).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
