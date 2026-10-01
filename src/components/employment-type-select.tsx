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
import { Plus, Pencil, Briefcase, Check, X, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmploymentTypeBadge, formatEmploymentType } from "@/components/employment-type-badge";

export { EmploymentTypeBadge, formatEmploymentType };

export const DEFAULT_EMPLOYMENT_TYPES = [
  "Regular",
  "Contract",
  "Part-time",
] as const;

interface EmploymentTypeSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function EmploymentTypeSelect({
  value = "",
  onChange,
  label,
  placeholder = "Select or add employment type…",
  className = "",
  triggerClassName = "",
  disabled = false,
}: EmploymentTypeSelectProps) {
  const { company, employees, addEmploymentType, deleteEmploymentType } = useStore();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTypeTitle, setNewTypeTitle] = useState("");

  const companyEmploymentTypes = useMemo(
    () => company.employmentTypes || [],
    [company.employmentTypes]
  );

  // Combine standard (Regular, Contract, Part-time), company-specific, and employee types
  const options = useMemo(() => {
    const empTypes = employees
      .map((e) => e.employmentType?.trim())
      .filter((t): t is string => Boolean(t && t.length > 0));

    // Map by lowercased key to avoid duplicates while retaining best casing
    const map = new Map<string, string>();

    // 1. Defaults first
    for (const d of DEFAULT_EMPLOYMENT_TYPES) {
      map.set(d.toLowerCase(), d);
    }

    // 2. Company custom employment types
    for (const c of companyEmploymentTypes) {
      const trimmed = c.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    }

    // 3. Types from existing employees
    for (const e of empTypes) {
      const trimmed = e.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), formatEmploymentType(trimmed));
      }
    }

    // 4. Current selected value if any
    if (value && value.trim() && value !== "__custom" && value !== "__add_more") {
      const trimmed = value.trim();
      if (!map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), formatEmploymentType(trimmed));
      }
    }

    return Array.from(map.values());
  }, [companyEmploymentTypes, employees, value]);

  // Determine current select value
  const selectValue = useMemo(() => {
    if (isCustomMode) return "__custom";
    if (!value) return "";
    const matched = options.find((opt) => opt.toLowerCase() === value.trim().toLowerCase());
    if (matched) return matched;
    return "__custom";
  }, [isCustomMode, value, options]);

  const handleSelectChange = (val: string) => {
    if (val === "__add_more") {
      setNewTypeTitle("");
      setShowAddModal(true);
      return;
    }
    if (val === "__custom") {
      setIsCustomMode(true);
      setCustomInput(value && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase()) ? value : "");
      return;
    }
    setIsCustomMode(false);
    onChange(val);
  };

  const handleCreateCompanyType = () => {
    const trimmed = newTypeTitle.trim();
    if (!trimmed) {
      toast.error("Please enter an employment type name");
      return;
    }
    addEmploymentType(trimmed);
    setIsCustomMode(false);
    onChange(trimmed);
    setShowAddModal(false);
    setNewTypeTitle("");
    toast.success(`"${trimmed}" added to company employment types`);
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
          {/* List existing default, company, and employee employment types */}
          {options.map((opt) => {
            const isCompanyCustom = companyEmploymentTypes.includes(opt);
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

          <SelectSeparator className="my-1" />

          {/* Custom option */}
          <SelectItem
            value="__custom"
            className="text-xs font-medium text-foreground hover:bg-muted/80 focus:bg-muted/80 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>Custom (One-off)</span>
            </div>
          </SelectItem>

          {/* Add more option - styled like Windows right-click menu item with underline */}
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
            placeholder="Type custom employment type…"
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
              onChange(options[0] || "Regular");
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
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Add Company Employment Type</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a new employment type saved specifically for {company.name || "your company"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Employment Type Title *</Label>
              <Input
                autoFocus
                value={newTypeTitle}
                onChange={(e) => setNewTypeTitle(e.target.value)}
                placeholder="e.g. Probationary, Intern, Consultant, Freelance"
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCompanyType();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                This employment type will be stored in your company profile and available for all employees.
              </p>
            </div>

            {companyEmploymentTypes.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Existing Custom Employment Types for this Company ({companyEmploymentTypes.length})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {companyEmploymentTypes.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-[10.5px] py-0.5 px-2 flex items-center gap-1 font-normal group/badge"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmploymentType(t);
                          toast.info(`Removed "${t}" from company employment types`);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        title={`Remove ${t}`}
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
              onClick={handleCreateCompanyType}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Save Employment Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
