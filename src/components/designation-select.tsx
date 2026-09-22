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

export const DEFAULT_DESIGNATIONS = [
  "Accountant",
  "Business Development Lead",
  "Chief Executive Officer",
  "Chief Financial Officer",
  "Customer Support Specialist",
  "DevOps Engineer",
  "Director of Engineering",
  "Engineering Manager",
  "Finance Manager",
  "HR Director",
  "HR Executive",
  "HR Manager",
  "Marketing Manager",
  "Marketing Specialist",
  "Office Administrator",
  "Operations Executive",
  "Operations Lead",
  "Operations Manager",
  "Product Manager",
  "Quality Assurance Engineer",
  "Sales Executive",
  "Sales Manager",
  "Senior Software Engineer",
  "Software Engineer",
  "Tech Lead",
  "UI/UX Designer",
] as const;

interface DesignationSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function DesignationSelect({
  value = "",
  onChange,
  label,
  placeholder = "Select or add designation…",
  className = "",
  triggerClassName = "",
  disabled = false,
}: DesignationSelectProps) {
  const { company, employees, addDesignation, deleteDesignation } = useStore();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesignationTitle, setNewDesignationTitle] = useState("");

  const companyDesignations = useMemo(() => company.designations || [], [company.designations]);

  // Combine standard, company-specific, and employee designations
  const options = useMemo(() => {
    const empDesignations = employees
      .map((e) => e.designation?.trim())
      .filter((d): d is string => Boolean(d && d.length > 0));

    const set = new Set<string>([
      ...DEFAULT_DESIGNATIONS,
      ...companyDesignations,
      ...empDesignations,
    ]);

    if (value && value.trim() && value !== "__custom" && value !== "__add_more") {
      set.add(value.trim());
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companyDesignations, employees, value]);

  // Determine current select value
  const selectValue = useMemo(() => {
    if (isCustomMode) return "__custom";
    if (!value) return "";
    if (options.includes(value)) return value;
    return "__custom";
  }, [isCustomMode, value, options]);

  const handleSelectChange = (val: string) => {
    if (val === "__add_more") {
      setNewDesignationTitle("");
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

  const handleCreateCompanyDesignation = () => {
    const trimmed = newDesignationTitle.trim();
    if (!trimmed) {
      toast.error("Please enter a designation title");
      return;
    }
    addDesignation(trimmed);
    setIsCustomMode(false);
    onChange(trimmed);
    setShowAddModal(false);
    setNewDesignationTitle("");
    toast.success(`"${trimmed}" added to company designations`);
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
          {options.map((opt) => {
            const isCompanyCustom = companyDesignations.includes(opt);
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
            placeholder="Type custom designation…"
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
                <DialogTitle className="text-base font-semibold">Add Company Designation</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a new designation saved specifically for {company.name || "your company"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designation Title *</Label>
              <Input
                autoFocus
                value={newDesignationTitle}
                onChange={(e) => setNewDesignationTitle(e.target.value)}
                placeholder="e.g. Senior Solutions Architect, Brand Specialist"
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCompanyDesignation();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                This designation will be stored in your company profile and available for all employees.
              </p>
            </div>

            {companyDesignations.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Existing Custom Designations for this Company ({companyDesignations.length})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {companyDesignations.map((d) => (
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
                          deleteDesignation(d);
                          toast.info(`Removed "${d}" from company designations`);
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
              onClick={handleCreateCompanyDesignation}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Save Designation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
