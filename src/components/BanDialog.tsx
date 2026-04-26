import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban, Clock } from "lucide-react";
import type { ActiveBan } from "@/lib/bans";
import { getCountdownParts } from "@/lib/bans";

function CountdownCell({ value, label }: { value: number; label: string }) {
  const padded = value.toString().padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-12 rounded-lg bg-background/60 border border-red-500/30 px-3 py-2 font-mono text-2xl font-black tabular-nums text-red-300">
        {padded}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function LiveCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [parts, setParts] = useState(() => getCountdownParts(expiresAt));

  useEffect(() => {
    const tick = () => {
      const next = getCountdownParts(expiresAt);
      setParts(next);
      if (!next) onExpire();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  if (!parts) {
    return (
      <div className="text-center text-sm font-semibold text-green-400">
        Your ban has just expired — you can sign in again.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <CountdownCell value={parts.days} label="days" />
      <span className="text-2xl font-black text-red-400/60 mb-4">:</span>
      <CountdownCell value={parts.hours} label="hours" />
      <span className="text-2xl font-black text-red-400/60 mb-4">:</span>
      <CountdownCell value={parts.minutes} label="min" />
      <span className="text-2xl font-black text-red-400/60 mb-4">:</span>
      <CountdownCell value={parts.seconds} label="sec" />
    </div>
  );
}

export function BanDialog({
  ban,
  open,
  onClose,
}: {
  ban: ActiveBan | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-red-500/40">
        <DialogHeader>
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
            <Ban className="w-7 h-7 text-red-400" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {ban?.is_permanent ? "You're permanently banned" : "You're temporarily banned"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Your access to Mingle has been restricted by a moderator.
          </DialogDescription>
        </DialogHeader>

        {ban && (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Reason
              </div>
              <div className="font-semibold">{ban.reason}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {ban.is_permanent ? "Duration" : "Time remaining"}
                </div>
              </div>
              {ban.is_permanent ? (
                <div className="font-semibold text-red-400 text-center">
                  Permanent — no expiration
                </div>
              ) : ban.expires_at ? (
                <>
                  <LiveCountdown
                    expiresAt={ban.expires_at}
                    onExpire={() => {
                      /* user can refresh */
                    }}
                  />
                  <div className="mt-3 text-center text-xs text-muted-foreground">
                    Lifts on {new Date(ban.expires_at).toLocaleString()}
                  </div>
                </>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              If you believe this is a mistake, please contact support.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full rounded-xl" variant="destructive">
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
