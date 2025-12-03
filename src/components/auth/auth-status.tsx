import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function AuthStatus() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Auth</Badge>
        <span>Авторизация не выполнена</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary">TG</Badge>
      <span className="font-medium text-foreground">
        {currentUser.name ? currentUser.name : currentUser.telegramHandle || currentUser.id}
      </span>
    </div>
  );
}
