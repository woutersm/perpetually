import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SimulatePurchaseDialog } from "@/components/demo/simulate-purchase-dialog";
import { CONTENT_WIDTH } from "@/components/top-nav";
import { cn } from "@/lib/utils";

function timeLeft(expiresAt: Date) {
  const hours = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return hours >= 1 ? `${hours}h` : "less than an hour";
}

export function SandboxBanner({ expiresAt }: { expiresAt: Date }) {
  const [simulateOpen, setSimulateOpen] = useState(false);

  return (
    <div className="border-b border-border bg-muted/60">
      <div className={cn(CONTENT_WIDTH, "flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs text-muted-foreground")}>
        <span>
          <span className="text-foreground">Demo sandbox</span> · private to you · deleted in{" "}
          {timeLeft(expiresAt)}
        </span>
        <span className="flex gap-4 sm:ml-auto">
          <button onClick={() => setSimulateOpen(true)} className="text-vibrant hover:underline">
            Simulate a purchase
          </button>
          <Link to="/playground" className="text-vibrant hover:underline">
            Try the API
          </Link>
        </span>
      </div>
      <SimulatePurchaseDialog open={simulateOpen} onOpenChange={setSimulateOpen} />
    </div>
  );
}
