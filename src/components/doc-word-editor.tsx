import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Eraser,
  RotateCcw,
  RotateCw,
  Sparkles,
  Table as TableIcon,
  Layers,
  PenTool,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  FileDown,
  Check,
  Plus,
  Trash2,
  Settings2,
  Eye,
  Code2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ShieldCheck,
  QrCode,
  Info,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  X,
  Receipt,
} from "lucide-react";
import { computePayroll } from "@/lib/payroll";
import { numberToWordsIndian } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type {
  DocLetterheadConfig,
  DocFooterConfig,
  DocCustomTable,
  LetterheadStyle,
  FooterStyle,
} from "@/lib/digital-documents";
import { DYNAMIC_FIELDS } from "@/lib/digital-documents";
import type { Employee, Company } from "@/lib/store";

interface DocWordEditorProps {
  value: string;
  onChange: (html: string) => void;
  selectedEmployee?: Employee | null;
  company?: Company | null;
  docAssets?: any;
  letterhead: DocLetterheadConfig;
  onLetterheadChange: (config: DocLetterheadConfig) => void;
  footer: DocFooterConfig;
  onFooterChange: (config: DocFooterConfig) => void;
  customTable?: DocCustomTable | null;
  onTableChange?: (table: DocCustomTable | null) => void;
  onOpenSignatureModal?: () => void;
  onOpenTableModal?: () => void;
  documentTitle?: string;
  recipientInfoText?: string;
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fef08a", border: "#fde047" },
  { name: "Green", value: "#bbf7d0", border: "#86efac" },
  { name: "Cyan", value: "#a5f3fc", border: "#67e8f9" },
  { name: "Pink", value: "#fbcfe8", border: "#f472b6" },
  { name: "Orange", value: "#fed7aa", border: "#fdba74" },
  { name: "Lavender", value: "#e9d5ff", border: "#d8b4fe" },
];

