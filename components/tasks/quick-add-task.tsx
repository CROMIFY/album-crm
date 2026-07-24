"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask } from "@/lib/actions/tasks";

export function QuickAddTask({ columnId }: { columnId: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      setEditing(false);
      return;
    }
    setLoading(true);
    try {
      await createTask({ columnId, title, labelIds: [] });
      setTitle("");
    } catch (err) {
      toast.error("No se pudo crear la tarea", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={title}
        placeholder="Título de la tarea"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleCreate}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        disabled={loading}
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground justify-start"
      onClick={() => setEditing(true)}
    >
      <Plus />
      Añadir tarea
    </Button>
  );
}
