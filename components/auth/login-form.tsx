"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { signIn } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

const EXPIRED_MESSAGES: Record<string, string> = {
  session: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
  idle: "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.",
};

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    const expired = new URLSearchParams(window.location.search).get("expired");
    if (expired && EXPIRED_MESSAGES[expired]) {
      toast.info(EXPIRED_MESSAGES[expired]);
    }
  }, []);

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const result = await signIn(values);
    setLoading(false);

    if (result?.error) {
      toast.error("No se pudo iniciar sesión", { description: result.error });
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex flex-1 items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>AlbumCromos CRM</CardTitle>
          <CardDescription>Inicia sesión para acceder al panel.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* method="post" es una defensa adicional: si por lo que sea el JS
              no llega a hidratar (bloqueo de CSP, error, red lenta) el
              navegador cae al envío nativo del formulario, y con GET (el
              valor por defecto) el email y la contraseña acabarían en la URL. */}
          <form
            method="post"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
