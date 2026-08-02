import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useStore, type Branch } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, Trash2, Pencil, MapPin, Users, LocateFixed, Wifi, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/branches")({
  head: () => ({ meta: [{ title: "Branches · SWIFT" }] }),
  component: BranchesPage,
});

const empty: Omit<Branch, "id"> = {
  name: "", code: "", address: "", city: "", state: "", gstin: "", isHead: false,
  lat: undefined, lng: undefined, radiusMeters: 150, geofenceDisabled: false,
  wifiSSIDs: [], ipAllowlist: [],
  shiftStart: "09:00", shiftEnd: "18:00", weeklyOff: ["Sun"],
};

function BranchesPage() {
  const { company, employees, addBranch, updateBranch, deleteBranch, updateEmployee } = useStore();
  const branches = company.branches ?? [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<Omit<Branch, "id">>(empty);
  const [tab, setTab] = useState("basic");

  const openNew = () => { setEditing(null); setForm(empty); setTab("basic"); setOpen(true); };
  const openEdit = (b: Branch) => {
    setEditing(b);
    const { id: _id, ...rest } = b; void _id;
    setForm({ ...empty, ...rest, wifiSSIDs: rest.wifiSSIDs ?? [], ipAllowlist: rest.ipAllowlist ?? [], weeklyOff: rest.weeklyOff ?? [] });
    setTab("basic");
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.code.trim()) return toast.error("Name and code required");

    const rawLat = form.lat;
    const rawLng = form.lng;
    const parsedLat = rawLat !== "" && rawLat != null ? parseFloat(String(rawLat)) : undefined;
    const parsedLng = rawLng !== "" && rawLng != null ? parseFloat(String(rawLng)) : undefined;

    const finalForm: Omit<Branch, "id"> = {
      ...form,
      lat: parsedLat != null && !isNaN(parsedLat) ? parsedLat : undefined,
      lng: parsedLng != null && !isNaN(parsedLng) ? parsedLng : undefined,
    };

    if (editing) { updateBranch(editing.id, finalForm); toast.success("Branch updated"); }
    else { addBranch(finalForm); toast.success("Branch added"); }
    setOpen(false);
  };

  const empCount = (id: string) => employees.filter((e) => e.branchId === id).length;

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
      { enableHighAccuracy: true }
    );
  };

  const csvToArr = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Branches
          </h1>
          <p className="text-sm text-muted-foreground">Multi-branch setup for {company.name} — geo-fence, shifts, Wi-Fi & IP restrictions per branch.</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-brand text-white">
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
                <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this branch?")) deleteBranch(b.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5" /> {b.address}, {b.city}, {b.state}</div>
            {b.gstin && <div className="text-xs">GSTIN: {b.gstin}</div>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="outline" className="text-[10px]"><Users className="h-2.5 w-2.5 mr-0.5" />{empCount(b.id)} emp</Badge>
              {b.lat != null && b.lng != null && (
                <Badge variant="outline" className="text-[10px]"><LocateFixed className="h-2.5 w-2.5 mr-0.5" />{b.radiusMeters ?? 150}m geo</Badge>
              )}
              {(b.wifiSSIDs?.length ?? 0) > 0 && <Badge variant="outline" className="text-[10px]"><Wifi className="h-2.5 w-2.5 mr-0.5" />{b.wifiSSIDs!.length} SSID</Badge>}
              {b.shiftStart && b.shiftEnd && <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-0.5" />{b.shiftStart}–{b.shiftEnd}</Badge>}
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-border/50 text-xs">
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateToMyLocation(b)}>
                <LocateFixed className="h-3 w-3 mr-1 text-primary" /> Set to My Location
              </Button>
              {b.geofenceDisabled && <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Remote Mode</Badge>}
            </div>
          </div>
        ))}
      </div>

      {employees.length > 0 && branches.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-3">Assign employees to branches</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr>
                <th className="p-2">Employee</th><th className="p-2">Dept</th><th className="p-2">Branch</th>
              </tr></thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-2 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full ring-1 ring-primary/25 overflow-hidden bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0">
                        {e.photoDataUrl ? <img src={e.photoDataUrl} className="h-full w-full object-cover" alt="" /> : e.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
                      </div>
                      {e.name} <span className="text-xs text-muted-foreground">· {e.empCode}</span>
                    </td>
                    <td className="p-2">{e.department}</td>
                    <td className="p-2">
                      <select
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        value={e.branchId || "__none"}
                        onChange={(ev) => updateEmployee(e.id, { branchId: ev.target.value === "__none" ? undefined : ev.target.value })}
                      >
                        <option value="__none">— unassigned —</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit branch" : "New branch"}</DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic"><Building2 className="h-3.5 w-3.5 mr-1" />Basic</TabsTrigger>
              <TabsTrigger value="geo"><MapPin className="h-3.5 w-3.5 mr-1" />Geo-fence</TabsTrigger>
              <TabsTrigger value="rules"><Shield className="h-3.5 w-3.5 mr-1" />Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid grid-cols-2 gap-3 pt-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="col-span-2"><Label>GSTIN (optional)</Label><Input value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.isHead} onChange={(e) => setForm({ ...form, isHead: e.target.checked })} />
                Mark as Head Office / Registered Office
              </label>
            </TabsContent>

            <TabsContent value="geo" className="space-y-3 pt-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Employees checking in must be inside this fence. Use the button to auto-fill from device location.
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Latitude</Label><Input type="text" placeholder="e.g. 11.305639" value={form.lat ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))} /></div>
                <div><Label>Longitude</Label><Input type="text" placeholder="e.g. 77.703474" value={form.lng ?? ""} onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))} /></div>
                <div><Label>Radius (m)</Label><Input type="number" value={form.radiusMeters ?? 150} onChange={(e) => setForm((prev) => ({ ...prev, radiusMeters: +e.target.value || 0 }))} /></div>
              </div>
              <Button variant="outline" size="sm" type="button" onClick={useMyLocation}>
                <LocateFixed className="h-3.5 w-3.5 mr-1.5" /> Use my current location
              </Button>
              <div className="flex items-center gap-2 py-2 border-y border-border/50">
                <Checkbox
                  id="geofenceDisabled"
                  checked={!!form.geofenceDisabled}
                  onCheckedChange={(c) => setForm({ ...form, geofenceDisabled: !!c })}
                />
                <Label htmlFor="geofenceDisabled" className="text-xs font-medium cursor-pointer">
                  Disable Geofence Restriction (Allow Remote / Anywhere Check-in for this branch)
                </Label>
              </div>
              <BranchGoogleMap
                lat={form.lat}
                lng={form.lng}
                radius={form.radiusMeters ?? 150}
                onChange={(lat, lng) => setForm((prev) => ({ ...prev, lat, lng }))}
              />
              <div>
                <Label>Allowed Wi-Fi SSIDs (comma-separated)</Label>
                <Input value={(form.wifiSSIDs ?? []).join(", ")} onChange={(e) => setForm({ ...form, wifiSSIDs: csvToArr(e.target.value) })} placeholder="SWIFT-OFFICE, SWIFT-GUEST" />
              </div>
              <div>
                <Label>IP Allowlist (comma-separated)</Label>
                <Input value={(form.ipAllowlist ?? []).join(", ")} onChange={(e) => setForm({ ...form, ipAllowlist: csvToArr(e.target.value) })} placeholder="103.25.14.0/24, 45.112.9.10" />
              </div>
            </TabsContent>
 
             <TabsContent value="rules" className="space-y-3 pt-4">
               <div className="grid grid-cols-2 gap-3">
                 <div><Label>Shift Start</Label><Input type="time" value={form.shiftStart || ""} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} /></div>
                 <div><Label>Shift End</Label><Input type="time" value={form.shiftEnd || ""} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} /></div>
               </div>
               <div>
                 <Label>Weekly Off</Label>
                 <div className="flex gap-1.5 flex-wrap mt-1.5">
                   {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => {
                     const on = form.weeklyOff?.includes(d);
                     return (
                       <button
                         key={d}
                         type="button"
                         onClick={() => setForm({ ...form, weeklyOff: on ? form.weeklyOff!.filter((x) => x !== d) : [...(form.weeklyOff ?? []), d] })}
                         className={`px-2.5 py-1 text-xs rounded-full border ${on ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border"}`}
                       >
                         {d}
                       </button>
                     );
                   })}
                 </div>
               </div>
             </TabsContent>
           </Tabs>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
             <Button onClick={submit} className="bg-gradient-brand text-white">{editing ? "Save" : "Add"}</Button>
           </DialogFooter>
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
      const numLat = lat != null && lat !== "" ? parseFloat(String(lat)) : undefined;
      const numLng = lng != null && lng !== "" ? parseFloat(String(lng)) : undefined;
      if (numLat != null && !isNaN(numLat) && numLng != null && !isNaN(numLng)) {
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
      className="w-full h-[260px] rounded-xl border border-border overflow-hidden mt-3 shadow-inner"
    />
  );
}
