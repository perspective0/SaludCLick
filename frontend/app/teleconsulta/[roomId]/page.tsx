'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI } from '@/utils/api';
import { CalendarCheck, Clock3, Copy, Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';

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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const localPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Esperando inicio de la sala');
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteMicEnabled, setRemoteMicEnabled] = useState(true);
  const [remoteCameraEnabled, setRemoteCameraEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localPosition, setLocalPosition] = useState<{ left: number; top: number } | null>(null);

  const attachLocalPreview = useCallback(() => {
    if (!localVideoRef.current || !localStreamRef.current) return;
    localVideoRef.current.srcObject = localStreamRef.current;
    localVideoRef.current.play().catch(() => null);
  }, []);

  const attachRemotePreview = useCallback((stream = remoteStreamRef.current) => {
    if (!remoteVideoRef.current || !stream) return;
    remoteVideoRef.current.srcObject = stream;
    remoteVideoRef.current.muted = !remoteAudioEnabled;
    remoteVideoRef.current.play().catch(() => null);
  }, [remoteAudioEnabled]);

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
        setRemoteConnected(true);
        attachRemotePreview(stream);
        stream.getVideoTracks().forEach((track) => {
          track.onmute = () => {
            setRemoteCameraEnabled(false);
            setStatus('La otra persona apago la camara.');
          };
          track.onunmute = () => {
            setRemoteCameraEnabled(true);
            setStatus('La camara de la otra persona esta activa.');
          };
          track.onended = () => {
            setRemoteCameraEnabled(false);
            setStatus('La otra camara dejo de enviar video.');
          };
        });
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      setConnectionState(state);
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

          if (signal.type === 'media-state') {
            setRemoteMicEnabled(signal.payload?.micEnabled !== false);
            setRemoteCameraEnabled(signal.payload?.cameraEnabled !== false);
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
      screenTrackRef.current?.stop();
    };
  }, [loadRoom]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (fullscreen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!callStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - callStartedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [callStartedAt]);

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
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported-media');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      attachLocalPreview();

      setJoined(true);
      setCallStartedAt(Date.now());
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
      if (err?.message === 'unsupported-media') {
        setError('Este navegador no permite llamadas de video. Abre la sala en Safari o Chrome actualizado usando HTTPS.');
      } else if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError('El navegador bloqueo la camara o el microfono. Concede los permisos y vuelve a entrar.');
      } else if (err?.name === 'NotFoundError') {
        setError('No se encontro una camara o un microfono disponible en este dispositivo.');
      } else {
        setError('No se pudo acceder a camara o microfono. Revisa los permisos del navegador.');
      }
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
    sendSignal('media-state', { micEnabled: next, cameraEnabled }).catch((err) => console.error('Media state signal error:', err));
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
    sendSignal('media-state', { micEnabled, cameraEnabled: next }).catch((err) => console.error('Media state signal error:', err));
  };

  const toggleRemoteAudio = () => {
    const next = !remoteAudioEnabled;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !next;
    setRemoteAudioEnabled(next);
    if (next) remoteVideoRef.current?.play().catch(() => null);
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Enlace copiado');
    } catch (err) {
      console.error('Copy room link error:', err);
      setStatus('No se pudo copiar el enlace');
    }
  };

  const startDraggingLocalPreview = (event: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const preview = localPreviewRef.current;
    if (!stage || !preview) return;

    const stageRect = stage.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    setLocalPosition({ left: previewRect.left - stageRect.left, top: previewRect.top - stageRect.top });
    dragRef.current = {
      active: true,
      offsetX: event.clientX - previewRect.left,
      offsetY: event.clientY - previewRect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragLocalPreview = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || !stageRef.current || !localPreviewRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const preview = localPreviewRef.current;
    const maxLeft = Math.max(8, stageRect.width - preview.offsetWidth - 8);
    const maxTop = Math.max(8, stageRect.height - preview.offsetHeight - 8);
    const left = Math.min(maxLeft, Math.max(8, event.clientX - stageRect.left - dragRef.current.offsetX));
    const top = Math.min(maxTop, Math.max(8, event.clientY - stageRect.top - dragRef.current.offsetY));
    setLocalPosition({ left, top });
  };

  const stopDraggingLocalPreview = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const toggleScreenShare = async () => {
    const peer = peerRef.current;
    if (!peer) return;

    try {
      const sender = peer.getSenders().find((item) => item.track?.kind === 'video');
      if (!sender) return;

      if (sharingScreen) {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        await sender.replaceTrack(cameraTrack || null);
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        setSharingScreen(false);
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = displayStream.getVideoTracks()[0];
      await sender.replaceTrack(screenTrack);
      screenTrackRef.current = screenTrack;
      setSharingScreen(true);
      screenTrack.onended = () => {
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        sender.replaceTrack(cameraTrack || null).catch(() => null);
        screenTrackRef.current = null;
        setSharingScreen(false);
      };
    } catch (err) {
      console.error('Screen sharing error:', err);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      // Mobile Safari may not expose fullscreen for a div. In that case,
      // fullscreen is handled by the fixed fallback state below.
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      if (stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen();
      } else {
        setFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      setFullscreen(true);
    }
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
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setRemoteConnected(false);
    setRemoteMicEnabled(true);
    setRemoteCameraEnabled(true);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setJoined(false);
    setSharingScreen(false);
    setFullscreen(false);
    setCallStartedAt(null);
    setConnectionState('new');
    setStatus('Saliste de la sala');
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
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
                  <p className="flex items-center gap-2 text-sm text-gray-300">
                    <span className={`h-2 w-2 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400' : connectionState === 'failed' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    <span>{status}</span>
                    {joined && <span className="text-gray-500">·</span>}
                    {joined && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDuration(elapsedSeconds)}</span>}
                  </p>
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

                <button onClick={copyRoomLink} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50" type="button">
                  <Copy className="h-4 w-4" />
                  Copiar enlace de la sala
                </button>

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
                <div ref={stageRef} style={fullscreen ? { width: '100vw', height: '100dvh', minHeight: '100dvh' } : undefined} className={`relative min-h-[420px] overflow-hidden rounded-2xl bg-gray-950 ${fullscreen ? 'fixed inset-0 z-[100] h-screen min-h-0 rounded-none' : ''}`}>
                  <video ref={remoteVideoRef} autoPlay muted={!remoteAudioEnabled} playsInline className={fullscreen ? 'h-full min-h-0 w-full bg-black object-contain' : 'h-[62vh] min-h-[420px] w-full object-cover'} />
                  {!joined && (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-white">
                      <div>
                        <Video className="mx-auto mb-3 h-12 w-12 text-violet-300" />
                        <p className="text-lg font-bold">Presiona “Entrar a la sala”</p>
                        <p className="mt-1 text-sm text-gray-300">La llamada se conecta dentro de SaludClick.</p>
                      </div>
                    </div>
                  )}
                  {joined && remoteConnected && !remoteCameraEnabled && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-950/90 text-center text-white">
                      <div>
                        <VideoOff className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                        <p className="text-lg font-bold">La otra persona apago la camara</p>
                        <p className="mt-1 text-sm text-gray-400">El audio puede continuar activo.</p>
                      </div>
                    </div>
                  )}
                  {joined && (
                    <>
                      <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                        {connectionState === 'connected' ? 'Conectado' : connectionState === 'failed' ? 'Conexion fallida' : 'Conectando...'}
                      </div>
                      {remoteConnected && !remoteMicEnabled && <div className="absolute left-4 top-14 inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white"><MicOff className="h-3.5 w-3.5" />Microfono apagado</div>}
                      <button onClick={toggleRemoteAudio} className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80" type="button" aria-label={remoteAudioEnabled ? 'Silenciar audio remoto' : 'Activar audio remoto'} title={remoteAudioEnabled ? 'Silenciar audio remoto' : 'Activar audio remoto'}>
                        {remoteAudioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </button>
                      <div
                        ref={localPreviewRef}
                        onPointerDown={startDraggingLocalPreview}
                        onPointerMove={dragLocalPreview}
                        onPointerUp={stopDraggingLocalPreview}
                        onPointerCancel={stopDraggingLocalPreview}
                        style={localPosition ? { left: localPosition.left, top: localPosition.top, touchAction: 'none' } : { right: 16, bottom: 96, touchAction: 'none' }}
                        className="absolute h-28 w-40 cursor-grab overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl active:cursor-grabbing sm:h-36 sm:w-48"
                        title="Mueve tu cámara"
                      >
                        <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
                        {!cameraEnabled && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-900 text-center text-white"><VideoOff className="h-6 w-6 text-rose-300" /><span className="text-xs">Camara apagada</span></div>}
                        {!micEnabled && <span className="absolute bottom-2 left-2 rounded-full bg-rose-600 p-1.5 text-white"><MicOff className="h-3 w-3" /></span>}
                      </div>
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-gray-950/90 p-2 text-white shadow-2xl backdrop-blur">
                        <ActionButton onClick={toggleMic} active={micEnabled} label={micEnabled ? 'Silenciar microfono' : 'Activar microfono'}>{micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</ActionButton>
                        <ActionButton onClick={toggleCamera} active={cameraEnabled} label={cameraEnabled ? 'Apagar camara' : 'Encender camara'}>{cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</ActionButton>
                        <ActionButton onClick={toggleScreenShare} active={sharingScreen} label={sharingScreen ? 'Dejar de compartir' : 'Compartir pantalla'}><MonitorUp className="h-5 w-5" /></ActionButton>
                        <ActionButton onClick={toggleFullscreen} active={fullscreen} label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>{fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}</ActionButton>
                        <button onClick={leaveRoom} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700" aria-label="Salir de la sala" title="Salir de la sala"><PhoneOff className="h-5 w-5" /></button>
                      </div>
                    </>
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

function ActionButton({ onClick, active, label, children }: { onClick: () => void; active: boolean; label: string; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition ${active ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-600 hover:bg-rose-700'}`} aria-label={label} title={label}>
      {children}
    </button>
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
