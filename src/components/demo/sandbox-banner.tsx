import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimulatePurchaseDialog } from "@/components/demo/simulate-purchase-dialog";

function timeLeft(expiresAt: Date) {
  const hours = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return hours >= 1 ? `${hours}h` : "less than an hour";
}

export function SandboxBanner({ expiresAt }: { expiresAt: Date }) {
  const [simulateOpen, setSimulateOpen] = useState(false);

  return (
    <div className="border-b border-vibrant/30 bg-vibrant/5 px-4 py-2">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-vibrant" />
          <span className="font-medium text-vibrant">Demo sandbox</span>
          <span className="text-muted-foreground">
            Private to you · deleted in {timeLeft(expiresAt)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Button size="sm" variant="vibrant" className="h-7" onClick={() => setSimulateOpen(true)}>
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Simulate purchase
          </Button>
          <Button size="sm" variant="outline" className="h-7" asChild>
            <Link to="/playground">
              <Terminal className="mr-1.5 h-3.5 w-3.5" />
              API playground
            </Link>
          </Button>
        </span>
      </div>
      <SimulatePurchaseDialog open={simulateOpen} onOpenChange={setSimulateOpen} />
    </div>
  );
}
