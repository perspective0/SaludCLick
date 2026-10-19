import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../utils/auth';
import { query, queryOne, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { ensureDoctorVerificationColumns, verifyDoctorExequatur } from '../utils/doctorVerification';
import { UserRole } from '../types';
import { getSettings } from '../services/settingsService';
import { notifyDoctorRequestTelegram } from '../utils/telegram';
import { notifyDoctorRequestWhatsApp } from '../services/whatsappNotifications';
import { notifyUser } from './notificationController';
import crypto from 'crypto';
import { clearCsrfCookie, setCsrfCookie } from '../middleware/csrf';

const failedLogins = new Map<string, { count: number; blockedUntil?: number }>();
const AUTH_COOKIE = 'saludclick_session';
const DEFAULT_SESSION_MINUTES = 7 * 24 * 60;
const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = isProduction ? 'none' : 'lax';
const GOOGLE_STATE_COOKIE = 'saludclick_google_state';
const passwordRecoveryAttempts = new Map<string, { count: number; resetAt: number }>();

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

function getFrontendUrl() {
  return process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'http://localhost:3000';
}

function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${getFrontendUrl()}/api/auth/google/callback`;
}

function safeRedirect(value: unknown) {
  const redirect = String(value || '');
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
}

function dashboardForRole(role: string) {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'secretary') return '/secretary/dashboard';
  return '/patient/dashboard';
}

function googleIsConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getRequestAddress(req: Request) {
  return String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

function canRequestPasswordRecovery(key: string) {
  const now = Date.now();
  const previous = passwordRecoveryAttempts.get(key);
  if (!previous || previous.resetAt <= now) {
    passwordRecoveryAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (previous.count >= 5) return false;
  previous.count += 1;
  return true;
}

async function ensureGoogleColumn() {
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255)');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_subject ON users(google_subject) WHERE google_subject IS NOT NULL');
}

function setGoogleStateCookie(res: Response, value: string) {
  res.cookie(GOOGLE_STATE_COOKIE, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/',
    maxAge: 10 * 60 * 1000,
  });
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function clearGoogleStateCookie(res: Response) {
  res.clearCookie(GOOGLE_STATE_COOKIE, { httpOnly: true, secure: isProduction, sameSite: cookieSameSite, path: '/' });
}

function redirectToLogin(res: Response, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  res.redirect(`${getFrontendUrl()}/login${query ? `?${query}` : ''}`);
}

function setAuthCookie(res: Response, token: string, maxAgeMinutes = DEFAULT_SESSION_MINUTES) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/',
    maxAge: maxAgeMinutes * 60 * 1000,
  });
  setCsrfCookie(res, crypto.randomBytes(32).toString('base64url'), maxAgeMinutes);
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/',
  });
  clearCsrfCookie(res);
}

export const startGoogleLogin = (req: Request, res: Response) => {
  if (!googleIsConfigured()) {
    return res.status(503).json({ success: false, code: 'GOOGLE_AUTH_NOT_CONFIGURED', message: 'El inicio de sesión con Google no está configurado todavía.' });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const redirect = safeRedirect(req.query.redirect);
  setGoogleStateCookie(res, `${state}|${Buffer.from(redirect).toString('base64url')}`);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const finishGoogleLogin = async (req: Request, res: Response) => {
  const frontendRedirect = safeRedirect(req.query.redirect);
  if (!googleIsConfigured()) return redirectToLogin(res, { google: 'error', message: 'Google no está configurado.' });

  const stateCookie = readCookie(req, GOOGLE_STATE_COOKIE);
  const [savedState, encodedRedirect] = String(stateCookie || '').split('|');
  const redirect = encodedRedirect ? safeRedirect(Buffer.from(encodedRedirect, 'base64url').toString('utf8')) : frontendRedirect;
  clearGoogleStateCookie(res);
  if (!req.query.state || !savedState || req.query.state !== savedState) {
    return redirectToLogin(res, { google: 'error', message: 'No se pudo validar la solicitud de Google.' });
  }
  if (req.query.error) return redirectToLogin(res, { google: 'cancelled', redirect });

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code || ''),
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error('Google token exchange failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    const profile = await profileResponse.json() as GoogleProfile;
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified === false) {
      throw new Error('Google profile is not verified');
    }

    await ensureGoogleColumn();
    const email = profile.email.trim().toLowerCase();
    let user = await queryOne('SELECT id, email, first_name, last_name, role FROM users WHERE google_subject = $1', [profile.sub]);
    if (!user) user = await queryOne('SELECT id, email, first_name, last_name, role FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (!user) {
      const firstName = (profile.given_name || profile.name || 'Usuario').trim().slice(0, 100);
      const lastName = (profile.family_name || '').trim().slice(0, 100) || 'SaludClick';
      const onboardingToken = generateToken({
        id: 'google-onboarding',
        email,
        role: UserRole.PATIENT,
        googleSubject: profile.sub,
        firstName,
        lastName,
        avatar: profile.picture || null,
      } as any, '10m');
      return res.redirect(`${getFrontendUrl()}/google/onboarding?token=${encodeURIComponent(onboardingToken)}`);
    } else {
      await query('UPDATE users SET google_subject = $1, avatar = COALESCE(avatar, $2), updated_at = NOW() WHERE id = $3', [profile.sub, profile.picture || null, user.id]);
      if (user.role === 'doctor') {
        // Older Google onboarding versions used a temporary GOOGLE-* value as
        // license_number. It is not a professional license and must not be
        // displayed or sent for medical verification.
        await query("UPDATE doctors SET license_number = NULL WHERE id = $1 AND license_number LIKE 'GOOGLE-%'", [user.id]);
      }
    }

    const security = await getSettings('security');
    const sessionMinutes = Number(security.sessionTimeout) || 30;
    const token = generateToken({ id: user.id, email: user.email, role: user.role }, `${sessionMinutes}m`);
    setAuthCookie(res, token, sessionMinutes);
    // The frontend and API are hosted on different sites in production
    // (vercel.app and onrender.com). Return the short-lived session token so
    // the browser can authenticate API requests even when third-party cookies
    // are blocked. The login page removes it from the URL immediately.
    return res.redirect(`${getFrontendUrl()}${dashboardForRole(user.role)}?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Google login error:', error);
    return redirectToLogin(res, { google: 'error', message: 'No se pudo completar el inicio de sesión con Google.' });
  }
};

