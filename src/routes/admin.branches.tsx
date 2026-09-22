import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useStore, getEmployeeBranchIds, type Branch } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Users,
  LocateFixed,
  Wifi,
  Clock,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { INDIAN_STATES, STATE_CITIES, lookupPincode } from "@/lib/india-locations";

export const Route = createFileRoute("/admin/branches")({
  head: () => ({ meta: [{ title: "Branches · CreatonsHR" }] }),
  component: BranchesPage,
});

const empty: Omit<Branch, "id"> = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
  isHead: false,
  lat: undefined,
  lng: undefined,
  radiusMeters: 150,
  geofenceDisabled: false,
  wifiSSIDs: [],
  ipAllowlist: [],
  shiftStart: "09:00",
  shiftEnd: "18:00",
  weeklyOff: ["Sun"],
};

function BranchesPage() {
  const { company, employees, addBranch, updateBranch, deleteBranch, updateEmployee } = useStore();
  const branches = company.branches ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<Omit<Branch, "id">>(empty);
  const [tab, setTab] = useState("basic");
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setTab("basic");
    setOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    const { id: _id, ...rest } = b;
    void _id;
    setForm({
      ...empty,
      ...rest,
      pincode: rest.pincode ?? "",
      wifiSSIDs: rest.wifiSSIDs ?? [],
      ipAllowlist: rest.ipAllowlist ?? [],
      weeklyOff: rest.weeklyOff ?? [],
    });
    setTab("basic");
    setOpen(true);
  };

  const handlePincodeChange = async (pinValue: string) => {
    const cleanPin = pinValue.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await lookupPincode(cleanPin);
        if (res) {
          setForm((prev) => ({
            ...prev,
            pincode: cleanPin,
            city: res.city || prev.city,
            state: res.state || prev.state,
          }));
          toast.success(`Auto-detected ${res.city}, ${res.state} for PIN ${cleanPin}`);
        } else {
          toast.info(`PIN ${cleanPin} entered. You can select State and City below.`);
        }
      } catch (e) {
        console.error("Pincode lookup error:", e);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const triggerManualPincodeLookup = async () => {
    if (!form.pincode || form.pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit Pincode");
      return;
    }
    setPincodeLoading(true);
    try {
      const res = await lookupPincode(form.pincode);
      if (res) {
        setForm((prev) => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
        }));
        toast.success(`Auto-detected ${res.city}, ${res.state}!`);
      } else {
        toast.error("Unable to find location for this Pincode. Please select manually.");
      }
    } finally {
      setPincodeLoading(false);
    }
  };

  const submit = () => {
    if (!form.name.trim() || !form.code.trim()) return toast.error("Name and code required");

    const rawLat = form.lat;
    const rawLng = form.lng;
    const parsedLat = rawLat != null && String(rawLat).trim() !== "" ? parseFloat(String(rawLat)) : undefined;
    const parsedLng = rawLng != null && String(rawLng).trim() !== "" ? parseFloat(String(rawLng)) : undefined;

    const finalForm: Omit<Branch, "id"> = {
      ...form,
      lat: parsedLat != null && !isNaN(parsedLat) ? parsedLat : undefined,
      lng: parsedLng != null && !isNaN(parsedLng) ? parsedLng : undefined,
    };

    if (editing) {
      updateBranch(editing.id, finalForm);
      toast.success("Branch updated successfully");
    } else {
      addBranch(finalForm);
      toast.success("Branch created successfully");
    }
    setOpen(false);
  };

  const empCount = (id: string) => employees.filter((e) => getEmployeeBranchIds(e).includes(id)).length;

  const toggleEmployeeBranch = (empId: string, branchId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const currentBIds = getEmployeeBranchIds(emp);
    let nextBIds: string[];
    if (currentBIds.includes(branchId)) {
      nextBIds = currentBIds.filter((id) => id !== branchId);
    } else {
      nextBIds = [...currentBIds, branchId];
    }
    const nextPrimary =
      emp.branchId === branchId && !nextBIds.includes(branchId)
        ? nextBIds[0] || undefined
        : emp.branchId || nextBIds[0] || undefined;
    updateEmployee(empId, { branchIds: nextBIds, branchId: nextPrimary });
    toast.success(`Updated branch assignments for ${emp.name}`);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        setForm((prev) => ({ ...prev, lat, lng }));
        toast.success("Location captured");
      },
      (e) => toast.error(e.message || "Unable to fetch location"),
      { enableHighAccuracy: true },
    );
  };

  const updateToMyLocation = (b: Branch) => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        updateBranch(b.id, { ...b, lat, lng });
        toast.success(`Updated ${b.name} location to (${lat}, ${lng})`);
      },
      (e) => toast.error(e.message || "Unable to fetch location"),
      { enableHighAccuracy: true },
    );
  };

  const csvToArr = (s: string) =>
    s
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

  const availableCities = form.state ? STATE_CITIES[form.state] || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Multi-branch setup for {company.name} — geo-fence, shifts, Wi-Fi & IP restrictions per branch.
          </p>
        </div>
        <Button onClick={openNew} className="bg-gradient-brand text-white shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Add branch
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
            No branches yet — add your first location to assign employees and enable geo-fenced attendance.
          </div>
        )}
        {branches.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-5 space-y-2 hover:shadow-soft transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold flex items-center gap-2">
                  {b.name}
                  {b.isHead && <Badge className="bg-primary text-primary-foreground text-[10px]">HQ</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">Code {b.code}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Delete this branch?")) deleteBranch(b.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-start gap-1">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                {b.address ? `${b.address}, ` : ""}
                {b.city ? `${b.city}, ` : ""}
                {b.state || ""}
                {b.pincode ? ` - ${b.pincode}` : ""}
              </span>
            </div>
            {b.gstin && <div className="text-xs text-muted-foreground">GSTIN: {b.gstin}</div>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="outline" className="text-[10px]">
                <Users className="h-2.5 w-2.5 mr-0.5" />
                {empCount(b.id)} emp
              </Badge>
              {b.lat != null && b.lng != null && (
                <Badge variant="outline" className="text-[10px]">
                  <LocateFixed className="h-2.5 w-2.5 mr-0.5" />
                  {b.radiusMeters ?? 150}m geo
                </Badge>
              )}
              {(b.wifiSSIDs?.length ?? 0) > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  <Wifi className="h-2.5 w-2.5 mr-0.5" />
                  {b.wifiSSIDs!.length} SSID
                </Badge>
              )}
              {b.shiftStart && b.shiftEnd && (
                <Badge variant="outline" className="text-[10px]">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  {b.shiftStart}–{b.shiftEnd}
                </Badge>
              )}
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-border/50 text-xs">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateToMyLocation(b)}>
                <LocateFixed className="h-3 w-3 mr-1 text-primary" /> Set to My Location
              </Button>
              {b.geofenceDisabled && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Remote Mode
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {employees.length > 0 && branches.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold">Assign Employees to Multiple Branches</h3>
              <p className="text-xs text-muted-foreground">
                Click branch badges to toggle access. Employees can check-in & check-out at any assigned branch.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Dept</th>
                  <th className="p-2.5">Assigned Branches (Click to Toggle)</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const assignedBIds = getEmployeeBranchIds(e);
                  return (
                    <tr key={e.id} className="border-t border-border">
                      <td className="p-2.5 flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full ring-1 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0">
                          {e.photoDataUrl ? (
                            <img src={e.photoDataUrl} className="h-full w-full object-cover" alt="" />
                          ) : (
                            e.name
                              .split(" ")
                              .slice(0, 2)
                              .map((s) => s[0])
                              .join("")
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-xs">{e.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{e.empCode}</div>
                        </div>
                      </td>
                      <td className="p-2.5 text-xs text-muted-foreground">{e.department}</td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {branches.map((b) => {
                            const isAssigned = assignedBIds.includes(b.id);
                            const isPrimary = e.branchId === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => toggleEmployeeBranch(e.id, b.id)}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-medium ${
                                  isAssigned
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm hover:opacity-90"
                                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                                }`}
                                title={isAssigned ? `Assigned to ${b.name}. Click to remove.` : `Click to assign to ${b.name}.`}
                              >
                                <span>{b.code}</span>
                                {isAssigned && isPrimary && <span className="text-[9px] opacity-80">★</span>}
                                {isAssigned ? (
                                  <Check className="h-3 w-3 ml-0.5 opacity-90" />
                                ) : (
                                  <Plus className="h-3 w-3 ml-0.5 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimized Scrollable Modal that fits within screen & adapts to theme */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border border-primary/25 shadow-2xl bg-card/95 backdrop-blur-xl transition-colors">
          {/* Theme-Adaptive Gradient Header */}
          <div className="px-6 pt-5 pb-4 border-b border-primary/15 shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg sm:text-xl font-display font-bold flex items-center gap-3 text-foreground">
                  <div className="h-9 w-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center shrink-0 shadow-glow ring-2 ring-primary/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span>{editing ? "Edit Branch" : "New Branch Creation"}</span>
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold border-primary/30 text-primary bg-primary/10 px-2.5 py-0.5 rounded-full hidden sm:inline-flex"
                >
                  {tab === "basic" ? "Step 1 of 2 · Basic" : "Step 2 of 2 · Geo-Fence"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Configure location, automatic city/state by Pincode, and geo-fence parameters.
              </p>
            </DialogHeader>
          </div>

          {/* Animated Tab Switcher */}
          <div className="px-6 pt-3.5 shrink-0">
            <div className="grid grid-cols-2 p-1 bg-muted/80 dark:bg-muted/40 backdrop-blur-md rounded-2xl border border-border/80 relative">
              <button
                type="button"
                onClick={() => setTab("basic")}
                className={`relative z-10 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${
                  tab === "basic"
                    ? "text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "basic" && (
                  <motion.div
                    layoutId="branchTabHighlight"
                    className="absolute inset-0 bg-gradient-brand rounded-xl shadow-glow"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Building2 className="h-3.5 w-3.5 relative z-10" />
                <span className="relative z-10">Basic Info</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("geo")}
                className={`relative z-10 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${
                  tab === "geo"
                    ? "text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "geo" && (
                  <motion.div
                    layoutId="branchTabHighlight"
                    className="absolute inset-0 bg-gradient-brand rounded-xl shadow-glow"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <MapPin className="h-3.5 w-3.5 relative z-10" />
                <span className="relative z-10">Geo-Fence</span>
              </button>
            </div>
          </div>

          {/* Scrollable Form Content with Animated Transition */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <AnimatePresence mode="wait" initial={false}>
              {tab === "basic" ? (
                <motion.div
                  key="basic-tab"
                  initial={{ opacity: 0, x: -16, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Branch Name *</Label>
                      <Input
                        placeholder="e.g. Headquarters, Bangalore Tech Park"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Branch Code *</Label>
                      <Input
                        placeholder="e.g. BLR-01, CHE-HQ"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        className="h-9 text-xs uppercase focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  {/* Pincode with Auto-fill helper */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Pincode (Auto-fills City & State)
                      </Label>
                      {pincodeLoading && (
                        <span className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" /> Fetching location...
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 560001"
                          value={form.pincode || ""}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={triggerManualPincodeLookup}
                        disabled={pincodeLoading || !form.pincode || form.pincode.length !== 6}
                        className="h-9 text-xs px-3.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition"
                      >
                        {pincodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Auto-fill"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* State Dropdown */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">State / UT *</Label>
                      <Select
                        value={form.state || ""}
                        onValueChange={(val) => {
                          setForm((prev) => ({
                            ...prev,
                            state: val,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs focus:ring-2 focus:ring-primary/40">
                          <SelectValue placeholder="Select State / UT" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {INDIAN_STATES.map((st) => (
                            <SelectItem key={st} value={st} className="text-xs">
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City Dropdown & Datalist Custom Input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">City *</Label>
                      <div className="relative">
                        <Input
                          list="branch-cities-datalist"
                          placeholder={form.state ? `Select or type city in ${form.state}` : "Select or type city"}
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                        />
                        <datalist id="branch-cities-datalist">
                          {availableCities.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Street / Area Address</Label>
                    <Input
                      placeholder="e.g. Floor 4, Tower B, Electronic City Phase 1"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">GSTIN (optional)</Label>
                    <Input
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={form.gstin || ""}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                      className="h-9 text-xs uppercase focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer p-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <Checkbox
                      checked={!!form.isHead}
                      onCheckedChange={(checked) => setForm({ ...form, isHead: !!checked })}
                    />
                    <span>Mark as Head Office / Registered Principal Place of Business</span>
                  </label>
                </motion.div>
              ) : (
                <motion.div
                  key="geo-tab"
                  initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -16, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3.5 text-xs text-foreground/85 flex items-start gap-2.5 shadow-2xs">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Employees checking in with mobile GPS must be inside this radius. Use the button to auto-detect your coordinates or click anywhere on the map.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Latitude</Label>
                      <Input
                        type="text"
                        placeholder="e.g. 12.971598"
                        value={form.lat ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            lat: e.target.value ? parseFloat(e.target.value) || 0 : undefined,
                          }))
                        }
                        className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Longitude</Label>
                      <Input
                        type="text"
                        placeholder="e.g. 77.594566"
                        value={form.lng ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            lng: e.target.value ? parseFloat(e.target.value) || 0 : undefined,
                          }))
                        }
                        className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Radius (Meters)</Label>
                      <Input
                        type="number"
                        min={10}
                        max={5000}
                        value={form.radiusMeters ?? 150}
                        onChange={(e) => setForm((prev) => ({ ...prev, radiusMeters: +e.target.value || 0 }))}
                        className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={useMyLocation}
                      className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 rounded-xl"
                    >
                      <LocateFixed className="h-3.5 w-3.5 mr-1.5 text-primary" /> Use my current location
                    </Button>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <Checkbox
                      id="geofenceDisabled"
                      checked={!!form.geofenceDisabled}
                      onCheckedChange={(c) => setForm({ ...form, geofenceDisabled: !!c })}
                    />
                    <Label htmlFor="geofenceDisabled" className="text-xs font-medium cursor-pointer">
                      Disable Geofence Restriction (Allow Anywhere / Remote Check-in for this branch)
                    </Label>
                  </div>

                  {/* Google Map */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Interactive Boundary Map (Click or drag pin to position)</Label>
                    <div className="rounded-2xl border-2 border-primary/20 shadow-md overflow-hidden">
                      <BranchGoogleMap
                        lat={form.lat}
                        lng={form.lng}
                        radius={form.radiusMeters ?? 150}
                        onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Allowed Office Wi-Fi SSIDs (comma-separated)</Label>
                    <Input
                      value={(form.wifiSSIDs ?? []).join(", ")}
                      onChange={(e) => setForm({ ...form, wifiSSIDs: csvToArr(e.target.value) })}
                      placeholder="CORP-OFFICE, CORP-GUEST, BRANCH-WIFI"
                      className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Office Public IP Allowlist (comma-separated)</Label>
                    <Input
                      value={(form.ipAllowlist ?? []).join(", ")}
                      onChange={(e) => setForm({ ...form, ipAllowlist: csvToArr(e.target.value) })}
                      placeholder="103.25.14.0/24, 45.112.9.10"
                      className="h-9 text-xs focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme-Adaptive Footer */}
          <div className="px-6 py-4 border-t border-primary/15 bg-gradient-to-r from-muted/50 via-primary/5 to-muted/50 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {tab === "geo" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("basic")}
                  className="text-xs rounded-xl hover:bg-primary/10 hover:text-primary transition"
                >
                  ← Back to Basic
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("geo")}
                  className="text-xs rounded-xl hover:bg-primary/10 hover:text-primary transition"
                >
                  Next: Geo-Fence →
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={submit}
                size="sm"
                className="bg-gradient-brand text-white shadow-glow hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl px-5 font-semibold"
              >
                {editing ? "Save Changes" : "Create Branch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Google Maps script loader helper
let mapsScriptLoaded = false;
function loadGoogleMaps(apiKey: string, callback: () => void) {
  if (mapsScriptLoaded) {
    callback();
    return;
  }
  if (typeof window !== "undefined" && (window as any).google && (window as any).google.maps) {
    mapsScriptLoaded = true;
    callback();
    return;
  }
  const scriptId = "google-maps-api-script";
  let script = document.getElementById(scriptId) as HTMLScriptElement;
  if (!script) {
    script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  script.addEventListener("load", () => {
    mapsScriptLoaded = true;
    callback();
  });
}

interface BranchGoogleMapProps {
  lat: number | undefined;
  lng: number | undefined;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAs3nkKoCsndZiXeV6oh0PvRLL7FpMiZ4k";

function BranchGoogleMap({ lat, lng, radius, onChange }: BranchGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const circleInstance = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    loadGoogleMaps(GOOGLE_MAPS_API_KEY, () => {
      if (!mapRef.current) return;

      const defaultLat = lat ?? 12.9716;
      const defaultLng = lng ?? 77.5946;

      const maps = (window as any).google.maps;

      const mapOptions = {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: lat && lng ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      };

      const map = new maps.Map(mapRef.current, mapOptions);
      googleMapInstance.current = map;

      const marker = new maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map,
        draggable: true,
      });
      markerInstance.current = marker;

      const circle = new maps.Circle({
        map,
        center: { lat: defaultLat, lng: defaultLng },
        radius: radius,
        fillColor: "#22c55e",
        fillOpacity: 0.25,
        strokeColor: "#22c55e",
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });
      circleInstance.current = circle;

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = +pos.lat().toFixed(6);
          const newLng = +pos.lng().toFixed(6);
          onChangeRef.current(newLat, newLng);
        }
      });

      map.addListener("click", (e: any) => {
        const pos = e.latLng;
        if (pos) {
          marker.setPosition(pos);
          const newLat = +pos.lat().toFixed(6);
          const newLng = +pos.lng().toFixed(6);
          onChangeRef.current(newLat, newLng);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (googleMapInstance.current && markerInstance.current && circleInstance.current) {
      const numLat = lat != null && !isNaN(Number(lat)) ? Number(lat) : undefined;
      const numLng = lng != null && !isNaN(Number(lng)) ? Number(lng) : undefined;
      if (numLat != null && numLng != null) {
        const pos = { lat: numLat, lng: numLng };
        markerInstance.current.setPosition(pos);
        circleInstance.current.setCenter(pos);
        circleInstance.current.setRadius(radius);
        googleMapInstance.current.panTo(pos);
      }
    }
  }, [lat, lng, radius]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[240px] rounded-xl border border-border overflow-hidden shadow-inner"
    />
  );
}
