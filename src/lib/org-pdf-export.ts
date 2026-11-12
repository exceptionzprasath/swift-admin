import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type { Employee, Branch } from "./store";

export type CompanyInfo = {
  name: string;
  legalName?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
};

export type HierarchyItem = {
  employee: Employee;
  depth: number;
  levelLabel: string;
  manager?: Employee;
  directs: Employee[];
  branchName: string;
  treePrefix: string;
};

/**
 * Computes hierarchy tree depths, managers, and directs for all active employees.
 */
export function buildHierarchyData(
  employees: Employee[],
  branches: Branch[],
  branchFilter: string = "__all"
): {
  filteredList: Employee[];
  hierarchyItems: HierarchyItem[];
  branchGroups: Map<string, HierarchyItem[]>;
  managerCount: number;
  topLevelCount: number;
} {
  const filteredList = employees.filter((e) =>
    branchFilter === "__all" ? true : (e.branchId || "__unassigned") === branchFilter
  );

  const byId = new Map(employees.map((e) => [e.id, e]));
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  // Children map for filtered list
  const childrenMap = new Map<string | undefined, Employee[]>();
  for (const emp of filteredList) {
    const mgrKey = emp.managerId && byId.has(emp.managerId) ? emp.managerId : undefined;
    if (!childrenMap.has(mgrKey)) childrenMap.set(mgrKey, []);
    childrenMap.get(mgrKey)!.push(emp);
  }

  // Sort children by direct report count, then alphabetically
  for (const [k, arr] of childrenMap) {
    arr.sort((a, b) => {
      const ac = childrenMap.get(a.id)?.length ?? 0;
      const bc = childrenMap.get(b.id)?.length ?? 0;
      if (ac !== bc) return bc - ac;
      return a.name.localeCompare(b.name);
    });
    childrenMap.set(k, arr);
  }

  // Recursively build tree items with depth and hierarchy ASCII prefix
  const hierarchyItems: HierarchyItem[] = [];
  const roots = childrenMap.get(undefined) ?? [];

  function getLevelLabel(depth: number): string {
    if (depth === 0) return "L0 · Executive / Top";
    if (depth === 1) return "L1 · Department Head";
    if (depth === 2) return "L2 · Team Lead";
    if (depth === 3) return "L3 · Senior";
    return `L${depth} · Associate`;
  }

  function traverse(emp: Employee, depth: number, prefix: string, isLast: boolean) {
    const directs = childrenMap.get(emp.id) ?? [];
    const mgr = emp.managerId ? byId.get(emp.managerId) : undefined;
    const branch = emp.branchId ? branchMap.get(emp.branchId) : undefined;
    const branchName = branch ? branch.name : (emp.branchId ? emp.branchId : "Unassigned");

    const currentConnector = depth === 0 ? "★ " : (isLast ? "└── " : "├── ");
    const treePrefix = depth === 0 ? "" : prefix + currentConnector;

    hierarchyItems.push({
      employee: emp,
      depth,
      levelLabel: getLevelLabel(depth),
      manager: mgr,
      directs,
      branchName,
      treePrefix,
    });

    const nextPrefix = depth === 0 ? "" : prefix + (isLast ? "    " : "│   ");
    directs.forEach((child, index) => {
      traverse(child, depth + 1, nextPrefix, index === directs.length - 1);
    });
  }

  roots.forEach((root, idx) => {
    traverse(root, 0, "", idx === roots.length - 1);
  });

  // Handle any employees orphaned due to cross-branch manager links
  const processedIds = new Set(hierarchyItems.map((h) => h.employee.id));
  filteredList.forEach((e) => {
    if (!processedIds.has(e.id)) {
      const mgr = e.managerId ? byId.get(e.managerId) : undefined;
      const branch = e.branchId ? branchMap.get(e.branchId) : undefined;
      hierarchyItems.push({
        employee: e,
        depth: 1,
        levelLabel: "L1 · Staff",
        manager: mgr,
        directs: childrenMap.get(e.id) ?? [],
        branchName: branch ? branch.name : "Unassigned",
        treePrefix: "├── ",
      });
    }
  });

  // Group by branch
  const branchGroups = new Map<string, HierarchyItem[]>();
  hierarchyItems.forEach((item) => {
    const key = item.employee.branchId || "__unassigned";
    if (!branchGroups.has(key)) branchGroups.set(key, []);
    branchGroups.get(key)!.push(item);
  });

  const managerCount = new Set(filteredList.map((e) => e.managerId).filter(Boolean) as string[]).size;
  const topLevelCount = roots.length;

  return {
    filteredList,
    hierarchyItems,
    branchGroups,
    managerCount,
    topLevelCount,
  };
}

