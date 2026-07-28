"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { addMeetingNote, updateMeetingNote } from "@/lib/actions/meetings";
import type { MeetingNoteRow, ProfileRow } from "@/lib/types";

export function MeetingNotesPanel({
  meetingId,
  notes,
  profiles,
}: {
  meetingId: string;
  notes: MeetingNoteRow[];
  profiles: ProfileRow[];
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  async function handleAdd() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await addMeetingNote(meetingId, content);
      setContent("");
    } catch (err) {
      toast.error("No se pudo añadir la nota", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(note: MeetingNoteRow) {
    setEditingId(note.id);
    setEditingContent(note.content);
  }

  async function saveEdit() {
    if (!editingId || !editingContent.trim()) return;
    try {
      await updateMeetingNote(editingId, editingContent);
      setEditingId(null);
    } catch (err) {
      toast.error("No se pudo guardar la nota", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 && <p className="text-muted-foreground text-sm">Sin notas todavía.</p>}
      {notes.map((note) => {
        const author = note.author_id ? profileById.get(note.author_id) : null;
        const isEditing = editingId === note.id;
        return (
          <Card key={note.id}>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>
                  {author?.nombre ?? "Alguien"} ·{" "}
                  {new Date(note.created_at).toLocaleString("es-ES")}
                </span>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => startEdit(note)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{note.content}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
      <div className="flex flex-col gap-2 border-t pt-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Escribe una nota de la reunión…"
        />
        <Button onClick={handleAdd} disabled={loading} size="sm" className="self-start">
          Añadir nota
        </Button>
      </div>
    </div>
  );
}
