import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance · SWIFT" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { employees, attendance, upsertAttendance, company } = useStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const rows = useMemo(
    () =>
      employees.map((e) => {
        const rec = attendance.find((a) => a.employeeId === e.id && a.date === date);
        return { emp: e, rec };
      }),
    [employees, attendance, date]
  );

  const mark = (empId: string, status: "present" | "absent" | "leave" | "half-day") => {
    const existing = attendance.find((a) => a.employeeId === empId && a.date === date);
    upsertAttendance({
      id: existing?.id || crypto.randomUUID(),
      employeeId: empId,
      date,
      status,
      hoursWorked: status === "present" ? company.workingHoursPerDay : status === "half-day" ? company.workingHoursPerDay / 2 : 0,
      otHours: existing?.otHours || 0,
      checkIn: existing?.checkIn,
      checkOut: existing?.checkOut,
    });
    toast.success(`Marked ${status}`);
  };

  const setOT = (empId: string, hours: number) => {
    const existing = attendance.find((a) => a.employeeId === empId && a.date === date);
    upsertAttendance({
      id: existing?.id || crypto.randomUUID(),
      employeeId: empId,
      date,
      status: existing?.status || "present",
      hoursWorked: existing?.hoursWorked ?? company.workingHoursPerDay,
      otHours: hours,
      checkIn: existing?.checkIn,
      checkOut: existing?.checkOut,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track daily attendance and overtime for payroll calculation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Employee</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">OT hrs</th>
              <th className="p-3 text-right">Mark</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No employees</td></tr>
            )}
            {rows.map(({ emp, rec }) => (
              <tr key={emp.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.empCode}</div>
                </td>
                <td className="p-3">{emp.department}</td>
                <td className="p-3">
                  <StatusPill status={rec?.status} />
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    className="w-20"
                    value={rec?.otHours ?? 0}
                    onChange={(e) => setOT(emp.id, +e.target.value || 0)}
                  />
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => mark(emp.id, "present")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => mark(emp.id, "half-day")}>
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => mark(emp.id, "leave")}>
                      L
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => mark(emp.id, "absent")}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    present: "bg-teal-soft text-primary",
    absent: "bg-destructive/10 text-destructive",
    leave: "bg-accent text-accent-foreground",
    "half-day": "bg-coral-soft text-accent-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{status}</span>;
}
