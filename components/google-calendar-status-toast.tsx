"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

export function GoogleCalendarStatusToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("google_calendar");

  useEffect(() => {
    if (!status) return;
    if (status === "connected") {
      toast.success("Google Calendar conectado");
    } else {
      toast.error("No se pudo conectar Google Calendar", {
        description: "Inténtalo de nuevo desde el menú de usuario.",
      });
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("google_calendar");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // Solo debe ejecutarse una vez al montar con el parámetro presente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
