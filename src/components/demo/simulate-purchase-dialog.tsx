import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSimulatorOptions, simulatePurchase } from "@/functions/demo";
import { useTestMode } from "@/lib/test-mode-context";

const NEW_CUSTOMER = "__new__";

type Options = Awaited<ReturnType<typeof getSimulatorOptions>>;
type Result = Awaited<ReturnType<typeof simulatePurchase>>;

const STEPS = [
  "payment_intent.succeeded received",
  "Customer matched or created",
  "License issued from product policy",
  "Audit event recorded",
];

export function SimulatePurchaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { isTestMode } = useTestMode();
  const loadOptions = useServerFn(getSimulatorOptions);
  const simulate = useServerFn(simulatePurchase);

  const [options, setOptions] = useState<Options | null>(null);
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState(NEW_CUSTOMER);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    loadOptions().then((opts) => {
      setOptions(opts);
      setProductId((current) => current || opts.products[0]?.id || "");
    });
  }, [open, loadOptions]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await simulate({
        data: {
          productId,
          customerId: customerId === NEW_CUSTOMER ? undefined : customerId,
          isTestMode,
        },
      });
      setResult(res);
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-vibrant" />
            Simulate a Stripe purchase
          </DialogTitle>
          <DialogDescription>
            Runs the same license-issuing code as the Stripe webhook, without a real payment.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <ol className="space-y-2">
              {STEPS.map((step) => (
                <li key={step} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  {step}
                </li>
              ))}
            </ol>
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                {result.product.name} · {result.customer.name}
              </p>
              <p className="font-mono text-lg tracking-wide">{result.license.key}</p>
              <p className="text-xs text-muted-foreground font-mono">{result.paymentIntentId}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>
                Simulate another
              </Button>
              <Button variant="vibrant" asChild>
                <Link
                  to="/licenses/$licenseId"
                  params={{ licenseId: result.license.id }}
                  onClick={() => onOpenChange(false)}
                >
                  View license
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId} disabled={!options}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Loading…" />
                </SelectTrigger>
                <SelectContent>
                  {options?.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId} disabled={!options}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_CUSTOMER}>New customer</SelectItem>
                  {options?.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isTestMode && (
              <p className="text-xs text-muted-foreground">
                Test mode is on, so this purchase is recorded as a Stripe test payment.
              </p>
            )}
            <DialogFooter>
              <Button
                variant="vibrant"
                onClick={handleSubmit}
                disabled={!productId || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Complete purchase
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
