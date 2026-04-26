import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban, Clock } from "lucide-react";
import type { ActiveBan } from "@/lib/bans";
import { formatRemaining } from "@/lib/bans";

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
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Reason</div>
              <div className="font-semibold">{ban.reason}</div>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Duration</div>
                {ban.is_permanent ? (
                  <div className="font-semibold text-red-400">Permanent — no expiration</div>
                ) : ban.expires_at ? (
                  <div className="font-semibold">
                    Ends {new Date(ban.expires_at).toLocaleString()}{" "}
                    <span className="text-muted-foreground font-normal">
                      (in {formatRemaining(ban.expires_at)})
                    </span>
                  </div>
                ) : null}
              </div>
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