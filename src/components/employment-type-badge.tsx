import { Badge } from "@/components/ui/badge";

interface EmploymentTypeBadgeProps {
  type?: string | null;
  className?: string;
  size?: "xs" | "sm";
}

/**
 * Normalizes employment type for display.
 * E.g. "regular" -> "Regular", "contract" -> "Contract", "part-time" -> "Part-time"
 */
export function formatEmploymentType(type?: string | null): string {
  if (!type) return "";
  const trimmed = type.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "regular") return "Regular";
  if (lower === "contract") return "Contract";
  if (lower === "part-time" || lower === "part time") return "Part-time";
  return trimmed
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(trimmed.includes("-") ? "-" : " ");
}

/**
 * Highlights any non-regular employee with a badge near their name.
 * Returns null if the employee is regular or empty.
 */
export function EmploymentTypeBadge({
  type,
  className = "",
  size = "xs",
}: EmploymentTypeBadgeProps) {
  if (!type) return null;
  const lower = type.trim().toLowerCase();
  if (lower === "regular") return null;

  const label = formatEmploymentType(type);

  // Exact matching for contract to preserve existing styling
  let colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (lower.includes("contract")) {
    colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  } else if (lower.includes("part-time") || lower.includes("part time")) {
    colorClasses = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
  } else if (lower.includes("intern") || lower.includes("trainee")) {
    colorClasses = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
  } else {
    colorClasses = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
  }

  const paddingClass = size === "sm" ? "px-1.5 py-0.5" : "px-1.5 py-0";

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold shrink-0 ${paddingClass} ${colorClasses} ${className}`}
    >
      {label}
    </Badge>
  );
}
