import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useMingleSession } from "@/hooks/useMingleSession";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { moderateOutgoing } from "@/lib/moderation";
import { Video, VideoOff, Mic, MicOff, SkipForward, Phone, Send, Flag, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Mingle" },
      { name: "description", content: "Live random video chat with strangers on Mingle." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const session = useMingleSession(user?.id ?? null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportNote, setReportNote] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (localVideo.current && session.localStream) localVideo.current.srcObject = session.localStream;
  }, [session.localStream]);

  useEffect(() => {
    if (remoteVideo.current && session.remoteStream) remoteVideo.current.srcObject = session.remoteStream;
  }, [session.remoteStream]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  useEffect(() => {
    if (session.error) toast.error(session.error);
  }, [session.error]);

  const toggleMute = () => {
    if (!session.localStream) return;
    session.localStream.getAudioTracks().forEach(t => (t.enabled = muted));
    setMuted(!muted);
  };
  const toggleCam = () => {
    if (!session.localStream) return;
    session.localStream.getVideoTracks().forEach(t => (t.enabled = camOff));
    setCamOff(!camOff);
  };

  const submitReport = async () => {
    if (!user || !session.partnerId) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: session.partnerId,
      session_id: session.session?.id ?? null,
      reason: reportReason,
      custom_reason: reportNote || null,
    });
    if (error) toast.error("Could not submit report");
    else { toast.success("Report submitted. Thanks for keeping Mingle safe."); setReportOpen(false); }
    session.skip();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 container mx-auto px-4 py-6 grid lg:grid-cols-[1fr_360px] gap-4">
        {/* Video stage */}
        <div className="relative rounded-3xl overflow-hidden bg-card/60 border border-border/60 min-h-[480px] flex items-center justify-center">
          {/* Remote video */}
          {session.status === "connected" && (
            <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Idle / searching overlays */}
          <AnimatePresence mode="wait">
            {session.status === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center p-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 backdrop-blur px-3 py-1 text-xs mb-6">
                  <Sparkles className="w-3 h-3 text-[var(--brand-pink)]" /> Ready when you are
                </div>
                <h2 className="display text-4xl md:text-5xl font-black mb-4">Tap go to <span className="text-gradient">mingle</span></h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">We'll find someone in seconds. Be kind. Be curious.</p>
                <Button onClick={session.findPartner} size="lg" className="h-16 px-12 bg-gradient-brand text-background hover:opacity-90 font-bold text-lg rounded-2xl glow-pink">
                  <Video className="w-6 h-6" /> Start
                </Button>
              </motion.div>
            )}
            {session.status === "searching" && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-brand animate-pulse-ring relative" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Looking for someone…</h2>
                <p className="text-muted-foreground">Hold tight.</p>
                <Button variant="outline" onClick={session.stop} className="mt-6 rounded-xl">Cancel</Button>
              </motion.div>
            )}
            {session.status === "connecting" && (
              <motion.div key="conn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[var(--brand-pink)] border-t-transparent animate-spin" />
                <h2 className="text-2xl font-bold">Connecting to {session.partnerUsername ?? "stranger"}…</h2>
              </motion.div>
            )}
            {session.status === "ended" && (
              <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center p-10">
                <h2 className="text-3xl font-bold mb-4">Conversation ended</h2>
                <p className="text-muted-foreground mb-6">Want to meet someone new?</p>
                <Button onClick={session.findPartner} size="lg" className="bg-gradient-brand text-background hover:opacity-90 font-bold rounded-xl h-12 px-8">
                  <Video className="w-5 h-5" /> Mingle again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Local video PiP */}
          {session.localStream && (
            <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden border-2 border-background/40 shadow-2xl bg-black">
              <video ref={localVideo} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {camOff && <div className="absolute inset-0 bg-background flex items-center justify-center"><VideoOff className="w-6 h-6" /></div>}
            </div>
          )}

          {/* Partner badge */}
          {session.status === "connected" && session.partnerUsername && (
            <div className="absolute top-4 left-4 rounded-full bg-background/60 backdrop-blur px-3 py-1.5 text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {session.partnerUsername}
            </div>
          )}

          {/* Controls */}
          {(session.status === "connected" || session.status === "connecting") && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-background/70 backdrop-blur px-2 py-2 border border-border/60">
              <Button size="icon" variant={muted ? "destructive" : "secondary"} onClick={toggleMute} className="rounded-full">
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant={camOff ? "destructive" : "secondary"} onClick={toggleCam} className="rounded-full">
                {camOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="secondary" onClick={() => setReportOpen(true)} className="rounded-full" title="Report">
                <Flag className="w-4 h-4" />
              </Button>
              <Button size="icon" onClick={session.skip} className="rounded-full bg-gradient-brand text-background hover:opacity-90" title="Skip">
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={session.stop} className="rounded-full" title="Hang up">
                <Phone className="w-4 h-4 rotate-[135deg]" />
              </Button>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <aside className="rounded-3xl bg-card/60 border border-border/60 flex flex-col min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-border/50 font-bold">Messages</div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[60vh] lg:max-h-none">
            {session.messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center pt-8">
                {session.status === "connected" ? "Say hi 👋" : "Messages appear once connected."}
              </p>
            )}
            {session.messages.map(m => {
              const mine = m.from === user?.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-brand text-background" : "bg-muted"}`}>
                    {m.text}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEnd} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              const result = moderateOutgoing(text);
              if (!result.ok) {
                toast.error(result.reason);
                return;
              }
              session.sendMessage(result.clean);
              setText("");
            }}
            className="p-3 border-t border-border/50 flex gap-2"
          >
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={session.status === "connected" ? "Type a message…" : "Connect first"}
              disabled={session.status !== "connected"}
              className="rounded-xl"
            />
            <Button type="submit" disabled={session.status !== "connected" || !text.trim()} size="icon" className="rounded-xl bg-gradient-brand text-background hover:opacity-90">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </aside>
      </main>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full h-10 rounded-md bg-input px-3"
            >
              <option value="inappropriate">Inappropriate content</option>
              <option value="harassment">Harassment</option>
              <option value="minor">Looks underage</option>
              <option value="spam">Spam / advertising</option>
              <option value="other">Other</option>
            </select>
            <Textarea placeholder="Add detail (optional)" value={reportNote} onChange={e => setReportNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReport}>Report & skip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}