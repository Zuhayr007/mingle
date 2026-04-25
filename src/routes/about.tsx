import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How Mingle works — random video chat" },
      { name: "description", content: "Mingle pairs strangers for face-to-face video chat. Here's exactly how a session works, end to end." },
      { property: "og:title", content: "How Mingle works" },
      { property: "og:description", content: "Mingle pairs strangers for face-to-face video chat." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <Nav />
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="display text-5xl md:text-6xl font-black mb-8">
          How <span className="text-gradient">Mingle</span> works
        </h1>
        <div className="space-y-8 text-lg text-muted-foreground">
          {[
            { n: "01", t: "Sign up in seconds", d: "Pick a username. That's it. No phone, no friend list." },
            { n: "02", t: "Tap start", d: "We grab your camera and mic, then look for someone else doing the same thing." },
            { n: "03", t: "Talk", d: "Peer-to-peer video & text. Nothing is recorded. Skip anytime." },
            { n: "04", t: "Stay safe", d: "One-tap report sends the session to our moderators. Bad actors get banned." },
          ].map(s => (
            <div key={s.n} className="flex gap-6 items-start">
              <span className="text-gradient text-3xl font-black tabular-nums">{s.n}</span>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <Button asChild size="lg" className="bg-gradient-brand text-background hover:opacity-90 font-bold rounded-2xl h-14 px-8">
            <Link to="/chat">Try it now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}