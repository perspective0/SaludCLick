# Deployment and Environment

## Backend environment variables
Create a `.env` file inside `backend/` with the following values:

- `PORT=5000`
- `DATABASE_URL=postgresql://user:password@host:port/saludclick`
- `JWT_SECRET=your_jwt_secret`
- `JWT_EXPIRE=7d`
- `FRONTEND_URL=http://localhost:3000`
- `PUBLIC_APP_URL=https://your-production-domain.example`
- `SMTP_HOST=smtp.example.com`
- `SMTP_PORT=587`
- `SMTP_USER=your-email-user`
- `SMTP_PASS=your-email-password`
- `EMAIL_FROM="SaludClick <no-reply@saludclick.com>"
- `TELEGRAM_BOT_TOKEN=` optional; rotate any token that was ever committed or exposed in frontend code before setting it here.
- `TELEGRAM_DOCTOR_REQUESTS_CHAT_ID=` optional; destination chat for doctor request notifications.

## Required before publishing

- Rotate the old Telegram bot token in BotFather. The previously exposed token must not be reused.
- Set `NODE_ENV=production`.
- Use strong non-placeholder values for `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, and `PUBLIC_APP_URL`.
- Confirm `FRONTEND_URL` exactly matches the deployed frontend origin; production CORS no longer allows local network origins.
- Keep `backend/dist`, `frontend/.next`, uploads, and local `.env` files out of Git.

## Frontend environment variables
Create a `.env.local` file inside `frontend/` with the following values:

- `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- `NEXTAUTH_URL=http://localhost:3000`

## Run locally

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
psql -U postgres -f database/init.sql
```

## Build for production

### Backend build
```bash
cd backend
npm run build
npm start
```

### Frontend build
```bash
cd frontend
npm install
npm run build
npm run start
```

## Docker deployment

If you use `docker-compose.yml`, the services should start and wire the backend, frontend, and database automatically. Confirm the API URL and `FRONTEND_URL` values in your environment files or `docker-compose` configuration.
