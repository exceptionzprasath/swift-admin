// Asset Management types & helpers.
export type AssetStatus = "available" | "assigned" | "repair" | "retired" | "lost";
export type AssetCondition = "new" | "good" | "fair" | "damaged";

export type AssetCategory = {
  id: string;
  name: string;      // Laptop, Phone, SIM, ID Card, Uniform, Vehicle, Access Card
  code: string;      // LAP, PHN, SIM, IDC ...
  icon?: string;     // lucide name (optional)
  requireReturn: boolean;
  requireAcknowledgement: boolean;
};

export type Asset = {
  id: string;
  categoryId: string;
  name: string;              // "MacBook Pro 14 M3"
  tag: string;               // "SW-LAP-0007" — unique
  serial?: string;
  brand?: string;
  model?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  vendor?: string;
  warrantyUntil?: string;
  branchId?: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes?: string;
  photoDataUrl?: string;
};

export type AssetAssignment = {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  assignedBy: string;
  returnedAt?: string;
  returnedBy?: string;
  conditionOnAssign: AssetCondition;
  conditionOnReturn?: AssetCondition;
  acknowledgementSignatureDataUrl?: string;
  notes?: string;
};

export const DEFAULT_ASSET_CATEGORIES: AssetCategory[] = [
  { id: "cat-lap", name: "Laptop",       code: "LAP", requireReturn: true,  requireAcknowledgement: true  },
  { id: "cat-phn", name: "Mobile Phone", code: "PHN", requireReturn: true,  requireAcknowledgement: true  },
  { id: "cat-sim", name: "SIM Card",     code: "SIM", requireReturn: true,  requireAcknowledgement: false },
  { id: "cat-idc", name: "ID Card",      code: "IDC", requireReturn: true,  requireAcknowledgement: false },
  { id: "cat-acc", name: "Access Card",  code: "ACC", requireReturn: true,  requireAcknowledgement: false },
  { id: "cat-uni", name: "Uniform",      code: "UNI", requireReturn: false, requireAcknowledgement: false },
  { id: "cat-veh", name: "Vehicle",      code: "VEH", requireReturn: true,  requireAcknowledgement: true  },
  { id: "cat-tool",name: "Tools / Kit",  code: "TLK", requireReturn: true,  requireAcknowledgement: true  },
];