/**
 * Standard Header for CreatonsHR PDF Reports
 */
function drawReportHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  company: CompanyInfo,
  stats: { total: number; managers: number; top: number; branch: string }
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark Navy Header Banner
  doc.setFillColor(30, 41, 59); // Slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const companyTitle = (company.legalName || company.name || "CREATONS HR").toUpperCase();
  doc.text(companyTitle, 14, 11);

  // Sub-header details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const orgSub = [
    company.gstin ? `GSTIN: ${company.gstin}` : "",
    company.address ? company.address.slice(0, 50) : "",
    `Generated: ${new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.text(orgSub, 14, 18);

  // Right-hand Badge
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.roundedRect(pageWidth - 72, 7, 58, 13, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CREATONS ORG SUITE", pageWidth - 68, 15.5);

  // Title
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 38);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 44);

  // Metrics Bar
  const startY = 48;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, startY, pageWidth - 28, 12, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const colWidth = (pageWidth - 28) / 4;
  doc.text(`Total Personnel: ${stats.total}`, 18, startY + 7.5);
  doc.text(`Reporting Managers: ${stats.managers}`, 18 + colWidth, startY + 7.5);
  doc.text(`Top-Level Executives: ${stats.top}`, 18 + colWidth * 2, startY + 7.5);
  doc.text(`Branch Scope: ${stats.branch}`, 18 + colWidth * 3, startY + 7.5);
}

/**
 * Standard Footer for CreatonsHR PDF Reports
 */
function drawReportFooter(doc: jsPDF, reportType: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CONFIDENTIAL · CreatonsHR Enterprise Workforce System · ${reportType}`,
      14,
      pageHeight - 5.5
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 32, pageHeight - 5.5);
  }
}

/**
 * Option 1: Download Organization Table Structure PDF
 */
