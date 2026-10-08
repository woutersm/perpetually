import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { startDemo } from "@/functions/demo";

type TryDemoButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "asChild"> & {
  label?: string;
};

/** Creates a private sandbox, signs into it, and opens the dashboard */
export function TryDemoButton({ label = "Try the live demo", children, ...props }: TryDemoButtonProps) {
  const navigate = useNavigate();
  const start = useServerFn(startDemo);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { email, password } = await start();
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the demo");
      setLoading(false);
    }
  };

  return (
    <Button {...props} onClick={handleClick} disabled={loading || props.disabled}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Preparing your sandbox…
        </>
      ) : (
        children ?? (
          <>
            {label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )
      )}
    </Button>
  );
}
