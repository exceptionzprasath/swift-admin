import React from "react";
import { Badge } from "@/components/ui/badge";

export function renderEmployeeStatusBadge(status?: string, lastWorkingDate?: string) {
  const s = (status || "active").toLowerCase().trim();
  if (s === "suspended") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Suspended</span>
      </Badge>
    );
  }
  if (s === "relieved" || s === "releived") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
        <span>Releived</span>
      </Badge>
    );
  }
  if (s === "terminated") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Terminated</span>
      </Badge>
    );
  }
  if (s === "notice_period" || s === "notice") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isFinalDay = !!lastWorkingDate && todayStr === lastWorkingDate;
    const isLwdPassed = !!lastWorkingDate && todayStr > lastWorkingDate;
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge
          variant="outline"
          className={`text-[11px] px-2.5 py-0.5 font-medium whitespace-nowrap gap-1.5 ${
            isLwdPassed
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
              : isFinalDay
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 animate-pulse"
              : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              isLwdPassed ? "bg-rose-500" : isFinalDay ? "bg-amber-500" : "bg-orange-500"
            }`}
          />
          <span>{isLwdPassed ? "Notice Ended" : isFinalDay ? "Notice (Final Day)" : "Notice Period"}</span>
        </Badge>
        {lastWorkingDate && (
          <span className="text-[10px] text-muted-foreground font-mono" title={`Last Working Day: ${lastWorkingDate}`}>
            LWD: {lastWorkingDate}
          </span>
        )}
      </div>
    );
  }
  if (s === "frozen" || s === "freezed") {
    return (
      <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 whitespace-nowrap gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
        <span>Freezed</span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 whitespace-nowrap gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      <span>Active</span>
    </Badge>
  );
}
