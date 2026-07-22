import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Notice, type NoticePriority, type NoticeAudienceScope } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Plus, Pin, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { NoticeBoard } from "@/components/notice-board";

export const Route = createFileRoute("/admin/notices")({
  head: () => ({ meta: [{ title: "Notices · SWIFT" }] }),
  component: NoticesPage,
});

function NoticesPage() {
  const { notices, addNotice, deleteNotice, updateNotice, company, employees, currentUser } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<NoticePriority>("info");
  const [scope, setScope] = useState<NoticeAudienceScope>("company");
  const [values, setValues] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  const roles = Array.from(new Set(employees.map((e) => e.designation).filter(Boolean)));

  const reset = () => {
    setTitle(""); setBody(""); setPriority("info"); setScope("company"); setValues([]); setPinned(false); setExpiresAt("");
  };

  const submit = () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    if (scope !== "company" && values.length === 0) return toast.error("Pick at least one target");
    addNotice({
      title: title.trim(),
      body: body.trim(),
      priority,
      audience: { scope, values: scope === "company" ? [] : values },
      createdBy: currentUser?.name || "Admin",
      pinned,
      expiresAt: expiresAt || undefined,
    });
    toast.success("Notice published");
    setOpen(false); reset();
  };

  const toggleValue = (v: string) =>
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Notice Board
          </h1>
          <p className="text-sm text-muted-foreground">Publish notices to the entire company, a branch, a department, a role, or specific people.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gradient-brand text-white">
          <Plus className="h-4 w-4 mr-1" /> New notice
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-3">Published notices</h3>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices yet.</p>
          ) : (
            <div className="space-y-2">
              {notices.map((n) => (
                <NoticeAdminRow key={n.id} n={n} onDelete={() => deleteNotice(n.id)} onPin={() => updateNotice(n.id, { pinned: !n.pinned })} />
              ))}
            </div>
          )}
        </div>

        <NoticeBoard viewer={{ role: "admin" }} userKey={"admin:" + (currentUser?.name || "admin")} compact />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali holiday schedule" /></div>
            <div><Label>Body</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details, action items, dates…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expires (optional)</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={scope} onValueChange={(v) => { setScope(v as NoticeAudienceScope); setValues([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Entire company</SelectItem>
                  <SelectItem value="branch">Specific branch(es)</SelectItem>
                  <SelectItem value="department">Specific department(s)</SelectItem>
                  <SelectItem value="role">Specific role(s)</SelectItem>
                  <SelectItem value="employees">Specific employee(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope !== "company" && (
              <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2">Select target{scope === "employees" ? "s" : ""}</div>
                <div className="space-y-1.5">
                  {scope === "branch" && (company.branches ?? []).map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={values.includes(b.id)} onCheckedChange={() => toggleValue(b.id)} />
                      {b.name} <span className="text-xs text-muted-foreground">({b.code} · {b.city})</span>
                    </label>
                  ))}
                  {scope === "department" && departments.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={values.includes(d)} onCheckedChange={() => toggleValue(d)} /> {d}
                    </label>
                  ))}
                  {scope === "role" && roles.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={values.includes(r)} onCheckedChange={() => toggleValue(r)} /> {r}
                    </label>
                  ))}
                  {scope === "employees" && employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={values.includes(e.id)} onCheckedChange={() => toggleValue(e.id)} />
                      {e.name} <span className="text-xs text-muted-foreground">· {e.designation}</span>
                    </label>
                  ))}
                  {((scope === "branch" && (company.branches ?? []).length === 0)
                    || (scope === "department" && departments.length === 0)
                    || (scope === "role" && roles.length === 0)
                    || (scope === "employees" && employees.length === 0)) && (
                    <div className="text-xs text-muted-foreground">No options yet — configure them first.</div>
                  )}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={pinned} onCheckedChange={setPinned} /> Pin to top
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoticeAdminRow({ n, onDelete, onPin }: { n: Notice; onDelete: () => void; onPin: () => void }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {n.pinned && <Pin className="h-3 w-3 text-primary" />}
            <span className="font-medium text-sm truncate">{n.title}</span>
            <Badge variant="outline" className="text-[10px] uppercase">{n.priority}</Badge>
            <Badge variant="secondary" className="text-[10px]">{n.audience.scope}</Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.body}</p>
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
            <Eye className="h-3 w-3" /> {n.readBy.length} read · {new Date(n.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onPin} title={n.pinned ? "Unpin" : "Pin"}><Pin className={`h-3.5 w-3.5 ${n.pinned ? "text-primary" : ""}`} /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
      </div>
    </div>
  );
}
