"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createLabel } from "@/lib/actions/tasks";

const COLOR_SWATCHES = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#64748B",
];

export function CreateLabelButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createLabel(name.trim(), color);
      toast.success("Etiqueta creada");
      setName("");
      setColor(COLOR_SWATCHES[0]);
      setOpen(false);
    } catch (err) {
      toast.error("No se pudo crear la etiqueta", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors"
          style={{ borderStyle: "dashed", borderWidth: 1 }}
        >
          <Plus className="size-3" />
          Nueva
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Nombre</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Urgente"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className="size-6 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid var(--foreground)" : "none",
                  outlineOffset: 2,
                  transform: color === c ? "scale(1.1)" : undefined,
                }}
              />
            ))}
          </div>
        </div>
        <Button size="sm" onClick={handleCreate} disabled={loading || !name.trim()}>
          {loading ? "Creando…" : "Crear etiqueta"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
