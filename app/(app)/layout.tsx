import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { GoogleCalendarStatusToast } from "@/components/google-calendar-status-toast";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.id)
    .single();

  // Sin await a propósito: esto no debe bloquear el layout (que se vuelve a
  // ejecutar en cada navegación entre módulos) solo para saber si hay que
  // mostrar "Conectar" o "Reconectar" Google Calendar en el menú de usuario.
  // UserMenu la resuelve con `use()` dentro de su propio <Suspense>.
  const googleCalendarConnectedPromise = Promise.resolve(
    supabase
      .from("google_calendar_tokens")
      .select("profile_id", { count: "exact", head: true })
      .eq("profile_id", user.id)
  ).then(({ count }) => (count ?? 0) > 0);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
          </div>
          <div className="flex items-center gap-2">
            <div id="header-actions" className="flex items-center gap-2" />
            <ModeToggle />
            <UserMenu
              nombre={profile?.nombre ?? user.email ?? "Usuario"}
              email={user.email ?? ""}
              googleCalendarConnectedPromise={googleCalendarConnectedPromise}
            />
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </SidebarInset>
      <Suspense fallback={null}>
        <GoogleCalendarStatusToast />
      </Suspense>
    </SidebarProvider>
  );
}
