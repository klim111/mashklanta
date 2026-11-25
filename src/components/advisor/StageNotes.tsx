'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NOTE_VISIBILITY_LABELS, formatDate, formatTime } from '@/lib/advisor-crm';
import type { NoteVisibility } from '@/lib/advisor-crm';

/**
 * ההערות של היועץ בשלב.
 *
 * לכל הערה יש בחירה אחת מהותית: להישאר אישית אצל היועץ, או להישלח ללקוח —
 * ואז היא מופיעה אצלו באותו שלב, בשם היועץ. הבחירה ניתנת לשינוי גם אחר כך.
 */
export function StageNotes({
  notes,
  onCreate,
  onVisibility,
  onDelete,
}: {
  notes: Array<{
    id: string;
    body: string;
    visibility: NoteVisibility;
    advisorName: string;
    createdAt: string;
  }>;
  onCreate: (body: string, visibility: NoteVisibility) => Promise<string | null>;
  onVisibility: (noteId: string, visibility: NoteVisibility) => void;
  onDelete: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (visibility: NoteVisibility) => {
    if (!draft.trim()) return;
    setBusy(true);
    const failure = await onCreate(draft.trim(), visibility);
    setBusy(false);
    if (!failure) setDraft('');
  };

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-black text-slate-700">
        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
        הערות בשלב
      </p>

      {notes.map((note) => (
        <div
          key={note.id}
          className={`rounded-xl border p-2.5 ${
            note.visibility === 'SHARED'
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span
              className={`flex items-center gap-1 font-bold ${
                note.visibility === 'SHARED' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {note.visibility === 'SHARED' ? (
                <Eye className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {NOTE_VISIBILITY_LABELS[note.visibility]}
            </span>
            <span>
              {formatDate(note.createdAt)} · {formatTime(note.createdAt)}
            </span>

            <button
              type="button"
              onClick={() =>
                onVisibility(note.id, note.visibility === 'SHARED' ? 'PRIVATE' : 'SHARED')
              }
              className="ms-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              {note.visibility === 'SHARED' ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  החזר להערה אישית
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  שלח ללקוח
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              aria-label="מחיקת הערה"
              className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="הערה לשלב הזה"
          className="h-9 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            disabled={busy || !draft.trim()}
            onClick={() => void submit('PRIVATE')}
          >
            <Lock className="ml-1 h-3.5 w-3.5" />
            שמור כהערה אישית
          </Button>
          <Button
            size="sm"
            className="h-8 text-[11px]"
            disabled={busy || !draft.trim()}
            onClick={() => void submit('SHARED')}
          >
            <Send className="ml-1 h-3.5 w-3.5" />
            שלח ללקוח
          </Button>
        </div>
      </div>
    </div>
  );
}
