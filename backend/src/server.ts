import app from './app';
import { startWhatsAppReminderScheduler } from './services/whatsappReminderService';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SaludClick API running on http://localhost:${PORT} (red local habilitada)`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  startWhatsAppReminderScheduler();
});
