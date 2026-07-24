"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza sus hijos dentro del <div id="header-actions"> fijo del layout,
 * para que cada página pueda inyectar su propia acción (p. ej. "Nuevo club")
 * en la misma cabecera fija, sin que cada página tenga que pintar su propia
 * barra superior.
 */
export function HeaderPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findTarget = () => setTarget(document.getElementById("header-actions"));
    findTarget();
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
