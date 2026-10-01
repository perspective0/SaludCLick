'use client';

import { useState } from 'react';
import { feedbackAPI } from '@/utils/api';
import { AlertCircle, CheckCircle, Lightbulb, MessageSquare, Send } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function FeedbackForm({ audience }: { audience: 'patient' | 'doctor' }) {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [form, setForm] = useState({
    type: 'question',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await feedbackAPI.create({
        ...form,
        audience,
      });
      setForm({ type: 'question', subject: '', message: '' });
      setSuccess(en ? 'Your message was sent successfully.' : 'Tu mensaje fue enviado correctamente.');
    } catch (err: any) {
      setError(err?.message || (en ? 'Could not send the message.' : 'No se pudo enviar el mensaje.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{en ? 'Send a question or recommendation' : 'Enviar pregunta o recomendación'}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {en ? 'The administrative team will receive your message and follow up.' : 'El equipo administrativo recibirá tu mensaje y podrá darle seguimiento.'}
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setForm({ ...form, type: 'question' })}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${
            form.type === 'question'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {en ? 'Question' : 'Pregunta'}
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, type: 'recommendation' })}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition-colors ${
            form.type === 'recommendation'
              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Lightbulb className="w-5 h-5" />
          {en ? 'Recommendation' : 'Recomendación'}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Subject' : 'Asunto'}</label>
        <input
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
          placeholder={en ? 'E.g. Question about my appointments' : 'Ej: Duda sobre mis citas'}
          maxLength={160}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Message' : 'Mensaje'}</label>
        <textarea
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          placeholder={en ? 'Write your question or recommendation...' : 'Escribe tu pregunta o recomendación...'}
          rows={7}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        <Send className="w-4 h-4" />
        {loading ? (en ? 'Sending...' : 'Enviando...') : (en ? 'Send to administrator' : 'Enviar al administrador')}
      </button>
    </form>
  );
}
