'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI } from '@/utils/api';
import { CalendarCheck, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrls = process.env.NEXT_PUBLIC_TURN_URLS;

  if (turnUrls) {
    servers.push({
      urls: turnUrls.split(',').map((url) => url.trim()).filter(Boolean),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
    });
  }

  return servers;
}

const rtcConfig: RTCConfiguration = {
  iceServers: buildIceServers(),
};

export default function TeleconsultationRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const lastSignalIdRef = useRef(0);
  const pollingRef = useRef<number | null>(null);
  const offerRetryRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const mediaHealthRef = useRef<number | null>(null);
  const videoStatsRef = useRef({ framesDecoded: 0, staleChecks: 0 });
  const startingRef = useRef(false);

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Esperando inicio de la sala');
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const attachLocalPreview = useCallback(() => {
    if (!localVideoRef.current || !localStreamRef.current) return;
    localVideoRef.current.srcObject = localStreamRef.current;
    localVideoRef.current.play().catch(() => null);
  }, []);

  const attachRemotePreview = useCallback((stream = remoteStreamRef.current) => {
    if (!remoteVideoRef.current || !stream) return;
    remoteVideoRef.current.srcObject = stream;
    remoteVideoRef.current.play().catch(() => null);
  }, []);

  const sendSignal = useCallback(
    async (type: string, payload: any) => {
      await appointmentAPI.postTeleconsultationSignal(roomId, { type, payload });
    },
    [roomId]
  );

  const publishOffer = useCallback(async (force = false) => {
    const peer = peerRef.current;
    if (!peer) return;
    if (!force && peer.connectionState === 'connected') return;
    if (peer.signalingState !== 'stable') return;

    peer.restartIce?.();
    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await peer.setLocalDescription(offer);
    await sendSignal('offer', offer);
  }, [sendSignal]);

  const requestVideoRecovery = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || peer.connectionState === 'closed') return;

    setStatus('Video congelado. Reintentando conexion de video...');
    attachLocalPreview();
    attachRemotePreview();

    try {
      if (room?.is_moderator) {
        await publishOffer(true);
      } else {
        peer.restartIce?.();
        await sendSignal('renegotiate-needed', { reason: 'video-frozen' });
      }
    } catch (err) {
      console.error('Video recovery error:', err);
    }
  }, [attachLocalPreview, attachRemotePreview, publishOffer, room?.is_moderator, sendSignal]);

  const startMediaHealthMonitor = useCallback(() => {
    if (mediaHealthRef.current) return;

    mediaHealthRef.current = window.setInterval(async () => {
      const peer = peerRef.current;
      if (!peer || peer.connectionState === 'closed') return;

      attachLocalPreview();
      attachRemotePreview();

      if (!remoteStreamRef.current) return;

      try {
        const stats = await peer.getStats();
        let framesDecoded: number | null = null;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video' && !report.isRemote) {
            framesDecoded = Number(report.framesDecoded || 0);
          }
        });

        if (framesDecoded === null || peer.connectionState !== 'connected') return;

        if (framesDecoded > videoStatsRef.current.framesDecoded) {
          videoStatsRef.current = { framesDecoded, staleChecks: 0 };
          return;
        }

        videoStatsRef.current.staleChecks += 1;
        if (videoStatsRef.current.staleChecks >= 3) {
          videoStatsRef.current.staleChecks = 0;
          await requestVideoRecovery();
        }
      } catch (err) {
        console.error('Media health monitor error:', err);
      }
    }, 4000);
  }, [attachLocalPreview, attachRemotePreview, requestVideoRecovery]);

  const ensurePeer = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current as MediaStream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate).catch((err) => console.error('ICE signal error:', err));
      }
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
        attachRemotePreview(stream);
        stream.getVideoTracks().forEach((track) => {
          track.onmute = () => setStatus('Video pausado por la conexion. Intentando recuperar...');
          track.onunmute = () => setStatus('Video recuperado');
          track.onended = () => setStatus('La otra camara dejo de enviar video.');
        });
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        if (offerRetryRef.current) window.clearInterval(offerRetryRef.current);
        if (connectionTimeoutRef.current) window.clearTimeout(connectionTimeoutRef.current);
        offerRetryRef.current = null;
        connectionTimeoutRef.current = null;
        setStatus('Conectado');
      }
      if (state === 'connecting') setStatus('Conectando...');
      if (state === 'disconnected') setStatus('Conexion interrumpida');
      if (state === 'failed') setStatus('No se pudo conectar. Reintenta entrar a la sala.');
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'checking') {
        setStatus('Buscando ruta segura entre medico y paciente...');
      }
      if (peer.iceConnectionState === 'failed') {
        setStatus('No se encontro ruta de red. Configura un servidor TURN para teleconsultas fuera de la misma red.');
      }
    };

    return peer;
  }, [attachRemotePreview, sendSignal]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = window.setInterval(async () => {
      try {
        const response = await appointmentAPI.getTeleconsultationSignals(roomId, lastSignalIdRef.current);
        const signals = response.data || [];
        for (const signal of signals) {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, Number(signal.id || 0));
          const peer = ensurePeer();

          if (signal.type === 'offer') {
            setStatus('El medico inicio la sala. Conectando...');
            await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
            for (const candidate of pendingIceCandidatesRef.current) {
              await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null);
            }
            pendingIceCandidatesRef.current = [];
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendSignal('answer', answer);
          }

          if (signal.type === 'answer') {
            if (!peer.currentRemoteDescription) {
              await peer.setRemoteDescription(new RTCSessionDescription(signal.payload));
              for (const candidate of pendingIceCandidatesRef.current) {
                await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null);
              }
              pendingIceCandidatesRef.current = [];
            }
          }

          if (signal.type === 'renegotiate-needed' && room?.is_moderator) {
            await publishOffer(true);
          }

          if (signal.type === 'ice-candidate') {
            if (peer.remoteDescription) {
              await peer.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(() => null);
            } else {
              pendingIceCandidatesRef.current.push(signal.payload);
            }
          }
        }
      } catch (err) {
        console.error('Signal polling error:', err);
      }
    }, 1200);
  }, [ensurePeer, publishOffer, room?.is_moderator, roomId, sendSignal]);

  const loadRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await appointmentAPI.getTeleconsultationRoom(roomId);
      setRoom(response.data);
    } catch (err: any) {
      setError(err.message || 'Teleconsulta no disponible.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      if (offerRetryRef.current) window.clearInterval(offerRetryRef.current);
      if (connectionTimeoutRef.current) window.clearTimeout(connectionTimeoutRef.current);
      if (mediaHealthRef.current) window.clearInterval(mediaHealthRef.current);
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [loadRoom]);

  useEffect(() => {
    if (joined) {
      attachLocalPreview();
      attachRemotePreview();
      startMediaHealthMonitor();
    }
  }, [attachLocalPreview, attachRemotePreview, joined, startMediaHealthMonitor]);

  const joinRoom = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      attachLocalPreview();

      setJoined(true);
      setStatus(room?.is_moderator ? 'Iniciando sala interna...' : 'Esperando al medico...');
      const peer = ensurePeer();
      startPolling();
      startMediaHealthMonitor();
      if (connectionTimeoutRef.current) window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (peerRef.current?.connectionState !== 'connected') {
          setStatus('Sigue conectando. Si medico y paciente estan en redes distintas, necesitas TURN.');
        }
      }, 20000);

      if (room?.is_moderator) {
        await publishOffer();
        if (offerRetryRef.current) window.clearInterval(offerRetryRef.current);
        offerRetryRef.current = window.setInterval(() => {
          publishOffer().catch((err) => console.error('Offer retry error:', err));
        }, 5000);
        setStatus('Sala iniciada. Esperando al paciente...');
      }
    } catch (err: any) {
      console.error(err);
      setError('No se pudo acceder a camara o microfono. Revisa los permisos del navegador.');
    } finally {
      startingRef.current = false;
    }
  };

  const toggleMic = () => {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  };

  const leaveRoom = () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    if (offerRetryRef.current) window.clearInterval(offerRetryRef.current);
    if (connectionTimeoutRef.current) window.clearTimeout(connectionTimeoutRef.current);
    if (mediaHealthRef.current) window.clearInterval(mediaHealthRef.current);
    pollingRef.current = null;
    offerRetryRef.current = null;
    connectionTimeoutRef.current = null;
    mediaHealthRef.current = null;
    pendingIceCandidatesRef.current = [];
    videoStatsRef.current = { framesDecoded: 0, staleChecks: 0 };
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setJoined(false);
    setStatus('Saliste de la sala');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-8">
        <main className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl bg-gray-950 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Video className="h-7 w-7 text-violet-300" />
                <div>
                  <h1 className="text-3xl font-bold">Teleconsulta interna</h1>
                  <p className="text-sm text-gray-300">{status}</p>
                </div>
              </div>
              {!joined && !loading && !error && (
                <button onClick={joinRoom} className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700">
                  Entrar a la sala
                </button>
              )}
            </div>
          </section>

          {loading ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">Cargando sala...</section>
          ) : error ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</section>
          ) : room ? (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
              <aside className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="mb-6 flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Informacion</h2>
                </div>

                <div className="space-y-3">
                  <Info label="Medico" value={`${room.doctor_first_name} ${room.doctor_last_name}`} />
                  <Info label="Paciente" value={`${room.patient_first_name} ${room.patient_last_name}`} />
                  <Info label="Fecha" value={String(room.appointment_date).slice(0, 10)} />
                  <Info label="Hora" value={String(room.appointment_time).slice(0, 5)} />
                  <Info label="Rol" value={room.is_moderator ? 'Medico anfitrion' : 'Paciente'} />
                </div>

                {joined && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <button onClick={toggleMic} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="Microfono">
                      {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-rose-600" />}
                    </button>
                    <button onClick={toggleCamera} className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50" aria-label="Camara">
                      {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-rose-600" />}
                    </button>
                    <button onClick={leaveRoom} className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 text-white hover:bg-rose-700" aria-label="Salir">
                      <PhoneOff className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </aside>

              <div className="grid gap-4">
                <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-gray-950">
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-[62vh] min-h-[420px] w-full object-cover" />
                  {!joined && (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                      <div>
                        <Video className="mx-auto mb-3 h-12 w-12 text-violet-300" />
                        <p className="text-lg font-bold">Presiona “Entrar a la sala”</p>
                        <p className="mt-1 text-sm text-gray-300">La llamada se conecta dentro de SaludClick.</p>
                      </div>
                    </div>
                  )}
                  {joined && (
                    <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-36 w-48 rounded-xl border border-white/20 bg-black object-cover shadow-2xl" />
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
