import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Download,
  Fingerprint,
  ScanFace,
  CreditCard,
  KeyRound,
  Play,
  Eye,
  Copy,
  MapPin,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type Employee } from "@/lib/store";
import { toast } from "sonner";

interface StaffBiometricDirectoryProps {
  employees: Employee[];
  departments: string[];
  branches: Array<{ id: string; name: string }>;
  onOpenDossierForEmployee?: (employee: Employee) => void;
}

export function StaffBiometricDirectory({
  employees = [],
  departments = [],
  branches = [],
  onOpenDossierForEmployee,
}: StaffBiometricDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.empCode?.toLowerCase().includes(q) ||
        emp.id?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q);

      const matchesDept = selectedDept === "all" || emp.department === selectedDept;
      const matchesBranch =
        selectedBranch === "all" ||
        emp.branchId === selectedBranch ||
        (emp as any).branch === selectedBranch;

      return matchesSearch && matchesDept && matchesBranch;
    });
  }, [employees, searchQuery, selectedDept, selectedBranch]);

  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      toast.error("No employees to export.");
      return;
    }

    const headers = [
      "Staff Name",
      "Employee Code / PIN",
      "Internal ID",
      "Department",
      "Designation",
      "Branch",
      "Email",
      "Phone",
    ];

    const rows = filteredEmployees.map((emp) => [
      `"${(emp.name || "").replace(/"/g, '""')}"`,
      `"${emp.empCode || emp.id || ""}"`,
      `"${emp.id || ""}"`,
      `"${emp.department || "General"}"`,
      `"${emp.designation || "Staff"}"`,
      `"${emp.branchId || "Head Office"}"`,
      `"${emp.email || ""}"`,
      `"${emp.phone || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `staff_biometric_mapping_${format(new Date(), "yyyyMMdd_HHmm")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff Biometric Directory exported to CSV!");
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff name, PIN, code, or email..."
              className="pl-8 h-8 text-xs rounded-xl"
            />
          </div>

          {/* Department Filter */}
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="h-8 text-xs w-[150px] rounded-xl">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="h-8 text-xs w-[140px] rounded-xl">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-8 text-xs rounded-xl gap-1.5 font-medium border-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Enrolled Biometric Staff Directory ({filteredEmployees.length} Employees)
            </CardTitle>
            <CardDescription className="text-xs">
              Staff members and their biometric device mappings for fingerprint, facial recognition, and RFID machines
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
            {filteredEmployees.length} of {employees.length} Enrolled
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="w-6 h-6" />
              </div>
              <div className="font-semibold text-foreground text-sm">No Employees Found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No staff members match the current search or filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Machine PIN / User ID</th>
                  <th className="p-3">Department & Role</th>
                  <th className="p-3">Branch Location</th>
                  <th className="p-3">Biometric Credentials</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp) => {
                  const pinCode = emp.empCode || emp.id?.slice(0, 6) || "101";
                  const initials = emp.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "EM";

                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      {/* Employee Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-xl border border-border">
                            <AvatarImage src={(emp as any).avatar || (emp as any).photo} alt={emp.name} />
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {emp.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Machine User ID / PIN */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded-md border border-border text-foreground text-[11px]">
                            {pinCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(pinCode);
                              toast.success(`Copied PIN (${pinCode}) for ${emp.name}!`);
                            }}
                            className="text-muted-foreground hover:text-primary p-1 rounded"
                            title="Copy PIN"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {emp.department || "Operations"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {emp.designation || "Staff"}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground/70" />
                          <span>
                            {branches.find((b) => b.id === emp.branchId)?.name || "Head Office"}
                          </span>
                        </div>
                      </td>

                      {/* Biometric Credentials Status */}
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1 px-1.5 py-0"
                            title="Fingerprint enrolled"
                          >
                            <Fingerprint className="w-3 h-3" />
                            <span>Fingerprint</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] gap-1 px-1.5 py-0"
                            title="Facial Recognition active"
                          >
                            <ScanFace className="w-3 h-3" />
                            <span>Face AI</span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] gap-1 px-1.5 py-0"
                            title="RFID Card mapped"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>RFID</span>
                          </Badge>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenDossierForEmployee?.(emp)}
                            className="h-7 px-2.5 text-[11px] rounded-lg gap-1.5 text-primary hover:bg-primary/10 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Dossier</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
