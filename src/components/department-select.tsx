import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Building2, Check, X, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DepartmentSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function DepartmentSelect({
  value = "",
  onChange,
  label,
  placeholder = "Select or add department…",
  className = "",
  triggerClassName = "",
  disabled = false,
}: DepartmentSelectProps) {
  const { company, employees, addDepartment, deleteDepartment } = useStore();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDepartmentTitle, setNewDepartmentTitle] = useState("");

  const companyDepartments = useMemo(() => company.departments || [], [company.departments]);

  // Unlike DesignationSelect, there are NO preloaded default departments.
  // Options only come from company departments and existing employees.
  const options = useMemo(() => {
    const empDepartments = employees
      .map((e) => e.department?.trim())
      .filter((d): d is string => Boolean(d && d.length > 0));

    const set = new Set<string>([
      ...companyDepartments,
      ...empDepartments,
    ]);

    if (value && value.trim() && value !== "__custom" && value !== "__add_more") {
      set.add(value.trim());
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companyDepartments, employees, value]);

  // Determine current select value
  const selectValue = useMemo(() => {
    if (isCustomMode) return "__custom";
    if (!value) return "";
    if (options.includes(value)) return value;
    return "__custom";
  }, [isCustomMode, value, options]);

  const handleSelectChange = (val: string) => {
    if (val === "__add_more") {
      setNewDepartmentTitle("");
      setShowAddModal(true);
      return;
    }
    if (val === "__custom") {
      setIsCustomMode(true);
      setCustomInput(value && !options.includes(value) ? value : "");
      return;
    }
    setIsCustomMode(false);
    onChange(val);
  };

  const handleCreateCompanyDepartment = () => {
    const trimmed = newDepartmentTitle.trim();
    if (!trimmed) {
      toast.error("Please enter a department name");
      return;
    }
    addDepartment(trimmed);
    setIsCustomMode(false);
    onChange(trimmed);
    setShowAddModal(false);
    setNewDepartmentTitle("");
    toast.success(`"${trimmed}" added to company departments`);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <Label className="text-xs">{label}</Label>}

      <Select
        value={selectValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className={triggerClassName || "text-xs"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          {/* List existing company and employee departments */}
          {options.map((opt) => {
            const isCompanyCustom = companyDepartments.includes(opt);
            return (
              <SelectItem key={opt} value={opt} className="text-xs">
                <span className="flex items-center justify-between w-full gap-2">
                  <span>{opt}</span>
                  {isCompanyCustom && (
                    <span className="text-[10px] text-primary bg-primary/10 px-1 py-0.2 rounded font-medium ml-2">
                      Company
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}

          {options.length > 0 && <SelectSeparator className="my-1" />}

          {/* 1. Custom (One-off) Option */}
          <SelectItem
            value="__custom"
            className="text-xs font-medium text-foreground hover:bg-muted/80 focus:bg-muted/80 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>Custom (One-off)</span>
            </div>
          </SelectItem>

          {/* 2. Add more option (opens dialog modal) */}
          <SelectItem
            value="__add_more"
            className="text-xs font-medium text-primary hover:bg-primary/10 focus:bg-primary/10 focus:text-primary cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
              <span className="underline underline-offset-4 decoration-primary/70 group-hover:decoration-primary font-semibold tracking-wide">
                Add more
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                + Company
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* When Custom Mode is active, render text input */}
      {isCustomMode && (
        <div className="flex items-center gap-1.5 pt-1 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <Input
            autoFocus
            type="text"
            className="h-8 text-xs flex-1 bg-background"
            placeholder="Type custom department…"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              onChange(e.target.value);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsCustomMode(false);
              setCustomInput("");
              onChange(options[0] || "");
            }}
            title="Switch back to dropdown list"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      {/* Modal Dialog for "+ Add more" (Persisted per Company / Tenant in Backend) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Add Company Department</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a new department saved specifically for {company.name || "your company"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department Name *</Label>
              <Input
                autoFocus
                value={newDepartmentTitle}
                onChange={(e) => setNewDepartmentTitle(e.target.value)}
                placeholder="e.g. Engineering, Human Resources, Finance"
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCompanyDepartment();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                This department will be stored in your company profile and available for all employees.
              </p>
            </div>

            {companyDepartments.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Existing Custom Departments for this Company ({companyDepartments.length})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {companyDepartments.map((d) => (
                    <Badge
                      key={d}
                      variant="secondary"
                      className="text-[10.5px] py-0.5 px-2 flex items-center gap-1 font-normal group/badge"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDepartment(d);
                          toast.info(`Removed "${d}" from company departments`);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        title={`Remove ${d}`}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCompanyDepartment}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Save Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