export function downloadOrgTablePdf(options: {
  company: CompanyInfo;
  employees: Employee[];
  branches: Branch[];
  branchFilter: string;
}) {
  const { company, employees, branches, branchFilter } = options;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const activeBranch = branches.find((b) => b.id === branchFilter);
  const branchName = branchFilter === "__all" ? "All Branches (Global)" : activeBranch?.name || "Selected Branch";

  const { filteredList, hierarchyItems, managerCount, topLevelCount } = buildHierarchyData(
    employees,
    branches,
    branchFilter
  );

  drawReportHeader(
    doc,
    "Organization Hierarchy Matrix · Tabular Master Registry",
    "Complete organizational reporting lines, department allocations, and supervisory hierarchy.",
    company,
    {
      total: filteredList.length,
      managers: managerCount,
      top: topLevelCount,
      branch: branchName,
    }
  );

  // Generate Table Rows in logical hierarchy order
  const tableRows = hierarchyItems.map((item, idx) => {
    const emp = item.employee;
    const directCount = item.directs.length;
    const mgrInfo = item.manager ? `${item.manager.name} (${item.manager.empCode})` : "Top Level (No Manager)";
    const directInfo = directCount > 0 ? `${directCount} Direct Report${directCount > 1 ? "s" : ""}` : "None";

    return [
      idx + 1,
      item.levelLabel,
      emp.name,
      emp.empCode || "N/A",
      emp.designation || "Staff",
      emp.department || "General",
      item.branchName,
      mgrInfo,
      directInfo,
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [
      [
        "#",
        "Hierarchy Level",
        "Employee Name",
        "Code / PIN",
        "Designation",
        "Department",
        "Branch Location",
        "Reports To (Manager)",
        "Direct Reports",
      ],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28, fontStyle: "bold" },
      2: { cellWidth: 35, fontStyle: "bold" },
      3: { cellWidth: 20 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
      6: { cellWidth: 28 },
      7: { cellWidth: 46 },
      8: { cellWidth: 28, halign: "center" },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  drawReportFooter(doc, "Tabular Structure Audit");

  const cleanName = (company.name || "CreatonsHR").replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`${cleanName}_Organization_Table_${dateStr}.pdf`);
}

/**
 * Option 2: Download Organization Tree Structure PDF
 */
export async function downloadOrgTreePdf(options: {
  company: CompanyInfo;
  employees: Employee[];
  branches: Branch[];
  branchFilter: string;
  treeContainerElement?: HTMLElement | null;
}) {
  const { company, employees, branches, branchFilter, treeContainerElement } = options;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const activeBranch = branches.find((b) => b.id === branchFilter);
  const branchName = branchFilter === "__all" ? "All Branches (Global)" : activeBranch?.name || "Selected Branch";

  const { filteredList, hierarchyItems, managerCount, topLevelCount, branchGroups } = buildHierarchyData(
    employees,
    branches,
    branchFilter
  );

  drawReportHeader(
    doc,
    "Organization Reporting Tree · Visual Hierarchy Chart",
    "Complete organizational tree chart representing direct supervisory hierarchies and reporting structures.",
    company,
    {
      total: filteredList.length,
      managers: managerCount,
      top: topLevelCount,
      branch: branchName,
    }
  );

  let hasVisualCapture = false;

  // 1. Try high-resolution DOM tree capture if the visual interactive tree element is supplied and visible
  if (treeContainerElement) {
    try {
      const canvas = await html2canvas(treeContainerElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const availWidth = pageWidth - 28;
      const availHeight = pageHeight - 80;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(availWidth / imgWidth, availHeight / imgHeight);

      const renderWidth = imgWidth * ratio;
      const renderHeight = imgHeight * ratio;
      const renderX = 14 + (availWidth - renderWidth) / 2;
      const renderY = 66 + (availHeight - renderHeight) / 2;

      // Draw subtle background canvas border
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, 65, availWidth, availHeight, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(14, 65, availWidth, availHeight, 2, 2, "S");

      doc.addImage(imgData, "PNG", renderX, renderY, renderWidth, renderHeight, undefined, "FAST");
      hasVisualCapture = true;
    } catch (err) {
      console.warn("Visual tree capture skipped, generating structured tree map:", err);
    }
  }

  // 2. Add Detailed Structured Tree Hierarchy Pages
  // If we had a visual capture, start the detailed tree hierarchy on page 2.
  // If no visual capture was possible (e.g. user was in Table view), start directly on page 1.
  if (hasVisualCapture) {
    doc.addPage();
    drawReportHeader(
      doc,
      "Organization Reporting Tree · Node Breakdown & Connections",
      "Detailed supervisory chain and team sizes ordered hierarchically from executive roots to teams.",
      company,
      {
        total: filteredList.length,
        managers: managerCount,
        top: topLevelCount,
        branch: branchName,
      }
    );
  }

  // Build Hierarchical Tree Rows with tree graphical connectors
  const treeRows = hierarchyItems.map((item, idx) => {
    const emp = item.employee;
    const directCount = item.directs.length;
    const mgrInfo = item.manager ? `${item.manager.name} (${item.manager.empCode})` : "Top Level (None)";
    const directInfo = directCount > 0 ? `${directCount} direct report${directCount > 1 ? "s" : ""}` : "-";
    const treeDisplay = `${item.treePrefix}${emp.name}`;

    return [
      idx + 1,
      item.levelLabel,
      treeDisplay,
      emp.empCode || "N/A",
      emp.designation || "Staff",
      emp.department || "General",
      item.branchName,
      mgrInfo,
      directInfo,
    ];
  });

  const startY = hasVisualCapture ? 65 : 65;

  autoTable(doc, {
    startY,
    head: [
      [
        "#",
        "Level",
        "Organizational Hierarchy Tree Structure",
        "Code",
        "Designation",
        "Department",
        "Branch",
        "Supervisor / Reports To",
        "Directs",
      ],
    ],
    body: treeRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold" },
      2: { cellWidth: 62, fontStyle: "bold" },
      3: { cellWidth: 18 },
      4: { cellWidth: 32 },
      5: { cellWidth: 28 },
      6: { cellWidth: 26 },
      7: { cellWidth: 42 },
      8: { cellWidth: 22, halign: "center" },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  drawReportFooter(doc, "Tree Structure Hierarchy");

  const cleanName = (company.name || "CreatonsHR").replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`${cleanName}_Organization_Tree_${dateStr}.pdf`);
}

