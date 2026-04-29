import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Video, MessageCircle, Sparkles, Shield, Globe2, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-(--brand-pink)] opacity-20 blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 right-0 w-md h-112 rounded-full bg-(--brand-cyan)] opacity-20 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }}/>
        </div>

        <div className="container mx-auto px-4 pt-20 pb-32 text-center max-w-4xl">

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="display text-5xl sm:text-7xl md:text-8xl font-black leading-[0.95] mb-6"
          >
            Meet anyone.
            <br />
            <span className="text-gradient">Anywhere.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Mingle drops you into a face-to-face conversation with a random
            stranger. No friend lists, no algorithms, just real moments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              onClick={() => navigate({ to: user ? "/chat" : "/auth" })}
              className="bg-gradient-brand text-background hover:opacity-90 font-bold text-base h-14 px-8 rounded-2xl glow-pink"
            >
              <Video className="w-5 h-5" />
              {user ? "Start chatting" : "Start free"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate({ to: "/about" })}
              className="h-14 px-8 rounded-2xl text-base"
            >
              How it works
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Instant matches", desc: "Hit go and you're in. Average match time under 3 seconds." },
            { icon: Globe2, title: "Anyone, anywhere", desc: "Random strangers from every timezone, every walk of life." },
            { icon: Shield, title: "Safe by design", desc: "One-tap reports, moderation, and zero stored video." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl bg-card/60 backdrop-blur border border-border/60 p-8 hover:border-(--brand-pink)]/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-background" />
              </div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] p-12 md:p-20 text-center bg-gradient-brand"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="relative">
            <MessageCircle className="w-12 h-12 mx-auto mb-6 text-background" />
            <h2 className="display text-4xl md:text-6xl font-black text-background mb-4">
              Your next conversation
              <br />is one tap away.
            </h2>
            <Button
              size="lg"
              onClick={() => navigate({ to: user ? "/chat" : "/auth" })}
              className="mt-6 h-14 px-10 rounded-2xl bg-background text-foreground hover:bg-background/90 font-bold text-base"
            >
              {user ? "Start chatting" : "Create your free account"}
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground border-t border-border/50">
        © {new Date().getFullYear()} Mingle. All rights reserved. Created by <a href="https://github.com/kxngzero329" className=" hover:text-foreground">Zuhayr Smith</a>.
      </footer>
    </div>
  );
}
