import { connection } from "next/server";
import { LoginForm } from "@/components/auth/login-form";

// La CSP (proxy.ts) genera un nonce distinto en cada request; si esta página
// se prerenderizase de forma estática, el HTML serviría scripts sin el nonce
// correcto y el navegador bloquearía toda la hidratación (el <form> caería en
// su envío nativo). `connection()` fuerza el renderizado dinámico.
export default async function LoginPage() {
  await connection();
  return <LoginForm />;
}