const TEXT_COLORS = [
  { name: "Default (Charcoal)", value: "#1e293b" },
  { name: "Slate", value: "#475569" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Emerald", value: "#047857" },
  { name: "Crimson Red", value: "#dc2626" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Amber Brown", value: "#b45309" },
];

const FONT_FAMILIES = [
  { label: "Calibri", value: "Calibri, 'Segoe UI', Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Segoe UI", value: "'Segoe UI', Roboto, sans-serif" },
  { label: "Garamond", value: "Garamond, Baskerville, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = [
  { label: "10 pt", value: "13px" },
  { label: "11 pt", value: "14px" },
  { label: "12 pt", value: "16px" },
  { label: "14 pt", value: "18px" },
  { label: "16 pt", value: "21px" },
  { label: "18 pt", value: "24px" },
  { label: "24 pt", value: "32px" },
  { label: "30 pt", value: "40px" },
];

export function DocWordEditor({
  value,
  onChange,
  selectedEmployee,
  company,
  docAssets,
  letterhead,
  onLetterheadChange,
  footer,
  onFooterChange,
  customTable,
  onTableChange,
  onOpenSignatureModal,
  onOpenTableModal,
  documentTitle = "Document",
  recipientInfoText,
}: DocWordEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // View & formatting states
  const [activeFont, setActiveFont] = useState("Calibri, 'Segoe UI', Arial, sans-serif");
  const [activeFontSize, setActiveFontSize] = useState("14px");
  const [activeBlockType, setActiveBlockType] = useState("p");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [activeAlign, setActiveAlign] = useState<"left" | "center" | "right" | "justify">("left");
  
  // Editor mode: WYSIWYG vs Code HTML
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Modals for Letterhead & Footer Configuration
  const [letterheadModalOpen, setLetterheadModalOpen] = useState(false);
  const [footerModalOpen, setFooterModalOpen] = useState(false);

  // Sync incoming value to contentEditable div when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "<p><br></p>";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  // Handle editor input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html);
    updateActiveFormats();
  }, [onChange]);

  // Update active state of Bold/Italic/Underline/etc. based on selection
  const updateActiveFormats = useCallback(() => {
    try {
      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));
      setIsStrikethrough(document.queryCommandState("strikeThrough"));

      if (document.queryCommandState("justifyCenter")) setActiveAlign("center");
      else if (document.queryCommandState("justifyRight")) setActiveAlign("right");
      else if (document.queryCommandState("justifyFull")) setActiveAlign("justify");
      else setActiveAlign("left");
    } catch {
      // Ignore unsupported command states
    }
  }, []);

  // Format command wrapper
  const executeCommand = (command: string, cmdVal: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, cmdVal);
    handleInput();
  };

  // Format Block (headings, paragraph, quote)
  const handleBlockChange = (block: string) => {
    setActiveBlockType(block);
    if (block === "blockquote") {
      executeCommand("formatBlock", "<blockquote>");
    } else if (block === "h1") {
      executeCommand("formatBlock", "<h1>");
    } else if (block === "h2") {
      executeCommand("formatBlock", "<h2>");
    } else if (block === "h3") {
      executeCommand("formatBlock", "<h3>");
    } else {
      executeCommand("formatBlock", "<p>");
    }
  };

  // Font family change
  const handleFontFamilyChange = (font: string) => {
    setActiveFont(font);
    executeCommand("fontName", font);
  };

  // Font size change
  const handleFontSizeChange = (size: string) => {
    setActiveFontSize(size);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const span = document.createElement("span");
      span.style.fontSize = size;
      const range = selection.getRangeAt(0);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      handleInput();
    } else {
      executeCommand("fontSize", "3");
    }
  };

  // Highlight color application
  const applyHighlight = (color: string) => {
    if (color === "clear") {
      executeCommand("removeFormat");
    } else {
      try {
        if (!document.execCommand("hiliteColor", false, color)) {
          document.execCommand("backColor", false, color);
        }
      } catch {
        document.execCommand("backColor", false, color);
      }
      handleInput();
    }
  };

  // Font color application
  const applyTextColor = (color: string) => {
    executeCommand("foreColor", color);
  };

  // Robust HTML inserter that preserves insertion even when dropdown menu took focus
  const insertHtmlContent = (htmlString: string) => {
    if (viewMode === "code") {
      onChange((value || "") + "\n" + htmlString);
      return;
    }

    if (!editorRef.current) {
      onChange((value || "") + htmlString);
      return;
    }

    editorRef.current.focus();

    let inserted = false;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        try {
          range.deleteContents();
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlString;
          const frag = document.createDocumentFragment();
          let node: ChildNode | null;
          let lastNode: ChildNode | null = null;
          while ((node = tempDiv.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          inserted = true;
        } catch (e) {
          console.warn("Range insertion fallback:", e);
        }
      }
    }

    if (!inserted) {
      try {
        inserted = document.execCommand("insertHTML", false, htmlString);
      } catch {
        inserted = false;
      }
    }

    if (!inserted) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlString;
      while (tempDiv.firstChild) {
        editorRef.current.appendChild(tempDiv.firstChild);
      }
    }

    handleInput();
  };

  // Insert tag / dynamic variable
  const insertTag = (tag: string) => {
    insertHtmlContent(` <strong>${tag}</strong> `);
    toast.success(`Inserted ${tag}`);
  };

  // Insert Divider
  const insertDivider = () => {
    insertHtmlContent(`<hr style="border: 0; border-top: 1.5px solid #cbd5e1; margin: 20px 0;" />`);
    toast.success("Inserted Divider Line");
  };

  // Insert Callout Box
  const insertCallout = () => {
    insertHtmlContent(
      `<div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #166534;">
        <strong>Important Notice:</strong> Please review this section carefully before signing.
      </div>`
    );
    toast.success("Inserted Callout Box");
  };

  // Insert Current Date
  const insertCurrentDate = () => {
    const todayFormatted = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    insertHtmlContent(`<span>${todayFormatted}</span>`);
    toast.success(`Inserted Date: ${todayFormatted}`);
  };

  // Insert Employee Payslip / Salary Breakdown Box
  const insertPayslip = () => {
    const emp = selectedEmployee;
    let comp: any = null;

    if (emp) {
      try {
        comp = computePayroll({
          company: company || ({} as any),
          employee: emp,
          daysWorked: company?.workingDaysPerMonth || 26,
          otHours: 0,
          incentive: 0,
          shiftDays: 0,
          loan: 0,
          advance: 0,
          bonus: 0,
        });
      } catch (err) {
        console.warn("Could not compute live payroll, using fallback values:", err);
      }
    }

    // Build earnings list
    const earnings: { name: string; amount: number }[] = [];
    if (comp && Array.isArray(comp.earningsList) && comp.earningsList.length > 0) {
      comp.earningsList.forEach((e: { name: string; amount: number }) => {
        if (e.amount > 0) {
          earnings.push({ name: e.name, amount: e.amount });
        }
      });
    }
    if (earnings.length === 0) {
      const basicAmt = emp?.basic || (emp as any)?.salary || 25000;
      earnings.push(
        { name: "Basic + DA", amount: Math.round(basicAmt * 0.5) },
        { name: "House Rent Allowance (HRA)", amount: Math.round(basicAmt * 0.25) },
        { name: "Special Allowance", amount: Math.round(basicAmt * 0.15) },
        { name: "Conveyance Allowance", amount: Math.round(basicAmt * 0.1) }
      );
    }

    // Build deductions list
    const deductions: { name: string; amount: number }[] = [];
    if (comp && comp.deductions) {
      if (comp.deductions.employeePF > 0) {
        deductions.push({ name: "Provident Fund (EPF)", amount: comp.deductions.employeePF });
      }
      if (comp.deductions.employeeESI > 0) {
        deductions.push({ name: "ESI Contribution", amount: comp.deductions.employeeESI });
      }
      if (comp.deductions.professionalTax > 0) {
        deductions.push({ name: "Professional Tax (PT)", amount: comp.deductions.professionalTax });
      }
      if (comp.deductions.tds > 0) {
        deductions.push({ name: "TDS / Income Tax", amount: comp.deductions.tds });
      }
      if (comp.deductions.lwf > 0) {
        deductions.push({ name: "Labour Welfare Fund", amount: comp.deductions.lwf });
      }
      if (comp.extraDeductions && Array.isArray(comp.extraDeductions)) {
        comp.extraDeductions.forEach((d: { name: string; amount: number }) => {
          if (d.amount > 0) {
            deductions.push({ name: d.name, amount: d.amount });
          }
        });
      }
    }
    if (deductions.length === 0) {
      deductions.push(
        { name: "Provident Fund (EPF)", amount: 1800 },
        { name: "Professional Tax (PT)", amount: 200 },
        { name: "ESI Contribution", amount: 225 }
      );
    }

    const totalGross = comp?.gross ?? earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = comp?.totalDeductions ?? deductions.reduce((sum, item) => sum + item.amount, 0);
    const netTakeHome = comp?.net ?? Math.max(0, totalGross - totalDeductions);

    let words = "";
    try {
      words = numberToWordsIndian(netTakeHome);
    } catch {
      words = "";
    }

    const maxRows = Math.max(earnings.length, deductions.length);
    const rowsHtml: string[] = [];

    for (let i = 0; i < maxRows; i++) {
      const earn = earnings[i];
      const ded = deductions[i];
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      rowsHtml.push(`
        <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 12px; color: #334155; border-right: 1px solid #e2e8f0;">${earn ? earn.name : "—"}</td>
          <td style="padding: 7px 12px; text-align: right; font-weight: 500; color: #0f172a; border-right: 1.5px solid #cbd5e1;">${earn ? `₹${earn.amount.toLocaleString("en-IN")}` : "—"}</td>
          <td style="padding: 7px 12px; color: #334155; border-right: 1px solid #e2e8f0;">${ded ? ded.name : "—"}</td>
          <td style="padding: 7px 12px; text-align: right; font-weight: 500; color: #0f172a;">${ded ? `₹${ded.amount.toLocaleString("en-IN")}` : "—"}</td>
        </tr>
      `);
    }

    const empHeaderSubtitle = emp
      ? `${emp.name} (${emp.empCode || "EMP"}) • ${emp.designation || "Employee"}`
      : "Employee Salary Breakdown";

    const payslipHtml = `
      <div class="payslip-summary-box" style="margin: 20px 0; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-family: inherit; font-size: 12px; page-break-inside: avoid; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="background: #f1f5f9; padding: 10px 14px; border-bottom: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 12.5px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">Salary Structure &amp; Compensation</strong>
            <span style="font-size: 11px; color: #64748b; margin-left: 8px;">— ${empHeaderSubtitle}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 600; color: #475569; background: #e2e8f0; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">Monthly Pay</span>
            <button type="button" data-action="delete-payslip" class="delete-payslip-btn" title="Remove Payslip" style="cursor: pointer; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 4px; padding: 2px 6px; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; transition: all 0.15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #cbd5e1; color: #475569; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 12px; font-weight: 700; width: 35%; border-right: 1px solid #e2e8f0;">Earnings Component</th>
              <th style="padding: 8px 12px; text-align: right; font-weight: 700; width: 15%; border-right: 1.5px solid #cbd5e1;">Amount (₹)</th>
              <th style="padding: 8px 12px; font-weight: 700; width: 35%; border-right: 1px solid #e2e8f0;">Deductions Component</th>
              <th style="padding: 8px 12px; text-align: right; font-weight: 700; width: 15%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.join("")}
            <tr style="background-color: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1; border-bottom: 1.5px solid #cbd5e1;">
              <td style="padding: 8px 12px; color: #0f172a; border-right: 1px solid #e2e8f0;">Total Gross Earnings</td>
              <td style="padding: 8px 12px; text-align: right; color: #059669; border-right: 1.5px solid #cbd5e1;">₹${totalGross.toLocaleString("en-IN")}</td>
              <td style="padding: 8px 12px; color: #0f172a; border-right: 1px solid #e2e8f0;">Total Deductions</td>
              <td style="padding: 8px 12px; text-align: right; color: #dc2626;">₹${totalDeductions.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
        <div style="background: #f0fdf4; padding: 10px 14px; border-top: 1.5px solid #bbf7d0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Net Take Home Pay:</span>
            ${words ? `<span style="margin-left: 6px; font-size: 11px; color: #15803d; font-style: italic;">(${words})</span>` : ""}
          </div>
          <div style="text-align: right;">
            <span style="font-size: 15px; font-weight: 800; color: #15803d; font-family: monospace;">₹${netTakeHome.toLocaleString("en-IN")}</span>
            <span style="font-size: 10.5px; color: #166534; margin-left: 3px;">/ month</span>
          </div>
        </div>
      </div>
      <p><br/></p>
    `;

    insertHtmlContent(payslipHtml);
    toast.success(
      emp ? `Inserted Payslip table for ${emp.name}` : "Inserted Payslip table"
    );
  };

  // Handle clicks inside editor canvas (e.g. on payslip delete icon)
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest("[data-action='delete-payslip']");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const payslipBox = deleteBtn.closest(".payslip-summary-box, .payslip-box");
      if (payslipBox) {
        payslipBox.remove();
        handleInput();
        toast.success("Removed Payslip from document");
      }
    }
  };

  // Calculate statistics (word count, character count)
  const stats = React.useMemo(() => {
    const text = value ? value.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim() : "";
    const words = text ? text.split(" ").filter(Boolean).length : 0;
    const characters = text.length;
    return { words, characters };
  }, [value]);

  return (
    <div className="flex flex-col w-full rounded-2xl border border-border bg-card shadow-xs overflow-hidden select-none">
      {/* 1. MS WORD RIBBON TOP BAR */}
      <div className="bg-slate-900 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-100 tracking-tight">
                {documentTitle || "Digital Document Composer"}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10 font-normal">
                WYSIWYG Word Editor
              </Badge>
            </div>
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          {recipientInfoText && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono hidden md:flex mr-2">
              <Sparkles className="h-3 w-3 text-blue-400" />
              {recipientInfoText}
            </span>
          )}

          {/* Zoom Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-200 min-w-[42px] text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Toggle Code / Visual */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "visual" ? "code" : "visual")}
            className={`h-7 text-xs gap-1 text-slate-300 hover:text-white hover:bg-slate-800 ${
              viewMode === "code" ? "bg-slate-800 text-blue-400" : ""
            }`}
            title="Toggle HTML Source Code"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{viewMode === "visual" ? "Code" : "Visual"}</span>
          </Button>
        </div>
      </div>

      {/* 2. MS WORD FORMATTING RIBBON TOOLBAR */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-border p-2 flex flex-wrap items-center gap-1.5 text-xs text-foreground">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/80">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("undo")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("redo")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Font Family Selector */}
        <div className="pr-1.5 border-r border-border/80">
          <Select value={activeFont} onValueChange={handleFontFamilyChange}>
            <SelectTrigger className="h-7 text-xs w-[125px] bg-background border-border/70 font-sans">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.label} value={f.value} style={{ fontFamily: f.value }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size Selector */}
        <div className="pr-1.5 border-r border-border/80">
          <Select value={activeFontSize} onValueChange={handleFontSizeChange}>
            <SelectTrigger className="h-7 text-xs w-[75px] bg-background border-border/70 font-mono">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {FONT_SIZES.map((s) => (
                <SelectItem key={s.label} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Paragraph / Heading Style */}
        <div className="pr-1.5 border-r border-border/80">
          <Select value={activeBlockType} onValueChange={handleBlockChange}>
            <SelectTrigger className="h-7 text-xs w-[110px] bg-background border-border/70">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="p">Normal Text</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
              <SelectItem value="blockquote">Quote Block</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Text Style: Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/80 bg-background rounded-lg p-0.5 border border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("bold")}
            className={`h-7 w-7 rounded font-bold ${
              isBold ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-muted text-foreground"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("italic")}
            className={`h-7 w-7 rounded italic ${
              isItalic ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-muted text-foreground"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("underline")}
            className={`h-7 w-7 rounded underline ${
              isUnderline ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-muted text-foreground"
            }`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("strikeThrough")}
            className={`h-7 w-7 rounded line-through ${
              isStrikethrough ? "bg-primary/20 text-primary hover:bg-primary/30" : "hover:bg-muted text-foreground"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Highlighter & Font Color */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-border/80">
          {/* Highlight Color Marker Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 bg-background border-border/70 hover:bg-muted"
                title="Text Highlight Color"
              >
                <Highlighter className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-medium hidden sm:inline">Highlight</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-2 text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground pb-1">
                Highlight Marker Color
              </DropdownMenuLabel>
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => applyHighlight(c.value)}
                    className="flex items-center gap-1.5 p-1 rounded-md text-[11px] hover:scale-105 transition-transform"
                    style={{ backgroundColor: c.value, border: `1px solid ${c.border}` }}
                    title={c.name}
                  >
                    <span className="font-semibold text-slate-800 text-[10px] truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => applyHighlight("clear")} className="text-red-600 cursor-pointer text-xs">
                <Eraser className="h-3.5 w-3.5 mr-1.5" /> Remove Highlight
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text Color Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 bg-background border-border/70 hover:bg-muted"
                title="Font Text Color"
              >
                <Palette className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[11px] font-medium hidden sm:inline">Color</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-2 text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground pb-1">
                Font Color
              </DropdownMenuLabel>
              <div className="space-y-1 py-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => applyTextColor(c.value)}
                    className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-left text-xs transition-colors"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span style={{ color: c.value }} className="font-medium">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/80 bg-background rounded-lg p-0.5 border border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("justifyLeft")}
            className={`h-7 w-7 rounded ${activeAlign === "left" ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("justifyCenter")}
            className={`h-7 w-7 rounded ${activeAlign === "center" ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("justifyRight")}
            className={`h-7 w-7 rounded ${activeAlign === "right" ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("justifyFull")}
            className={`h-7 w-7 rounded ${activeAlign === "justify" ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
            title="Justify"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Lists & Indent */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/80">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("insertUnorderedList")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("insertOrderedList")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("outdent")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Decrease Indent"
          >
            <Outdent className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => executeCommand("indent")}
            className="h-7 w-7 rounded hover:bg-muted"
            title="Increase Indent"
          >
            <Indent className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Clear formatting */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => executeCommand("removeFormat")}
          className="h-7 w-7 rounded hover:bg-muted text-muted-foreground mr-1"
          title="Clear Formatting"
        >
          <Eraser className="h-3.5 w-3.5" />
        </Button>

        {/* Insert Options: Smart Variables, Table, Elements */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Insert Dynamic Field */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" /> Insert Field
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                Employee Dynamic Tags
              </DropdownMenuLabel>
              {DYNAMIC_FIELDS.filter((f) => f.category === "Employee").map((f) => (
                <DropdownMenuItem key={f.tag} onClick={() => insertTag(f.tag)}>
                  <span className="font-mono font-semibold text-primary mr-1.5">{f.tag}</span>
                  <span className="text-muted-foreground text-[11px] truncate">({f.label})</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                Company & Document Tags
              </DropdownMenuLabel>
              {DYNAMIC_FIELDS.filter((f) => f.category !== "Employee").map((f) => (
                <DropdownMenuItem key={f.tag} onClick={() => insertTag(f.tag)}>
                  <span className="font-mono font-semibold text-primary mr-1.5">{f.tag}</span>
                  <span className="text-muted-foreground text-[11px] truncate">({f.label})</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Insert Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold">
                <Plus className="h-3.5 w-3.5" /> Insert
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem onClick={insertPayslip}>
                <Receipt className="h-4 w-4 mr-2 text-emerald-600" /> Insert Payslip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenTableModal}>
                <TableIcon className="h-4 w-4 mr-2 text-indigo-500" /> Insert Annexure Table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertDivider}>
                <Layers className="h-4 w-4 mr-2 text-slate-500" /> Horizontal Divider Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSignatureModal}>
                <PenTool className="h-4 w-4 mr-2 text-emerald-500" /> Official Signature Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertCallout}>
                <AlertCircle className="h-4 w-4 mr-2 text-blue-500" /> Callout / Important Box
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertCurrentDate}>
                <Calendar className="h-4 w-4 mr-2 text-amber-500" /> Current Date Stamp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Letterhead Settings Quick Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLetterheadModalOpen(true)}
            className={`h-7 text-xs gap-1 font-medium ${
              letterhead.enabled
                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Letterhead {letterhead.enabled ? "✓" : ""}
          </Button>

          {/* Footer Settings Quick Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFooterModalOpen(true)}
            className={`h-7 text-xs gap-1 font-medium ${
              footer.enabled
                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Footer {footer.enabled ? "✓" : ""}
          </Button>
        </div>
      </div>

      {/* 3. MAIN A4 WORD DOCUMENT CANVAS CONTAINER */}
      <div className="p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/80 min-h-[600px] flex justify-center items-start overflow-x-auto">
        {viewMode === "code" ? (
          <div className="w-full max-w-[850px] bg-card rounded-xl border border-border p-4 space-y-2 animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">HTML Source Code Editor</span>
              <span>Edits in source reflect directly on the document</span>
            </div>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-h-[480px] p-4 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
            />
          </div>
        ) : (
          /* Realistic A4 Paper Sheet with Shadow */
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="w-full max-w-[800px] min-h-[950px] bg-white text-slate-900 shadow-2xl rounded-lg border border-slate-200/90 flex flex-col my-2 transition-shadow"
          >
            {/* A. LIVE LETTERHEAD ON CANVAS */}
            {letterhead.enabled ? (
              <div className="p-8 sm:p-10 pb-4 border-b border-slate-200 relative group">
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setLetterheadModalOpen(true)}
                    className="h-7 text-[11px] gap-1 shadow-sm bg-slate-100 text-slate-800 hover:bg-slate-200"
                  >
                    <Settings2 className="h-3 w-3" /> Edit Header
                  </Button>
                </div>

                {/* Style: Uploaded Official Letterhead from Settings */}
                {letterhead.style === "uploaded" && (
                  <div className="w-full">
                    {docAssets?.letterheadDataUrl || letterhead.customBannerUrl ? (
                      <img
                        src={docAssets?.letterheadDataUrl || letterhead.customBannerUrl}
                        alt="Official Company Letterhead"
                        className="w-full max-h-32 object-contain rounded"
                      />
                    ) : (
                      <div className="w-full py-4 px-3 border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl text-center space-y-1.5">
                        <p className="text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-amber-600" /> No Letterhead Uploaded in Settings
                        </p>
                        <p className="text-[11px] text-amber-700 max-w-md mx-auto">
                          Upload your official company letterhead in <b>Settings &gt; Document Assets</b>, or click "Edit Header" above to choose a built-in executive layout style.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Style: Modern Executive */}
                {letterhead.style === "modern" && (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {letterhead.showLogo !== false && (
                        docAssets?.logoDataUrl || company?.logoDataUrl ? (
                          <img
                            src={docAssets?.logoDataUrl || company?.logoDataUrl}
                            alt="Company Logo"
                            className="h-12 w-12 rounded-xl object-contain shadow-xs border border-slate-200 shrink-0 bg-white p-0.5"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black flex items-center justify-center text-lg shadow-xs shrink-0">
                            {letterhead.companyName ? letterhead.companyName.charAt(0) : "S"}
                          </div>
                        )
                      )}
                      <div>
                        <h2 className="text-base font-bold text-slate-950 tracking-tight leading-tight">
                          {letterhead.companyName || company?.name || "CreatonsHR Technologies Pvt. Ltd."}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {letterhead.tagline || "Enterprise Workforce & People Operations"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {letterhead.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 space-y-0.5 shrink-0">
                      <p className="font-semibold text-slate-700">{letterhead.email || company?.email || "hr@creatonshr.com"}</p>
                      <p>{letterhead.phone || company?.phone || "+91 44 2876 5400"}</p>
                      <p className="font-mono text-[9px] text-indigo-600 font-semibold">
                        CIN: {letterhead.cin || "U72200TN2026PTC109823"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Style: Classic Corporate (Centered) */}
                {letterhead.style === "classic" && (
                  <div className="text-center space-y-1">
                    {letterhead.showLogo !== false && (
                      docAssets?.logoDataUrl || company?.logoDataUrl ? (
                        <img
                          src={docAssets?.logoDataUrl || company?.logoDataUrl}
                          alt="Company Logo"
                          className="h-10 w-10 mx-auto rounded-lg object-contain shadow-xs mb-1.5 border border-slate-200 bg-white p-0.5"
                        />
                      ) : (
                        <div className="h-10 w-10 mx-auto rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs mb-1.5">
                          {letterhead.companyName ? letterhead.companyName.charAt(0) : "C"}
                        </div>
                      )
                    )}
                    <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
                      {letterhead.companyName || company?.name || "CREATONSHR TECHNOLOGIES PVT. LTD."}
                    </h2>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      {letterhead.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Email: {letterhead.email || company?.email || "hr@creatonshr.com"} | Web: {letterhead.website || "www.creatonshr.com"}
                    </p>
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <div className="h-px bg-slate-300 w-16" />
                      <span className="text-[9px] font-mono text-slate-400">
                        CIN: {letterhead.cin || "U72200TN2026PTC109823"}
                      </span>
                      <div className="h-px bg-slate-300 w-16" />
                    </div>
                  </div>
                )}

                {/* Style: Executive Banner */}
                {letterhead.style === "executive" && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white -m-8 sm:-m-10 -mb-4 p-6 sm:p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {docAssets?.logoDataUrl || company?.logoDataUrl ? (
                        <img
                          src={docAssets?.logoDataUrl || company?.logoDataUrl}
                          alt="Company Logo"
                          className="h-10 w-10 rounded-lg object-contain bg-white p-0.5 shadow-xs"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white text-indigo-900 font-black flex items-center justify-center text-base shadow-xs">
                          {letterhead.companyName ? letterhead.companyName.charAt(0) : "C"}
                        </div>
                      )}
                      <div>
                        <h2 className="text-base font-bold tracking-tight">
                          {letterhead.companyName || company?.name || "CreatonsHR"}
                        </h2>
                        <p className="text-[11px] text-indigo-200">
                          {letterhead.tagline || "Official Corporate Human Resources Document"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-300 font-mono">
                      <p>Ref: DOC-{new Date().getFullYear()}-OFFICIAL</p>
                      <p className="text-indigo-300 font-sans">{letterhead.website || "www.creatonshr.com"}</p>
                    </div>
                  </div>
                )}

                {/* Style: Minimalist Accent */}
                {letterhead.style === "minimal" && (
                  <div className="border-t-4 border-indigo-600 pt-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        {letterhead.companyName || company?.name || "CreatonsHR"}
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        {letterhead.address || company?.address || "Tower B, Silicon Heights, OMR, Chennai - 600096"}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                      {letterhead.email || company?.email || "hr@creatonshr.com"}
                    </span>
                  </div>
                )}

                {/* Style: Custom Image Banner */}
                {letterhead.style === "custom_banner" && (
                  <div className="w-full">
                    {letterhead.customBannerUrl ? (
                      <img
                        src={letterhead.customBannerUrl}
                        alt="Letterhead Banner"
                        className="w-full max-h-28 object-contain rounded"
                      />
                    ) : (
                      <div className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                        Custom Graphic Letterhead Banner (Click Edit Header to set image URL)
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* If Letterhead Disabled: Subtle Placeholder */
              <div className="px-8 pt-6 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    onLetterheadChange({ ...letterhead, enabled: true });
                    toast.success("Letterhead enabled!");
                  }}
                  className="w-full py-2.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-400 hover:text-indigo-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                >
                  <Building2 className="h-3.5 w-3.5" /> + Click to add Official Company Letterhead
                </button>
              </div>
            )}

            {/* B. MAIN EDITABLE CONTENT BODY */}
            <div className="p-8 sm:p-10 flex-1 flex flex-col">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                onClick={handleEditorClick}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                className="outline-hidden min-h-[380px] text-slate-800 text-xs leading-relaxed focus:ring-0 word-editor-content flex-1"
                style={{
                  fontFamily: activeFont,
                  fontSize: activeFontSize,
                }}
                data-placeholder="Click here and start typing your document content..."
              />

              {/* In-Canvas Custom Table Annexure (if enabled) */}
              {customTable && (
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <TableIcon className="h-3.5 w-3.5 text-indigo-600" />
                      {customTable.caption || "Document Annexure Table"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (onTableChange) {
                            const newRow = Array.from({ length: customTable.headers.length }, () => "—");
                            onTableChange({ ...customTable, rows: [...customTable.rows, newRow] });
                          }
                        }}
                        className="h-6 text-[11px] px-2 text-slate-600 hover:bg-slate-100"
                      >
                        + Add Row
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (onTableChange) {
                            const nextIdx = customTable.headers.length + 1;
                            onTableChange({
                              ...customTable,
                              headers: [...customTable.headers, `Column ${nextIdx}`],
                              rows: customTable.rows.map((r) => [...r, "—"]),
                            });
                          }
                        }}
                        className="h-6 text-[11px] px-2 text-slate-600 hover:bg-slate-100"
                      >
                        + Add Column
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onTableChange && onTableChange(null)}
                        className="h-6 text-[11px] px-2 text-red-600 hover:bg-red-50"
                        title="Remove Table"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        {customTable.headers.map((h, ci) => (
                          <th key={ci} className="border border-slate-300 p-2 text-left font-bold">
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => {
                                if (onTableChange) {
                                  const updated = [...customTable.headers];
                                  updated[ci] = e.target.value;
                                  onTableChange({ ...customTable, headers: updated });
                                }
                              }}
                              className="bg-transparent border-0 font-bold text-[11px] w-full focus:outline-hidden focus:bg-white rounded px-0.5"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customTable.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 1 ? "bg-slate-50/60" : ""}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="border border-slate-300 p-2">
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => {
                                  if (onTableChange) {
                                    const updatedRows = [...customTable.rows];
                                    updatedRows[ri][ci] = e.target.value;
                                    onTableChange({ ...customTable, rows: updatedRows });
                                  }
                                }}
                                className="bg-transparent border-0 text-[11px] w-full focus:outline-hidden focus:bg-white rounded px-0.5"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* C. LIVE FOOTER ON CANVAS */}
            {footer.enabled ? (
              <div className="p-6 sm:p-8 pt-4 border-t border-slate-200 mt-auto relative group text-[10px] text-slate-500">
                <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setFooterModalOpen(true)}
                    className="h-6 text-[10px] gap-1 shadow-xs bg-slate-100 text-slate-800 hover:bg-slate-200"
                  >
                    <Settings2 className="h-2.5 w-2.5" /> Edit Footer
                  </Button>
                </div>

                {/* Style: Uploaded Official Footer from Settings */}
                {footer.style === "uploaded" && (
                  <div className="w-full">
                    {docAssets?.footerDataUrl || footer.customBannerUrl ? (
                      <img
                        src={docAssets?.footerDataUrl || footer.customBannerUrl}
                        alt="Official Document Footer"
                        className="w-full max-h-24 object-contain rounded"
                      />
                    ) : (
                      <div className="w-full py-3 px-3 border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl text-center space-y-1">
                        <p className="text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> No Footer Graphic Uploaded in Settings
                        </p>
                        <p className="text-[10px] text-amber-700 max-w-md mx-auto">
                          Upload your official footer in <b>Settings &gt; Document Assets</b>, or click "Edit Footer" above to select a compliance text layout.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Style: Standard Compliance */}
                {footer.style === "standard" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700">
                        {footer.confidentialText || "STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT USE ONLY"}
                      </p>
                      {footer.showPageNumbers !== false && (
                        <span className="font-mono text-slate-500">Page 1 of 1</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[9px] pt-1 border-t border-slate-100">
                      <span>{footer.registeredOfficeText || `${company?.name || "CreatonsHR"} | Reg. Office: ${company?.address || "OMR, Chennai"}`}</span>
                      <span>Doc Ref: CREATONSHR-DIGITAL-AUTH</span>
                    </div>
                  </div>
                )}

                {/* Style: Digital Verification QR / Hash */}
                {footer.style === "verification" && (
                  <div className="flex items-center justify-between gap-4 p-2 rounded bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <QrCode className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-[10px]">
                          Digitally Verified Document · CreatonsHR
                        </p>
                        <p className="font-mono text-[9px] text-slate-500">
                          Auth Hash: 4f8a-9e12-d28c-771a · Timestamp: {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {footer.showPageNumbers !== false && (
                      <span className="font-mono text-slate-600 font-semibold shrink-0">Page 1 of 1</span>
                    )}
                  </div>
                )}

                {/* Style: Split Columns */}
                {footer.style === "split" && (
                  <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-500">
                    <div>
                      <p className="font-bold text-slate-700">{company?.name || "CreatonsHR"}</p>
                      <p>Corporate HR Compliance</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono">{footer.confidentialText || "Private & Confidential"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold text-slate-700">Page 1 of 1</p>
                    </div>
                  </div>
                )}

                {/* Style: Custom Text */}
                {footer.style === "custom" && (
                  <div className="flex items-center justify-between">
                    <p className="text-slate-600">
                      {footer.customText || "This document is electronically generated and authenticated per IT Act 2000."}
                    </p>
                    {footer.showPageNumbers !== false && (
                      <span className="font-mono text-slate-500 shrink-0">Page 1 of 1</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* If Footer Disabled: Subtle Placeholder */
              <div className="px-8 pb-6 pt-2 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    onFooterChange({ ...footer, enabled: true });
                    toast.success("Document footer enabled!");
                  }}
                  className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-400 hover:text-indigo-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> + Click to add Document Footer / Verification Disclaimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. MS WORD STATUS BAR (BOTTOM) */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-sans border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-400">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            Page 1 of 1
          </span>
          <span className="text-slate-400">
            <strong>{stats.words}</strong> words
          </span>
          <span className="text-slate-500 hidden sm:inline">
            <strong>{stats.characters}</strong> characters
          </span>
          <span className="text-slate-500 hidden md:inline">
            English (India)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Word Sync
          </span>
          <span className="text-slate-400 font-mono">
            {zoomLevel}%
          </span>
        </div>
      </div>

      {/* 5. LETTERHEAD CONFIGURATION MODAL */}
      <Dialog open={letterheadModalOpen} onOpenChange={setLetterheadModalOpen}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Configure Company Letterhead
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customize the header banner, company typography, registration codes, and layout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <Label className="text-xs font-semibold">Enable Letterhead on Document</Label>
                <p className="text-[11px] text-muted-foreground">Renders the company header banner at the top of pages</p>
              </div>
              <Switch
                checked={letterhead.enabled}
                onCheckedChange={(c) => onLetterheadChange({ ...letterhead, enabled: c })}
              />
            </div>

            {/* Style Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs">Header Style Layout</Label>
              <Select
                value={letterhead.style}
                onValueChange={(val: LetterheadStyle) => onLetterheadChange({ ...letterhead, style: val })}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="uploaded">⭐ Uploaded Letterhead (from Settings)</SelectItem>
                  <SelectItem value="modern">Modern Executive (Logo + Contact Stack)</SelectItem>
                  <SelectItem value="classic">Classic Corporate (Centered Formal)</SelectItem>
                  <SelectItem value="executive">Executive Dark Banner (Gradient Top Band)</SelectItem>
                  <SelectItem value="minimal">Minimalist Accent (Clean Border Top)</SelectItem>
                  <SelectItem value="custom_banner">Custom Banner Image (Direct URL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* When Uploaded Letterhead is chosen */}
            {letterhead.style === "uploaded" && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Uploaded Asset from Settings
                  </span>
                  {docAssets?.letterheadDataUrl ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Loaded & Ready</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Not Uploaded Yet</Badge>
                  )}
                </div>

                {docAssets?.letterheadDataUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-border overflow-hidden bg-white p-2">
                      <img
                        src={docAssets.letterheadDataUrl}
                        alt="Letterhead Preview"
                        className="w-full max-h-24 object-contain rounded"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      This official letterhead is automatically synced from <b>Settings &gt; Document Assets</b>.
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground space-y-2">
                    <p>
                      No letterhead image was found in Settings. You can upload one under <b>Settings &gt; Document Assets</b> or provide an image link below:
                    </p>
                    <Input
                      value={letterhead.customBannerUrl || ""}
                      onChange={(e) => onLetterheadChange({ ...letterhead, customBannerUrl: e.target.value })}
                      placeholder="https://... or data:image/png;base64,..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </div>
            )}

            {letterhead.style === "custom_banner" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Custom Banner Image URL / Data URI</Label>
                <Input
                  value={letterhead.customBannerUrl || ""}
                  onChange={(e) => onLetterheadChange({ ...letterhead, customBannerUrl: e.target.value })}
                  placeholder="https://... or data:image/png;base64,..."
                  className="h-8 text-xs"
                />
              </div>
            ) : letterhead.style !== "uploaded" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Company Name</Label>
                  <Input
                    value={letterhead.companyName || company?.name || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, companyName: e.target.value })}
                    placeholder="CreatonsHR Technologies Pvt. Ltd."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Tagline / Subtitle</Label>
                  <Input
                    value={letterhead.tagline || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, tagline: e.target.value })}
                    placeholder="Enterprise Workforce Solutions"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px]">Address</Label>
                  <Input
                    value={letterhead.address || company?.address || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, address: e.target.value })}
                    placeholder="Tower B, Silicon Heights, OMR, Chennai"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Email</Label>
                  <Input
                    value={letterhead.email || company?.email || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, email: e.target.value })}
                    placeholder="hr@creatonshr.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Phone</Label>
                  <Input
                    value={letterhead.phone || company?.phone || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, phone: e.target.value })}
                    placeholder="+91 44 2876 5400"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">CIN / Registration No.</Label>
                  <Input
                    value={letterhead.cin || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, cin: e.target.value })}
                    placeholder="U72200TN2026PTC109823"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Website</Label>
                  <Input
                    value={letterhead.website || ""}
                    onChange={(e) => onLetterheadChange({ ...letterhead, website: e.target.value })}
                    placeholder="www.creatonshr.com"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setLetterheadModalOpen(false)}>
              Apply Header
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. FOOTER CONFIGURATION MODAL */}
      <Dialog open={footerModalOpen} onOpenChange={setFooterModalOpen}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Configure Document Footer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure confidentiality notes, digital verification stamps, and page numbering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <Label className="text-xs font-semibold">Enable Document Footer</Label>
                <p className="text-[11px] text-muted-foreground">Renders confidentiality terms and page details at bottom</p>
              </div>
              <Switch
                checked={footer.enabled}
                onCheckedChange={(c) => onFooterChange({ ...footer, enabled: c })}
              />
            </div>

            {/* Footer Style Preset */}
            <div className="space-y-1.5">
              <Label className="text-xs">Footer Layout Style</Label>
              <Select
                value={footer.style}
                onValueChange={(val: FooterStyle) => onFooterChange({ ...footer, style: val })}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="uploaded">⭐ Uploaded Graphic Footer (from Settings)</SelectItem>
                  <SelectItem value="standard">Standard Compliance (Confidentiality + Page #)</SelectItem>
                  <SelectItem value="verification">Digital Verification (QR Badge + Auth Hash)</SelectItem>
                  <SelectItem value="split">Three-Column Formal (Address | Note | Page)</SelectItem>
                  <SelectItem value="custom">Custom Legal Disclaimer Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* When Uploaded Footer is chosen */}
            {footer.style === "uploaded" && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Uploaded Footer Asset from Settings
                  </span>
                  {docAssets?.footerDataUrl ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Loaded & Ready</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Not Uploaded Yet</Badge>
                  )}
                </div>

                {docAssets?.footerDataUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-border overflow-hidden bg-white p-2">
                      <img
                        src={docAssets.footerDataUrl}
                        alt="Footer Preview"
                        className="w-full max-h-20 object-contain rounded"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      This official footer banner is automatically synced from <b>Settings &gt; Document Assets</b>.
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground space-y-2">
                    <p>
                      No footer graphic was found in Settings. You can upload one under <b>Settings &gt; Document Assets</b> or provide a banner image URL below:
                    </p>
                    <Input
                      value={footer.customBannerUrl || ""}
                      onChange={(e) => onFooterChange({ ...footer, customBannerUrl: e.target.value })}
                      placeholder="https://... or data:image/png;base64,..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            {footer.style !== "uploaded" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Page Numbering ("Page 1 of 1")</Label>
                  <Switch
                    checked={footer.showPageNumbers !== false}
                    onCheckedChange={(c) => onFooterChange({ ...footer, showPageNumbers: c })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Confidentiality Notice Text</Label>
                  <Input
                    value={footer.confidentialText || ""}
                    onChange={(e) => onFooterChange({ ...footer, confidentialText: e.target.value })}
                    placeholder="STRICTLY CONFIDENTIAL • FOR AUTHORIZED RECIPIENT ONLY"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Registered Office / Entity Disclaimer</Label>
                  <Input
                    value={footer.registeredOfficeText || ""}
                    onChange={(e) => onFooterChange({ ...footer, registeredOfficeText: e.target.value })}
                    placeholder="CreatonsHR Technologies Pvt. Ltd. | Registered Office: Tower B, OMR, Chennai"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setFooterModalOpen(false)}>
              Apply Footer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


