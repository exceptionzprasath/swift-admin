import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company, Employee } from "./store";
import type { PayrollComputation } from "./payroll";
import { inr } from "./payroll";

function header(doc: jsPDF, c: Company, title: string) {
  doc.setFillColor(20, 160, 170);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SWIFT", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("People. Performance. Progress.", 14, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 200, 14, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(c.legalName, 200, 20, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function generateSalarySlipPDF(c: Company, e: Employee, month: string, p: PayrollComputation) {
  const doc = new jsPDF();
  header(doc, c, `Payslip · ${month}`);
  doc.setFontSize(9);
  doc.text(c.address, 14, 35);
  doc.text(`GSTIN: ${c.gstin}`, 14, 40);

  autoTable(doc, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 9 },
    head: [["Employee", "", "Details", ""]],
    body: [
      ["Name", e.name, "Emp Code", e.empCode],
      ["Designation", e.designation, "Department", e.department],
      ["DOJ", e.doj, "PAN", e.pan || "-"],
      ["Bank A/C", e.bankAcc || "-", "IFSC", e.bankIfsc || "-"],
    ],
    headStyles: { fillColor: [230, 245, 246] },
  });

  const y1 = (doc as any).lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: y1,
    theme: "grid",
    styles: { fontSize: 9 },
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: [
      ["Basic", inr(p.earnings.basic), "Employee PF", inr(p.deductions.employeePF)],
      ["HRA", inr(p.earnings.hra), "Employee ESI", inr(p.deductions.employeeESI)],
      ["Special Allowance", inr(p.earnings.special), "Professional Tax", inr(p.deductions.professionalTax)],
      ["Medical", inr(p.earnings.medical), "Loan", inr(p.deductions.loan)],
      ["Conveyance", inr(p.earnings.conveyance), "Advance", inr(p.deductions.advance)],
      ["Washing", inr(p.earnings.washing), "", ""],
      ["Other Allowance", inr(p.earnings.other), "", ""],
      ["Bonus", inr(p.earnings.bonus), "", ""],
      ["Incentive", inr(p.earnings.incentive), "", ""],
      ["Overtime", inr(p.earnings.overtime), "", ""],
      ["Shift Allowance", inr(p.earnings.shiftAllowance), "", ""],
      [
        { content: "Gross Earnings", styles: { fontStyle: "bold" } },
        { content: inr(p.gross), styles: { fontStyle: "bold" } },
        { content: "Total Deductions", styles: { fontStyle: "bold" } },
        { content: inr(p.totalDeductions), styles: { fontStyle: "bold" } },
      ],
    ],
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: y2,
    theme: "grid",
    styles: { fontSize: 10, fontStyle: "bold" },
    body: [
      ["Net Salary Payable", inr(p.net)],
      ["Employer Contribution (PF + ESI + Gratuity)", inr(p.totalEmployer)],
      ["Monthly CTC", inr(p.monthlyCTC)],
      ["Annual CTC", inr(p.annualCTC)],
    ],
    columnStyles: { 0: { cellWidth: 130 }, 1: { halign: "right" } },
  });

  const y3 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("This is a system-generated payslip and does not require a signature.", 14, y3);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, y3 + 4);

  doc.save(`Payslip_${e.empCode}_${month}.pdf`);
}

export function generateAppointmentPDF(c: Company, e: Employee, p: PayrollComputation) {
  const doc = new jsPDF();
  header(doc, c, "Appointment Letter");
  doc.setFontSize(9);
  doc.text(c.address, 14, 35);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 35, { align: "right" });

  const body = c.appointmentTemplate
    .replaceAll("{{name}}", e.name)
    .replaceAll("{{designation}}", e.designation)
    .replaceAll("{{department}}", e.department)
    .replaceAll("{{company}}", c.legalName)
    .replaceAll("{{doj}}", e.doj)
    .replaceAll("{{empCode}}", e.empCode)
    .replaceAll("{{ctc}}", inr(p.annualCTC))
    .replaceAll("{{gross}}", inr(p.gross));

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(body, 180);
  doc.text(lines, 14, 50);

  const yBreakup = 50 + lines.length * 6 + 6;
  autoTable(doc, {
    startY: yBreakup,
    theme: "striped",
    styles: { fontSize: 9 },
    head: [["Salary Component", "Monthly", "Annual"]],
    body: [
      ["Basic", inr(e.basic), inr(e.basic * 12)],
      ["HRA", inr(e.basic * (c.hraPct / 100)), inr(e.basic * (c.hraPct / 100) * 12)],
      ["Special", inr(e.basic * (c.specialPct / 100)), inr(e.basic * (c.specialPct / 100) * 12)],
      ["Medical", inr(e.basic * (c.medicalPct / 100)), inr(e.basic * (c.medicalPct / 100) * 12)],
      ["Conveyance", inr(e.basic * (c.conveyancePct / 100)), inr(e.basic * (c.conveyancePct / 100) * 12)],
      ["Washing", inr(e.basic * (c.washingPct / 100)), inr(e.basic * (c.washingPct / 100) * 12)],
      ["Other", inr(e.basic * (c.otherPct / 100)), inr(e.basic * (c.otherPct / 100) * 12)],
      [
        { content: "Gross", styles: { fontStyle: "bold" } },
        { content: inr(p.gross), styles: { fontStyle: "bold" } },
        { content: inr(p.gross * 12), styles: { fontStyle: "bold" } },
      ],
      ["Employer PF + ESI + Gratuity", inr(p.totalEmployer), inr(p.totalEmployer * 12)],
      [
        { content: "CTC", styles: { fontStyle: "bold" } },
        { content: inr(p.monthlyCTC), styles: { fontStyle: "bold" } },
        { content: inr(p.annualCTC), styles: { fontStyle: "bold" } },
      ],
    ],
    headStyles: { fillColor: [20, 160, 170], textColor: 255 },
  });

  const yEnd = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(10);
  doc.text("For " + c.legalName, 14, yEnd);
  doc.text("_____________________", 14, yEnd + 16);
  doc.text("Authorised Signatory", 14, yEnd + 21);

  doc.save(`Appointment_${e.empCode}.pdf`);
}
