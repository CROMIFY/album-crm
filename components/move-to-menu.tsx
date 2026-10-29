"use client";

import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * «Mover a…» de una tarjeta, solo en móvil (md:hidden): cambiar de columna sin
 * depender del arrastre. Corta la propagación para que tocar el botón no empiece
 * un arrastre ni abra la tarjeta.
 */
export function MoveToMenu({
  itemName,
  targets,
  currentId,
  onMove,
}: {
  itemName: string;
  targets: { id: string; label: string }[];
  currentId: string;
  onMove: (targetId: string) => void;
}) {
  return (
    <div
      className="md:hidden"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Mover «${itemName}» a…`}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mover a…</DropdownMenuLabel>
          {targets.map((target) => (
            <DropdownMenuItem
              key={target.id}
              disabled={target.id === currentId}
              onSelect={() => onMove(target.id)}
            >
              {target.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
