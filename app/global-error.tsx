"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold">Algo ha ido mal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El error ha quedado registrado. Prueba a recargar la página.
          </p>
        </div>
      </body>
    </html>
  );
}
