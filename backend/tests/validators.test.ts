import { isUuid, parsePositiveInt } from '../src/validators/commonValidators';
import { validateMedicationList, validatePatientProfileUpdate } from '../src/validators/clinicalValidators';

describe('shared validators', () => {
  it('validates uuid values', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('normalizes pagination limits', () => {
    expect(parsePositiveInt('12', 20)).toBe(12);
    expect(parsePositiveInt('-1', 20)).toBe(20);
    expect(parsePositiveInt('500', 20, 100)).toBe(100);
  });

  it('validates clinical medication payloads', () => {
    expect(validateMedicationList([{ name: 'Amoxicilina', dosage: '500mg', frequency: 'cada 8h' }])).toBeNull();
    expect(validateMedicationList([])).toBe('At least one medication is required');
  });

  it('validates patient profile updates', () => {
    expect(validatePatientProfileUpdate({ dateOfBirth: '1990-01-01' })).toBeNull();
    expect(validatePatientProfileUpdate({ dateOfBirth: 'bad-date' })).toBe('Invalid birth date');
  });
});