export const completeGoogleRegistration = async (req: Request, res: Response) => {
  try {
    const requestedRole = req.body?.role === 'doctor' ? 'doctor' : req.body?.role === 'patient' ? 'patient' : null;
    const phone = String(req.body?.phone || '').trim();
    const exequatur = String(req.body?.exequatur || '').trim();
    const specialty = String(req.body?.specialty || '').trim();
    if (!requestedRole) {
      return res.status(400).json({ success: false, message: 'Selecciona si utilizarás SaludClick como paciente o médico.' });
    }
    if (requestedRole === 'doctor' && (!phone || !exequatur || !specialty)) {
      return res.status(400).json({ success: false, message: 'Para solicitar acceso como médico debes indicar teléfono, exequátur y especialidad.' });
    }

    const onboarding = verifyToken(String(req.body?.token || '')) as any;
    if (onboarding.id !== 'google-onboarding' || !onboarding.googleSubject || !onboarding.email) {
      return res.status(400).json({ success: false, message: 'La sesión de Google ya no es válida. Vuelve a intentarlo.' });
    }

    await ensureGoogleColumn();
    const existing = await queryOne('SELECT id, email, first_name, last_name, role FROM users WHERE google_subject = $1 OR LOWER(email) = LOWER($2)', [onboarding.googleSubject, onboarding.email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Esta cuenta de Google ya está asociada a SaludClick. Inicia sesión nuevamente.' });
    }

    const userId = uuidv4();
    const password = await hashPassword(crypto.randomBytes(32).toString('base64url'));
    const firstName = String(onboarding.firstName || 'Usuario').slice(0, 100);
    const lastName = String(onboarding.lastName || 'SaludClick').slice(0, 100);
    const verification = requestedRole === 'doctor'
      ? await verifyDoctorExequatur({
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          exequatur,
          specialty,
        })
      : null;

    await ensureDoctorVerificationColumns();
    await ensureDoctorHealthCentersTable();

    await transaction(async (client) => {
      await client.query(
        'INSERT INTO users (id, email, password, first_name, last_name, role, avatar, google_subject) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [userId, onboarding.email, password, firstName, lastName, requestedRole, onboarding.avatar || null, onboarding.googleSubject]
      );

      if (requestedRole === 'doctor') {
        const centerId = await getOrCreateDefaultCenter(client);
        await client.query(
          'INSERT INTO doctors (id, health_center_id, license_number, years_experience, bio, consultation_price, is_verified, specialties, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [userId, centerId, exequatur, 0, 'Perfil creado con Google. Completa tu perfil mientras validamos tus credenciales profesionales.', 0, false, [specialty], 0]
        );
        await client.query(
          `INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (doctor_id, health_center_id) DO UPDATE SET is_primary = true`,
          [userId, centerId]
        );
        await client.query(
          `INSERT INTO doctor_requests (
             name, first_name, last_name, email, phone, clinic, requested_health_center_mode,
             license_number, exequatur, specialty, message, status, verification_status,
             verification_score, verification_source, verification_message,
             verification_checked_at, verification_payload
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, 'pending', $11, $12, $13, $14, $15, $16)`,
          [
            `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            onboarding.email,
            phone,
            null,
            'other',
            exequatur,
            specialty,
            `Solicitud iniciada con Google. ${verification?.status === 'verified' ? 'La identidad profesional fue validada automáticamente y queda pendiente de aprobación administrativa.' : 'La solicitud requiere revisión administrativa.'}`,
            verification?.status || 'pending_review',
            verification?.score ?? null,
            verification?.source || null,
            verification?.message || null,
            verification?.checkedAt || null,
            verification ? JSON.stringify(verification) : null,
          ]
        );
      } else {
        await client.query('INSERT INTO patients (id, account_claimed_at) VALUES ($1, NOW())', [userId]);
      }
    });

    const security = await getSettings('security');
    const sessionMinutes = Number(security.sessionTimeout) || 30;
    const token = generateToken({ id: userId, email: onboarding.email, role: requestedRole as UserRole }, `${sessionMinutes}m`);
    setAuthCookie(res, token, sessionMinutes);
    if (requestedRole === 'doctor') {
      notifyDoctorRequestTelegram({ firstName, lastName, email: onboarding.email, specialty, phone, exequatur }).catch((error) => {
        console.error('Telegram Google doctor request notification error:', error);
      });
      notifyDoctorRequestWhatsApp({ firstName, lastName, email: onboarding.email, specialty, phone, exequatur }).catch((error) => {
        console.error('WhatsApp Google doctor request notification error:', error);
      });
    }
    return res.json({
      success: true,
      data: {
        user: { id: userId, email: onboarding.email, firstName, lastName, phone, avatar: onboarding.avatar || null, role: requestedRole, isVerified: requestedRole !== 'doctor' },
        token,
        pendingApproval: requestedRole === 'doctor',
      },
    });
  } catch (error: any) {
    console.error('Google registration error:', error);
    const tokenError = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(String(error?.name || ''));
    const databaseCode = String(error?.code || '');
    const errorName = String(error?.name || 'Error');
    const errorMessage = String(error?.message || '').replace(/[\r\n]+/g, ' ').slice(0, 180);
    return res.status(tokenError ? 400 : 500).json({
      success: false,
      message: tokenError
        ? 'La sesión de Google expiró. Vuelve a iniciar el proceso.'
        : `No se pudo crear la solicitud médica. Verifica los datos e inténtalo nuevamente.${databaseCode ? ` Código: ${databaseCode}` : ` [${errorName}: ${errorMessage}]`}`,
    });
  }
};

async function validatePasswordPolicy(password: string) {
  const security = await getSettings('security');
  const min = Number(security.passwordMinLength) || 8;
  if (String(password || '').length < min) return `La contraseña debe tener al menos ${min} caracteres`;
  if (security.requireNumbers && !/\d/.test(password)) return 'La contraseña debe incluir un número';
  if (security.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe incluir un carácter especial';
  return null;
}

async function getOrCreateDefaultCenter(client: any) {
  const centerResult = await client.query('SELECT id FROM health_centers LIMIT 1');
  if (centerResult.rowCount > 0) {
    return centerResult.rows[0].id;
  }

  const insertResult = await client.query(
    'INSERT INTO health_centers (name, address, city, phone, email, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    ['SaludClick Network', 'No asignada', 'Virtual', '000-000-0000', 'admin@saludclick.com', 'Centro médico predeterminado para doctores pendientes']
  );
  return insertResult.rows[0].id;
}

async function ensureDoctorHealthCentersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_health_centers (
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      health_center_id UUID NOT NULL REFERENCES health_centers(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (doctor_id, health_center_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_doctor ON doctor_health_centers(doctor_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_center ON doctor_health_centers(health_center_id)');
}

async function ensurePatientClaimColumns() {
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_at TIMESTAMP').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS account_claimed_at TIMESTAMP').catch(() => null);
}

function normalizeDocument(value: any) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeName(value: any) {
  return String(value || '').trim().toLowerCase();
}

async function findClaimableManualPatient(client: any, email: string, documentNumber?: string, firstName?: string, lastName?: string, insuranceNumber?: string, insuranceProvider?: string) {
  const cleanDocument = normalizeDocument(documentNumber);
  const cleanFirstName = normalizeName(firstName);
  const cleanLastName = normalizeName(lastName);
  const cleanInsuranceNumber = String(insuranceNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const cleanInsuranceProvider = normalizeName(insuranceProvider);

  if ((cleanDocument || cleanInsuranceNumber) && cleanFirstName && cleanLastName) {
    const byDocument = await client.query(
      `SELECT p.id, u.email
       FROM patients p
       JOIN users u ON u.id = p.id
       WHERE p.account_claimed_at IS NULL
         AND p.manual_patient_created_at IS NOT NULL
         AND (
           ($1 <> '' AND regexp_replace(COALESCE(p.document_number, ''), '\\D', '', 'g') = $1)
           OR
           ($4 <> '' AND regexp_replace(LOWER(COALESCE(p.insurance_number, '')), '[^a-z0-9]', '', 'g') = $4
             AND ($5 = '' OR LOWER(TRIM(COALESCE(p.insurance_provider, ''))) = $5))
         )
         AND LOWER(TRIM(u.first_name)) = $2
         AND LOWER(TRIM(u.last_name)) = $3
       LIMIT 1`,
      [cleanDocument, cleanFirstName, cleanLastName, cleanInsuranceNumber, cleanInsuranceProvider]
    );
    if (byDocument.rowCount > 0) return byDocument.rows[0];
  }

  const byEmail = await client.query(
    `SELECT p.id, u.email
     FROM patients p
     JOIN users u ON u.id = p.id
     WHERE p.account_claimed_at IS NULL
       AND p.manual_patient_created_at IS NOT NULL
       AND LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );
  return byEmail.rowCount > 0 ? byEmail.rows[0] : null;
}

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      email: rawEmail,
      password,
      firstName,
      lastName,
      phone,
      role,
      documentNumber,
      especialidad,
      exequatur,
      clinic,
      healthCenterId,
      healthCenterMode,
    } = req.body;

    const email = String(rawEmail || '').trim().toLowerCase();
    const passwordError = await validatePasswordPolicy(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    if (role === 'patient') {
      await ensurePatientClaimColumns();
    }

    // Check if user exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      if (role === 'patient') {
        const hashedPassword = await hashPassword(password);
        const claimed = await transaction(async (client) => {
          const manualPatient = await findClaimableManualPatient(client, email, documentNumber, firstName, lastName, req.body.insuranceNumber, req.body.insuranceProvider);
          if (!manualPatient || manualPatient.id !== existingUser.id) return null;

          await client.query(
            `UPDATE users
             SET password = $1, first_name = $2, last_name = $3, phone = COALESCE($4, phone), is_active = true, updated_at = NOW()
             WHERE id = $5`,
            [hashedPassword, firstName, lastName, phone || null, manualPatient.id]
          );
          await client.query(
            `UPDATE patients
             SET account_claimed_at = NOW(),
                 document_number = COALESCE(NULLIF($1, ''), document_number),
                 has_insurance = COALESCE($2, has_insurance),
                 insurance_provider = COALESCE(NULLIF($3, ''), insurance_provider),
                 insurance_number = COALESCE(NULLIF($4, ''), insurance_number)
             WHERE id = $5`,
            [String(documentNumber || '').trim(), req.body.hasInsurance ? true : null, String(req.body.insuranceProvider || '').trim(), String(req.body.insuranceNumber || '').trim(), manualPatient.id]
          );
          return manualPatient;
        });

        if (claimed) {
          const token = generateToken({ id: claimed.id, email, role });
          setAuthCookie(res, token);
          return res.status(200).json({
            success: true,
            message: 'Cuenta de paciente vinculada con el registro clínico existente.',
            data: {
              user: {
                id: claimed.id,
                email,
                firstName,
                lastName,
                role,
              },
              token,
              linkedExistingPatient: true,
            },
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    if (role === 'doctor') {
      await ensureDoctorVerificationColumns();
      await ensureDoctorHealthCentersTable();

      if (!exequatur) {
        return res.status(400).json({
          success: false,
          message: 'El exequatur es obligatorio para solicitar acceso como médico',
        });
      }

      const existingRequest = await queryOne('SELECT id FROM doctor_requests WHERE LOWER(email) = LOWER($1)', [email]);

      const fullName = `${firstName} ${lastName}`.trim();
      const requestedHealthCenterMode = healthCenterMode === 'other' ? 'other' : 'existing';
      const requestedHealthCenterId = requestedHealthCenterMode === 'existing' && healthCenterId ? healthCenterId : null;
      let clinicName = clinic || null;

      if (requestedHealthCenterId) {
        const center = await queryOne('SELECT id, name FROM health_centers WHERE id = $1', [requestedHealthCenterId]);
        if (!center) {
          return res.status(400).json({ success: false, message: 'Centro de salud no encontrado' });
        }
        clinicName = center.name;
      }

      const verification = await verifyDoctorExequatur({
        firstName,
        lastName,
        fullName,
        exequatur,
        specialty: especialidad,
      });

      const hashedPassword = await hashPassword(password);
      const userId = uuidv4();
      const requestMessage = requestedHealthCenterMode === 'other'
        ? `Especialidad: ${especialidad || 'No indicada'}. Centro pendiente de seleccionar o crear al completar perfil.`
        : especialidad ? `Especialidad: ${especialidad}` : null;

      const result = await transaction(async (client) => {
        await client.query(
          'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, email, hashedPassword, firstName, lastName, phone || null, 'doctor']
        );

        let centerId = requestedHealthCenterId;
        if (!centerId) {
          centerId = await getOrCreateDefaultCenter(client);
        }

        await client.query(
          `INSERT INTO doctors (
             id, health_center_id, license_number, years_experience, bio, consultation_price,
             is_verified, specialties, average_rating
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            userId,
            centerId,
            exequatur,
            0,
            requestedHealthCenterMode === 'other'
              ? 'Cuenta creada. Debe seleccionar un centro existente o crear el centro donde atiende al completar el perfil.'
              : `Cuenta pendiente de aprobacion desde ${clinicName || 'SaludClick'}`,
            0,
            false,
            especialidad ? [especialidad] : [],
            0,
          ]
        );

        await client.query(
          `INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (doctor_id, health_center_id) DO UPDATE SET is_primary = true`,
          [userId, centerId]
        );

        const requestSql = existingRequest
          ? `UPDATE doctor_requests
             SET name = $1, first_name = $2, last_name = $3, email = $4, phone = $5, clinic = $6,
                 requested_health_center_id = $7, requested_health_center_mode = $8,
                 license_number = $9, exequatur = $9, specialty = $10, message = $11,
                 status = 'pending', verification_status = $12, verification_score = $13,
                 verification_source = $14, verification_message = $15,
                 verification_checked_at = $16, verification_payload = $17
             WHERE id = $18
             RETURNING *`
          : `INSERT INTO doctor_requests (
               name, first_name, last_name, email, phone, clinic, requested_health_center_id, requested_health_center_mode,
               license_number, exequatur, specialty,
               message, status, verification_status, verification_score, verification_source,
               verification_message, verification_checked_at, verification_payload
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, 'pending', $12, $13, $14, $15, $16, $17)
             RETURNING *`;
        const requestParams = [
          fullName,
          firstName,
          lastName,
          email,
          phone || null,
          clinicName,
          requestedHealthCenterId,
          requestedHealthCenterMode,
          exequatur,
          especialidad || null,
          requestMessage,
          verification.status,
          verification.score,
          verification.source,
          verification.message,
          verification.checkedAt,
          JSON.stringify(verification),
        ];
        if (existingRequest) {
          requestParams.push(existingRequest.id);
        }

        const requestResult = await client.query(requestSql, requestParams);
        return requestResult.rows[0];
      });

      const token = generateToken({ id: userId, email, role: UserRole.DOCTOR });
      setAuthCookie(res, token);
      notifyDoctorRequestTelegram({
        firstName,
        lastName,
        email,
        specialty: especialidad,
        phone,
        exequatur,
      }).catch((error) => {
        console.error('Telegram doctor request notification error:', error);
      });
      notifyDoctorRequestWhatsApp({
        firstName,
        lastName,
        email,
        specialty: especialidad,
        phone,
        exequatur,
      }).catch((error) => {
        console.error('WhatsApp doctor request notification error:', error);
      });

      return res.status(201).json({
        success: true,
        message: 'Doctor account created pending approval',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            role: 'doctor',
          },
          token,
          request: result,
        },
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const userId = uuidv4();

    // If patient, first try to claim a manual profile created in clinic.
    if (role === 'patient') {
      const claimed = await transaction(async (client) => {
        const manualPatient = await findClaimableManualPatient(client, email, documentNumber, firstName, lastName, req.body.insuranceNumber, req.body.insuranceProvider);
        if (!manualPatient) return null;

        const emailInUse = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2', [email, manualPatient.id]);
        if ((emailInUse.rowCount || 0) > 0) return null;

        await client.query(
          `UPDATE users
           SET email = $1, password = $2, first_name = $3, last_name = $4, phone = COALESCE($5, phone), is_active = true, updated_at = NOW()
           WHERE id = $6`,
          [email, hashedPassword, firstName, lastName, phone || null, manualPatient.id]
        );
        await client.query(
          `UPDATE patients
           SET account_claimed_at = NOW(),
               document_number = COALESCE(NULLIF($1, ''), document_number),
               has_insurance = COALESCE($2, has_insurance),
               insurance_provider = COALESCE(NULLIF($3, ''), insurance_provider),
               insurance_number = COALESCE(NULLIF($4, ''), insurance_number)
           WHERE id = $5`,
          [String(documentNumber || '').trim(), req.body.hasInsurance ? true : null, String(req.body.insuranceProvider || '').trim(), String(req.body.insuranceNumber || '').trim(), manualPatient.id]
        );
        return manualPatient;
      });

      if (claimed) {
        const token = generateToken({ id: claimed.id, email, role });
        setAuthCookie(res, token);
        return res.status(200).json({
          success: true,
            message: 'Cuenta de paciente vinculada con el registro clínico existente.',
          data: {
            user: {
              id: claimed.id,
              email,
              firstName,
              lastName,
              role,
            },
            token,
            linkedExistingPatient: true,
          },
        });
      }
    }

    // Create user
    await query(
      'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, email, hashedPassword, firstName, lastName, phone || null, role]
    );

    // If patient, create patient record
    if (role === 'patient') {
      await query(
        `INSERT INTO patients (id, document_number, has_insurance, insurance_provider, insurance_number, account_claimed_at)
         VALUES ($1, NULLIF($2, ''), $3, NULLIF($4, ''), NULLIF($5, ''), NOW())`,
        [
          userId,
          String(documentNumber || '').trim(),
          Boolean(req.body.hasInsurance),
          String(req.body.insuranceProvider || '').trim(),
          String(req.body.insuranceNumber || '').trim(),
        ]
      );
    }

    // Generate token
    const token = generateToken({ id: userId, email, role });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
    });
  }
};

/**
 * Notify administrators when a person requests password recovery.
 * Passwords and recovery links are intentionally not sent to administrators.
 */
export const requestPasswordRecovery = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const requestKey = `${getRequestAddress(req)}:${email}`;
  if (!canRequestPasswordRecovery(requestKey)) {
    return res.status(429).json({
      success: false,
      message: 'Has realizado demasiadas solicitudes. Intenta nuevamente más tarde.',
    });
  }

  try {
    const user = await queryOne(
      `SELECT id, email, first_name, last_name, phone, role
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    const accountExists = Boolean(user);
    const recoveryRequestId = uuidv4();
    const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'No registrado';
    const phone = user?.phone || 'No registrado';
    const title = accountExists ? 'Solicitud de recuperación de contraseña' : 'Solicitud de recuperación de usuario no registrado';
    const message = accountExists
      ? `El paciente ${name} solicitó ayuda para recuperar su contraseña. Correo: ${user.email}. Teléfono: ${phone}. Contacta al paciente para validar su identidad y asistirlo.`
      : `Se solicitó recuperar una cuenta que no existe. Correo indicado: ${email}. La pantalla ofrecerá el registro al usuario.`;

    const admins = await query(
      `SELECT id FROM users WHERE role = 'admin' AND COALESCE(is_active, true) = true`
    );
    await Promise.all(
      admins.rows.map((admin: { id: string }) => notifyUser(admin.id, {
        title,
        message,
        type: 'password_recovery_request',
        entityType: 'password_recovery_request',
        entityId: recoveryRequestId,
        priority: 'high',
        url: '/admin/users',
      }))
    );

    return res.json({
      success: true,
      data: { accountExists },
      message: accountExists
        ? 'La solicitud fue enviada a los administradores. Ellos se pondrán en contacto contigo.'
        : 'No encontramos una cuenta con ese correo. Puedes registrarte para crear una cuenta.',
    });
  } catch (error: any) {
    console.error('Password recovery request error:', error);
    return res.status(500).json({ success: false, message: 'No se pudo procesar la solicitud.' });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email: rawEmail, password } = req.body;
    const email = String(rawEmail || '').trim().toLowerCase();
    const security = await getSettings('security');
    const attempt = failedLogins.get(email);
    if (attempt?.blockedUntil && attempt.blockedUntil > Date.now()) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    // Find user
    const user = await queryOne(
      'SELECT id, email, password, first_name, last_name, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (!user) {
      const pendingDoctorRequest = await queryOne(
        'SELECT id, status FROM doctor_requests WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      if (pendingDoctorRequest) {
        return res.status(401).json({
          success: false,
          message: 'Tu solicitud de médico existe, pero la cuenta aún no fue creada. Vuelve a registrarte con ese correo para activar el acceso.',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      const count = (attempt?.count || 0) + 1;
      const max = Number(security.maxLoginAttempts) || 5;
      failedLogins.set(email, { count, blockedUntil: count >= max ? Date.now() + 15 * 60 * 1000 : undefined });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
    failedLogins.delete(email);

    // Generate token
    const sessionMinutes = Number(security.sessionTimeout) || 30;
    const token = generateToken({ id: user.id, email: user.email, role: user.role }, `${sessionMinutes}m`);
    setAuthCookie(res, token, sessionMinutes);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Error logging in'
          : 'Error logging in',
    });
  }
};

/**
 * Logout (client-side mostly)
 */
export const logout = (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: 'Logout successful',
  });
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await queryOne(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar,
              CASE WHEN u.role = 'doctor' THEN COALESCE(d.is_verified, false) ELSE true END AS doctor_verified
       FROM users u
       LEFT JOIN doctors d ON d.id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};
