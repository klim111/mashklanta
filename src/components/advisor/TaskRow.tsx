"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  Circle,
  FolderOpen,
  MoreVertical,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate, formatTime, taskIsOverdue } from "@/lib/advisor-crm";
import type {
  AdvisorTaskStatus,
  AdvisorTaskView,
  PlanStageId,
} from "@/lib/advisor-crm";
import { StageChip, fromLocalInputValue, toLocalInputValue } from "./ui";

interface TaskRowProps {
  task: AdvisorTaskView;
  /** מוצג כשהרשימה מרכזת משימות של כמה לקוחות */
  showClient?: boolean;
  showStage?: boolean;
  onToggle: (status: AdvisorTaskStatus) => void;
  onReschedule?: (dueDate: string | null) => void;
  /** מחיקה — אחרי אישור; המשימה נשמרת ברישום המשימות שנמחקו */
  onDelete?: () => void;
  /** פתיחת תיק הלקוח של המשימה, או פתיחת תיק ללקוח מתעניין כשאין לה לקוח */
  onOpenClientFile?: () => void;
}

/**
 * שורת משימה אחת.
 *
 * המועד ניתן לשינוי במקום, כי קביעת התאריך היא הפעולה שמכניסה את המשימה ללוח
 * השנה — ולכן היא צריכה להיות במרחק לחיצה מכל מקום שבו המשימה מוצגת.
 */
export function TaskRow({
  task,
  showClient = false,
  showStage = true,
  onToggle,
  onReschedule,
  onDelete,
  onOpenClientFile,
}: TaskRowProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = task.status === "DONE";
  const overdue = taskIsOverdue(task);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition-colors ${
        done
          ? "border-slate-100 bg-slate-50/60"
          : overdue
            ? "border-amber-200 bg-amber-50/60"
            : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(done ? "OPEN" : "DONE")}
        aria-label={done ? "החזר למשימה פתוחה" : "סמן כבוצע"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 text-transparent hover:border-emerald-400"
        }`}
      >
        {done ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Circle className="h-3 w-3" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            done ? "text-slate-400 line-through" : "text-slate-900"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          {showClient &&
            (task.clientId ? (
              <Link
                href={`/advisor-dashboard/client/${task.clientId}`}
                className="flex items-center gap-1 font-semibold text-blue-700 hover:underline"
              >
                <UserRound className="h-3 w-3" />
                {task.clientName}
              </Link>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
                <UserRound className="h-3 w-3" />
                ללא שיוך ללקוח
              </span>
            ))}
          {showStage && <StageChip stage={task.stage as PlanStageId} />}
          {task.details && <span className="truncate">{task.details}</span>}
        </div>
      </div>

      {editingDate && onReschedule ? (
        <Input
          type="datetime-local"
          autoFocus
          defaultValue={toLocalInputValue(task.dueDate)}
          onBlur={(event) => {
            onReschedule(fromLocalInputValue(event.target.value));
            setEditingDate(false);
          }}
          className="h-8 w-[190px] text-xs"
        />
      ) : (
        <button
          type="button"
          disabled={!onReschedule}
          onClick={() => setEditingDate(true)}
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
            task.dueDate
              ? overdue
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
              : "border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          <CalendarClock className="h-3 w-3" />
          {task.dueDate
            ? `${formatDate(task.dueDate)} · ${formatTime(task.dueDate)}`
            : "קבעו תאריך"}
        </button>
      )}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="אפשרויות למשימה"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent dir="rtl" align="end" className="w-52 p-1 text-right">
          {onOpenClientFile && (
            <MenuItem
              icon={<FolderOpen className="h-4 w-4 text-blue-600" />}
              label={task.clientId ? "פתח תיק לקוח" : "פתח תיק ללקוח חדש"}
              onClick={() => {
                setMenuOpen(false);
                onOpenClientFile();
              }}
            />
          )}
          <MenuItem
            icon={
              done ? (
                <RotateCcw className="h-4 w-4 text-slate-600" />
              ) : (
                <Check className="h-4 w-4 text-emerald-600" />
              )
            }
            label={done ? "החזר למשימות הפתוחות" : "משימה בוצעה"}
            onClick={() => {
              setMenuOpen(false);
              onToggle(done ? "OPEN" : "DONE");
            }}
          />
          {onDelete && (
            <MenuItem
              icon={<Trash2 className="h-4 w-4 text-red-500" />}
              label="מחק משימה"
              tone="danger"
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
            />
          )}
        </PopoverContent>
      </Popover>

      {onDelete && (
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent dir="rtl" className="max-w-sm text-right">
            <DialogHeader className="text-right sm:text-right">
              <DialogTitle>למחוק את המשימה?</DialogTitle>
              <DialogDescription>
                “{task.title}” תוסר מרשימת המשימות. רישום שלה יישמר ברשימת
                המשימות שנמחקו.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
              >
                מחק משימה
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                ביטול
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
        tone === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
