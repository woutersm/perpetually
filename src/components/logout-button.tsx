import { LogOut } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.navigate({ to: "/login" });
        },
      },
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      title="Sign out"
    >
      <LogOut className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
}
