import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Session } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatMessage = { id: string; from: string; text: string; ts: number };
export type Status = "idle" | "searching" | "connecting" | "connected" | "ended";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useMingleSession(userId: string | null) {
  const [status, setStatus] = useState<Status>("idle");
  const [session, setSession] = useState<Session | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerUsername, setPartnerUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isOffererRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(async (markEnded = true) => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setRemoteStream(null);
    if (markEnded && sessionIdRef.current) {
      await supabase
        .from("sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
    }
    sessionIdRef.current = null;
    setSession(null);
    setPartnerId(null);
    setPartnerUsername(null);
    setMessages([]);
  }, []);

  const setupPeer = useCallback(
    (sessionId: string, isOfferer: boolean) => {
      isOffererRef.current = isOfferer;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        setRemoteStream(stream);
        setStatus("connected");
      };

      pc.onicecandidate = async (ev) => {
        if (ev.candidate && channelRef.current) {
          await channelRef.current.send({
            type: "broadcast",
            event: "ice",
            payload: { from: userId, candidate: ev.candidate.toJSON() },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          // Partner dropped — end session
          cleanup(true);
          setStatus("ended");
        }
      };

      const setupDC = (dc: RTCDataChannel) => {
        dcRef.current = dc;
        dc.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data) as ChatMessage;
            setMessages((prev) => [...prev, m]);
          } catch {}
        };
      };

      if (isOfferer) {
        const dc = pc.createDataChannel("chat");
        setupDC(dc);
      } else {
        pc.ondatachannel = (ev) => setupDC(ev.channel);
      }

      return pc;
    },
    [userId, cleanup],
  );

  const subscribeToSignalChannel = useCallback(
    (sessionId: string) => {
      const channel = supabase.channel(`mingle:${sessionId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === userId) return;
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await channel.send({
            type: "broadcast",
            event: "answer",
            payload: { from: userId, sdp: answer },
          });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === userId) return;
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          if (payload.from === userId) return;
          const pc = pcRef.current;
          if (!pc || !payload.candidate) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch {}
        })
        .on("broadcast", { event: "ready" }, async ({ payload }) => {
          // The other peer is ready; if we're the offerer, send the offer.
          if (payload.from === userId) return;
          if (isOffererRef.current && pcRef.current) {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            await channel.send({
              type: "broadcast",
              event: "offer",
              payload: { from: userId, sdp: offer },
            });
          }
        })
        .on("broadcast", { event: "bye" }, async () => {
          await cleanup(false);
          setStatus("ended");
        })
        .subscribe(async (state) => {
          if (state === "SUBSCRIBED") {
            // Announce we're ready
            await channel.send({ type: "broadcast", event: "ready", payload: { from: userId } });
          }
        });

      return channel;
    },
    [userId, cleanup],
  );

  const findPartner = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setStatus("searching");
    setMessages([]);

    // Get camera/mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
    } catch (e: any) {
      setError("Camera/microphone permission denied: " + (e?.message ?? "unknown"));
      setStatus("idle");
      return;
    }

    // Try to find a waiting session (not own)
    const { data: waiting } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "waiting")
      .is("user_b", null)
      .neq("user_a", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (waiting && waiting.length > 0) {
      // Join as user_b — we are the answerer
      const target = waiting[0] as Session;
      const { data: joined, error: joinErr } = await supabase
        .from("sessions")
        .update({ user_b: userId, status: "active" })
        .eq("id", target.id)
        .eq("status", "waiting")
        .is("user_b", null)
        .select()
        .maybeSingle();

      if (joinErr || !joined) {
        // Race lost — try again after a moment
        setTimeout(() => findPartner(), 500);
        return;
      }

      sessionIdRef.current = joined.id;
      setSession(joined as Session);
      setPartnerId(target.user_a);
      await loadPartnerName(target.user_a);
      setStatus("connecting");
      setupPeer(joined.id, false);
      subscribeToSignalChannel(joined.id);
    } else {
      // Create a waiting session — we are the offerer
      const { data: created, error: createErr } = await supabase
        .from("sessions")
        .insert({ user_a: userId, status: "waiting" })
        .select()
        .single();
      if (createErr || !created) {
        setError("Could not create session: " + (createErr?.message ?? ""));
        setStatus("idle");
        return;
      }
      sessionIdRef.current = created.id;
      setSession(created as Session);
      setupPeer(created.id, true);
      const channel = subscribeToSignalChannel(created.id);

      // Listen for someone joining our session
      const sessionWatch = supabase
        .channel(`session-watch:${created.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${created.id}` },
          async (payload) => {
            const updated = payload.new as Session;
            if (updated.user_b && updated.status === "active") {
              setSession(updated);
              setPartnerId(updated.user_b);
              await loadPartnerName(updated.user_b);
              setStatus("connecting");
              await supabase.removeChannel(sessionWatch);
            }
          },
        )
        .subscribe();
    }
  }, [userId, setupPeer, subscribeToSignalChannel]);

  const loadPartnerName = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("username").eq("id", uid).maybeSingle();
    setPartnerUsername(data?.username ?? "Stranger");
  };

  const sendMessage = useCallback(
    (text: string) => {
      if (!dcRef.current || dcRef.current.readyState !== "open" || !userId) return;
      const msg: ChatMessage = { id: crypto.randomUUID(), from: userId, text, ts: Date.now() };
      dcRef.current.send(JSON.stringify(msg));
      setMessages((prev) => [...prev, msg]);
    },
    [userId],
  );

  const skip = useCallback(async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "bye",
          payload: { from: userId },
        });
      } catch {}
    }
    await cleanup(true);
    setStatus("idle");
    setTimeout(() => findPartner(), 200);
  }, [cleanup, findPartner, userId]);

  const stop = useCallback(async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "bye",
          payload: { from: userId },
        });
      } catch {}
    }
    await cleanup(true);
    setStatus("idle");
  }, [cleanup, userId]);

  useEffect(
    () => () => {
      cleanup(false);
    },
    [cleanup],
  );

  return {
    status,
    session,
    partnerId,
    partnerUsername,
    messages,
    localStream,
    remoteStream,
    error,
    findPartner,
    sendMessage,
    skip,
    stop,
  };
}
