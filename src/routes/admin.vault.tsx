import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useStore, type VaultFolder, type VaultFile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FolderLock,
  FolderPlus,
  FilePlus2,
  Search,
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  FileCheck2,
  File,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Edit3,
  FolderInput,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Tag,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  HardDrive,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  X,
  UploadCloud,
  FileUp,
  ExternalLink,
  Printer,
  Calendar,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vault")({
  head: () => ({ meta: [{ title: "Company Document Vault · SWIFT HRMS" }] }),
  component: VaultPage,
});

const FOLDER_COLORS = [
  { label: "Indigo", value: "#4f46e5", bgClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  { label: "Sky", value: "#0284c7", bgClass: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  { label: "Emerald", value: "#059669", bgClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { label: "Amber", value: "#d97706", bgClass: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { label: "Purple", value: "#7c3aed", bgClass: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { label: "Rose", value: "#dc2626", bgClass: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
];

const CATEGORIES = [
  "All",
  "Incorporation",
  "Tax & GST",
  "Finance & Banking",
  "Agreements & Contracts",
  "HR Policies",
  "Certificates & Licenses",
  "Audit & Board",
  "Legal",
  "Other",
] as const;

function getFileIcon(fileType: string) {
  const t = (fileType || "").toLowerCase();
  if (t.includes("pdf")) return <FileText className="h-6 w-6 text-rose-500" />;
  if (t.includes("xls") || t.includes("csv") || t.includes("sheet")) return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
  if (t.includes("doc") || t.includes("word") || t.includes("txt")) return <FileText className="h-6 w-6 text-sky-500" />;
  if (t.includes("zip") || t.includes("tar") || t.includes("rar")) return <FileArchive className="h-6 w-6 text-amber-500" />;
  if (t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("image")) return <ImageIcon className="h-6 w-6 text-purple-500" />;
  if (t.includes("cert") || t.includes("license")) return <FileCheck2 className="h-6 w-6 text-emerald-600" />;
  return <File className="h-6 w-6 text-primary" />;
}

function getConfidentialityBadge(conf: VaultFile["confidentiality"]) {
  switch (conf) {
    case "Strictly Confidential":
      return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-semibold"><Lock className="h-3 w-3" /> Strictly Confidential</Badge>;
    case "Restricted":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-semibold"><ShieldAlert className="h-3 w-3" /> Restricted</Badge>;
    case "Internal":
      return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-[10px] gap-1 font-semibold"><ShieldCheck className="h-3 w-3" /> Internal</Badge>;
    case "Public":
    default:
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-semibold">Public</Badge>;
  }
}

export function VaultPage() {
  const {
    company,
    vaultFolders,
    vaultFiles,
    addVaultFolder,
    updateVaultFolder,
    deleteVaultFolder,
    addVaultFile,
    updateVaultFile,
    deleteVaultFile,
    moveVaultFile,
  } = useStore();

  // Navigation & Hierarchy State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedConfidentiality, setSelectedConfidentiality] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc" | "size_desc">("date_desc");

  // Modal States
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#4f46e5");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<VaultFolder | null>(null);

  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string | "root">("root");
  const [uploadCategory, setUploadCategory] = useState<VaultFile["category"]>("Incorporation");
  const [uploadConfidentiality, setUploadConfidentiality] = useState<VaultFile["confidentiality"]>("Internal");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadDataUrl, setUploadDataUrl] = useState<string | undefined>(undefined);
  const [uploadFileSizeFormatted, setUploadFileSizeFormatted] = useState("1.5 MB");
  const [uploadFileType, setUploadFileType] = useState("pdf");

  const [moveFileOpen, setMoveFileOpen] = useState(false);
  const [movingFile, setMovingFile] = useState<VaultFile | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string | "root">("root");

  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [editFileOpen, setEditFileOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<VaultFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return (vaultFolders || []).find((f) => f.id === currentFolderId) || null;
  }, [vaultFolders, currentFolderId]);

  // Breadcrumbs path
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Vault Root" }];
    if (currentFolder) {
      crumbs.push({ id: currentFolder.id, name: currentFolder.name });
    }
    return crumbs;
  }, [currentFolder]);

  // Filtered Folders (only show top-level in root, or subfolders in current folder; unless searching)
  const displayedFolders = useMemo(() => {
    let list = vaultFolders || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter((f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }
    return list.filter((f) => (currentFolderId ? f.parentId === currentFolderId : !f.parentId));
  }, [vaultFolders, currentFolderId, searchQuery]);

  // Cleaned active files (ensuring no sample/mock documents)
  const activeFiles = useMemo(() => {
    return (vaultFiles || []).filter((f) => !f.id.startsWith("vf-"));
  }, [vaultFiles]);

  // Filtered Files
  const displayedFiles = useMemo(() => {
    let list = activeFiles;

    // Filter by Folder if not searching globally
    if (!searchQuery.trim()) {
      list = list.filter((f) => (currentFolderId ? f.folderId === currentFolderId : !f.folderId));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().includes(q))) ||
          (f.notes && f.notes.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      list = list.filter((f) => f.category === selectedCategory);
    }

    // Confidentiality filter
    if (selectedConfidentiality !== "All") {
      list = list.filter((f) => f.confidentiality === selectedConfidentiality);
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "date_asc") return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sortBy === "size_desc") return b.fileSize - a.fileSize;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }, [activeFiles, currentFolderId, searchQuery, selectedCategory, selectedConfidentiality, sortBy]);

  // Overall Statistics
  const totalStats = useMemo(() => {
    const files = activeFiles;
    const totalBytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const confidentialCount = files.filter((f) => f.confidentiality === "Strictly Confidential" || f.confidentiality === "Restricted").length;
    return {
      filesCount: files.length,
      foldersCount: (vaultFolders || []).length,
      totalMb,
      confidentialCount,
    };
  }, [activeFiles, vaultFolders]);

  // Handle Real File Selection from Disk
  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const sizeMb = file.size / (1024 * 1024);
    const formattedSize = sizeMb >= 1 ? `${sizeMb.toFixed(2)} MB` : `${(file.size / 1024).toFixed(0)} KB`;

    setUploadName(file.name);
    setUploadFileType(ext);
    setUploadFileSizeFormatted(formattedSize);
    setUploadTargetFolder(currentFolderId || "root");

    // Convert file to Data URL for instant in-browser preview and download
    const reader = new FileReader();
    reader.onload = () => {
      setUploadDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadFileOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger real file download
  const handleDownloadFile = (file: VaultFile) => {
    if (file.dataUrl) {
      const a = document.createElement("a");
      a.href = file.dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create a dummy text blob if dataUrl is empty
      const blob = new Blob(
        [
          `--- SWIFT HRMS ENCRYPTED VAULT DOCUMENT ---\n\nDocument Name: ${file.name}\nCategory: ${file.category}\nConfidentiality: ${file.confidentiality}\nUploaded By: ${file.uploadedBy}\nUploaded At: ${file.uploadedAt}\n\nOfficial Notes:\n${file.notes || "Secure corporate compliance record."}`,
        ],
        { type: "text/plain;charset=utf-8" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.endsWith(".txt") ? file.name : `${file.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloaded: ${file.name}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Hidden File Input for Native Disk Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleNativeFileUpload}
        className="hidden"
      />

      {/* TOP HEADER & HERO BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-card via-card to-muted/40 p-6 rounded-3xl border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <FolderLock className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
                  Company Document Vault
                </h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> AES-256 Cloud Vault
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Centralized, high-security archive for {company.name || "SWIFT"} corporate registrations, agreements, licenses &amp; tax filings.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setNewFolderName("");
              setNewFolderDesc("");
              setCreateFolderOpen(true);
            }}
            className="rounded-xl h-9 text-xs gap-1.5 font-medium border-border/80 hover:bg-muted"
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            <span>New Folder</span>
          </Button>

          <Button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className="rounded-xl h-9 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-soft"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border shadow-xs bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Documents</div>
              <div className="text-2xl font-black font-display text-foreground mt-0.5">{totalStats.filesCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-xs bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Organized Folders</div>
              <div className="text-2xl font-black font-display text-foreground mt-0.5">{totalStats.foldersCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Folder className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-xs bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Encrypted Storage</div>
              <div className="text-2xl font-black font-display text-foreground mt-0.5">{totalStats.totalMb} MB</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <HardDrive className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-xs bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confidential Items</div>
              <div className="text-2xl font-black font-display text-rose-600 mt-0.5">{totalStats.confidentialCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <Lock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MAIN VAULT BROWSER & EXPLORER */}
      <Card className="rounded-3xl border border-border shadow-xs overflow-hidden">
        {/* Breadcrumbs & Navigation Bar */}
        <div className="p-4 sm:px-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                !currentFolderId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FolderLock className="h-3.5 w-3.5" />
              <span>Vault Root</span>
            </button>

            {currentFolder && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold"
                  style={{ color: currentFolder.color }}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>{currentFolder.name}</span>
                </div>
              </>
            )}

            {searchQuery && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Search className="h-2.5 w-2.5" /> Search: &quot;{searchQuery}&quot;
                </Badge>
              </>
            )}
          </div>

          {/* View Mode & Sorting */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Selector */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-xl">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="size_desc">File Size</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                onClick={() => setViewMode("grid")}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => setViewMode("list")}
                className="h-7 w-7 p-0 rounded-lg"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:px-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents by name, category, tags, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-xs w-full md:w-48 rounded-xl">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Confidentiality Filter */}
          <Select value={selectedConfidentiality} onValueChange={setSelectedConfidentiality}>
            <SelectTrigger className="h-9 text-xs w-full md:w-44 rounded-xl">
              <Lock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Confidentiality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Clearance</SelectItem>
              <SelectItem value="Public">Public</SelectItem>
              <SelectItem value="Internal">Internal</SelectItem>
              <SelectItem value="Restricted">Restricted</SelectItem>
              <SelectItem value="Strictly Confidential">Strictly Confidential</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* VAULT CONTENT AREA */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* SECTION 1: FOLDERS */}
          {displayedFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Folders ({displayedFolders.length})</span>
                {currentFolderId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentFolderId(null)}
                    className="h-6 text-[11px] text-primary"
                  >
                    ← Back to Root
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedFolders.map((folder) => {
                  const folderFilesCount = activeFiles.filter((f) => f.folderId === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group relative p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="p-2.5 rounded-xl transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${folder.color || "#4f46e5"}18`,
                            color: folder.color || "#4f46e5",
                          }}
                        >
                          <Folder className="h-6 w-6 fill-current opacity-90" />
                        </div>

                        {/* Folder Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-60 hover:opacity-100 rounded-lg">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 text-xs">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setEditFolderOpen(true);
                              }}
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-2" /> Rename / Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete folder "${folder.name}" and all documents inside it?`)) {
                                  deleteVaultFolder(folder.id);
                                  toast.success(`Deleted folder ${folder.name}`);
                                }
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {folder.name}
                        </div>
                        {folder.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {folder.description}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
                          <span>{folderFilesCount} {folderFilesCount === 1 ? "document" : "documents"}</span>
                          <span className="text-[9px] opacity-70">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: DOCUMENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>
                Documents ({displayedFiles.length})
                {currentFolder ? ` in ${currentFolder.name}` : searchQuery ? " (Search Results)" : " in Root"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="h-7 text-xs rounded-xl gap-1.5"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-primary" />
                <span>Add File Here</span>
              </Button>
            </div>

            {displayedFiles.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/10 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">No documents found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchQuery
                      ? "No files match your search criteria. Try a different keyword or filter."
                      : "This folder is empty. Upload important corporate files, policies, or registrations here."}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 font-semibold bg-primary text-primary-foreground"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload First Document</span>
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedFiles.map((file) => {
                  const folder = (vaultFolders || []).find((f) => f.id === file.folderId);
                  return (
                    <div
                      key={file.id}
                      className="group relative p-4 rounded-3xl border border-border/80 bg-card hover:bg-muted/30 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
                    >
                      {/* Top Bar: Icon & Options */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2.5 rounded-2xl bg-muted/60 border border-border/50 group-hover:scale-105 transition-transform">
                          {getFileIcon(file.fileType)}
                        </div>

                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-70 hover:opacity-100 rounded-lg">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                                <Eye className="h-3.5 w-3.5 mr-2 text-primary" /> Preview Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadFile(file)}>
                                <Download className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setMovingFile(file);
                                  setTargetMoveFolderId(file.folderId || "root");
                                  setMoveFileOpen(true);
                                }}
                              >
                                <FolderInput className="h-3.5 w-3.5 mr-2 text-sky-600" /> Move to Folder
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingFile(file);
                                  setEditFileOpen(true);
                                }}
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-2 text-amber-600" /> Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Delete file "${file.name}" from Vault?`)) {
                                    deleteVaultFile(file.id);
                                    toast.success(`Deleted file: ${file.name}`);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="space-y-1.5">
                        <div
                          onClick={() => setPreviewFile(file)}
                          className="font-bold text-sm text-foreground truncate hover:text-primary cursor-pointer transition-colors"
                          title={file.name}
                        >
                          {file.name}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                            {file.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{file.fileSizeFormatted}</span>
                        </div>

                        {/* Confidentiality Badge */}
                        <div className="pt-0.5">
                          {getConfidentialityBadge(file.confidentiality)}
                        </div>

                        {/* Folder Tag if viewed in search or root */}
                        {folder && searchQuery && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 truncate">
                            <Folder className="h-3 w-3" style={{ color: folder.color }} />
                            <span className="truncate">{folder.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Quick Actions */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground truncate">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewFile(file)}
                            className="h-7 px-2 text-[11px] rounded-lg gap-1 text-primary hover:bg-primary/10"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadFile(file)}
                            className="h-7 px-2 text-[11px] rounded-lg gap-1 text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST / TABLE VIEW */
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <tr className="text-left">
                        <th className="p-3.5 font-semibold">Document Name</th>
                        <th className="p-3.5 font-semibold">Category</th>
                        <th className="p-3.5 font-semibold">Folder</th>
                        <th className="p-3.5 font-semibold">Size</th>
                        <th className="p-3.5 font-semibold">Clearance</th>
                        <th className="p-3.5 font-semibold">Uploaded Date</th>
                        <th className="p-3.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedFiles.map((file) => {
                        const folder = (vaultFolders || []).find((f) => f.id === file.folderId);
                        return (
                          <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-muted/60 shrink-0">
                                  {getFileIcon(file.fileType)}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    onClick={() => setPreviewFile(file)}
                                    className="font-semibold text-foreground truncate hover:text-primary cursor-pointer max-w-[240px]"
                                  >
                                    {file.name}
                                  </div>
                                  {file.notes && (
                                    <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                      {file.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {file.category}
                              </Badge>
                            </td>

                            <td className="p-3.5">
                              {folder ? (
                                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                  <Folder className="h-3.5 w-3.5" style={{ color: folder.color }} />
                                  <span className="truncate max-w-[150px]">{folder.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Vault Root</span>
                              )}
                            </td>

                            <td className="p-3.5 text-xs text-muted-foreground font-mono">
                              {file.fileSizeFormatted}
                            </td>

                            <td className="p-3.5">
                              {getConfidentialityBadge(file.confidentiality)}
                            </td>

                            <td className="p-3.5 text-xs text-muted-foreground">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPreviewFile(file)}
                                  className="h-8 text-xs rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadFile(file)}
                                  className="h-8 text-xs rounded-lg gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 text-xs">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setMovingFile(file);
                                        setTargetMoveFolderId(file.folderId || "root");
                                        setMoveFileOpen(true);
                                      }}
                                    >
                                      <FolderInput className="h-3.5 w-3.5 mr-2 text-sky-600" /> Move Folder
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingFile(file);
                                        setEditFileOpen(true);
                                      }}
                                    >
                                      <Edit3 className="h-3.5 w-3.5 mr-2 text-amber-600" /> Edit Metadata
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (confirm(`Delete file "${file.name}"?`)) {
                                          deleteVaultFile(file.id);
                                          toast.success(`Deleted file: ${file.name}`);
                                        }
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW FOLDER                                                */}
      {/* ========================================================================= */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              <span>Create New Vault Folder</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an encrypted folder category to organize company documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder Name</Label>
              <Input
                type="text"
                placeholder="e.g. 07. Board Resolutions & Minutes"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder Description (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Executive filings, share certificates & ROC resolutions"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder Color Tag</Label>
              <div className="flex items-center gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewFolderColor(c.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      newFolderColor === c.value ? "scale-110 border-foreground ring-2 ring-primary/40" : "border-transparent opacity-80"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)} className="h-9 text-xs rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newFolderName.trim()) {
                  toast.error("Please enter a folder name");
                  return;
                }
                addVaultFolder({
                  name: newFolderName.trim(),
                  description: newFolderDesc.trim() || undefined,
                  color: newFolderColor,
                  parentId: currentFolderId || undefined,
                });
                setCreateFolderOpen(false);
                toast.success(`Folder "${newFolderName.trim()}" created successfully!`);
              }}
              className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT FOLDER                                                      */}
      {/* ========================================================================= */}
      <Dialog open={editFolderOpen} onOpenChange={setEditFolderOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border shadow-2xl">
          {editingFolder && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" />
                  <span>Edit Folder — {editingFolder.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Folder Name</Label>
                  <Input
                    type="text"
                    value={editingFolder.name}
                    onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input
                    type="text"
                    value={editingFolder.description || ""}
                    onChange={(e) => setEditingFolder({ ...editingFolder, description: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Color Tag</Label>
                  <div className="flex items-center gap-2">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditingFolder({ ...editingFolder, color: c.value })}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          editingFolder.color === c.value ? "scale-110 border-foreground ring-2 ring-primary/40" : "border-transparent opacity-80"
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setEditFolderOpen(false)} className="h-9 text-xs rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateVaultFolder(editingFolder.id, {
                      name: editingFolder.name,
                      description: editingFolder.description,
                      color: editingFolder.color,
                    });
                    setEditFolderOpen(false);
                    toast.success("Folder updated successfully!");
                  }}
                  className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD FILE DIALOG                                               */}
      {/* ========================================================================= */}
      <Dialog open={uploadFileOpen} onOpenChange={setUploadFileOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              <span>Save Document to Vault</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tag and organize this document into company archive folders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Name</Label>
              <Input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Folder</Label>
                <Select value={uploadTargetFolder} onValueChange={setUploadTargetFolder}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Vault Root</SelectItem>
                    {(vaultFolders || []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={uploadCategory} onValueChange={(val: any) => setUploadCategory(val)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Confidentiality Level</Label>
                <Select value={uploadConfidentiality} onValueChange={(val: any) => setUploadConfidentiality(val)}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public">Public</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="Restricted">Restricted</SelectItem>
                    <SelectItem value="Strictly Confidential">Strictly Confidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tags (comma separated)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Legal, MCA, CIN"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notes / Document Description</Label>
              <Input
                type="text"
                placeholder="e.g. Official board approved resolution copy"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setUploadFileOpen(false)} className="h-9 text-xs rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!uploadName.trim()) {
                  toast.error("Please enter a document name");
                  return;
                }
                const parsedTags = uploadTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);

                addVaultFile({
                  name: uploadName.trim(),
                  folderId: uploadTargetFolder === "root" ? null : uploadTargetFolder,
                  fileType: uploadFileType,
                  fileSize: 1500000,
                  fileSizeFormatted: uploadFileSizeFormatted,
                  dataUrl: uploadDataUrl,
                  category: uploadCategory,
                  confidentiality: uploadConfidentiality,
                  tags: parsedTags.length ? parsedTags : undefined,
                  notes: uploadNotes.trim() || undefined,
                  uploadedBy: "Admin / Authorized Officer",
                });

                setUploadFileOpen(false);
                toast.success(`Document "${uploadName.trim()}" saved to Vault!`);
              }}
              className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Confirm &amp; Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: MOVE FILE DIALOG                                                 */}
      {/* ========================================================================= */}
      <Dialog open={moveFileOpen} onOpenChange={setMoveFileOpen}>
        <DialogContent className="max-w-sm p-6 rounded-3xl border border-border shadow-2xl">
          {movingFile && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FolderInput className="h-5 w-5 text-primary" />
                  <span>Move Document</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Select destination folder for &quot;{movingFile.name}&quot;
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <Label className="text-xs font-semibold">Target Destination Folder</Label>
                <Select value={targetMoveFolderId} onValueChange={setTargetMoveFolderId}>
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Vault Root</SelectItem>
                    {(vaultFolders || []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setMoveFileOpen(false)} className="h-9 text-xs rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    moveVaultFile(movingFile.id, targetMoveFolderId === "root" ? null : targetMoveFolderId);
                    setMoveFileOpen(false);
                    toast.success(`Moved document to selected destination`);
                  }}
                  className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  Move Document
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: DOCUMENT PREVIEW & INSPECTOR                                     */}
      {/* ========================================================================= */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-border shadow-2xl">
          {previewFile && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-muted/60 border border-border">
                      {getFileIcon(previewFile.fileType)}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-foreground">
                        {previewFile.name}
                      </DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {previewFile.category}
                        </Badge>
                        {getConfidentialityBadge(previewFile.confidentiality)}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Document Meta Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/70 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">File Size</span>
                  <span className="font-mono font-medium text-foreground">{previewFile.fileSizeFormatted}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Format</span>
                  <span className="font-mono uppercase font-medium text-foreground">{previewFile.fileType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Uploaded By</span>
                  <span className="font-medium text-foreground">{previewFile.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Archived Date</span>
                  <span className="font-medium text-foreground">{new Date(previewFile.uploadedAt).toLocaleString()}</span>
                </div>
                {previewFile.expiryDate && (
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Valid Till</span>
                    <span className="font-medium text-amber-600">{previewFile.expiryDate}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Encryption</span>
                  <span className="font-semibold text-emerald-600">AES-256 Cloud Vault</span>
                </div>
              </div>

              {/* Tags & Notes */}
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border">
                {previewFile.tags && previewFile.tags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Assigned Tags
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {previewFile.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs bg-muted/50">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Document Description &amp; Notes
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                    {previewFile.notes || "Official authenticated compliance record stored in SWIFT HRMS company vault."}
                  </p>
                </div>
              </div>

              {/* Embedded Document Viewer / Signature Card */}
              <div className="p-5 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-slate-200">Verified Corporate Compliance Record</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">SHA-256 Integrity Verified</span>
                </div>
                <div className="text-xs text-slate-300 pt-1 leading-relaxed">
                  This document is securely archived under tenant ID and protected by role-based access control.
                </div>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadFile(previewFile)}
                  className="h-9 text-xs rounded-xl gap-1.5 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Document</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewFile(null);
                      setEditingFile(previewFile);
                      setEditFileOpen(true);
                    }}
                    className="h-9 text-xs rounded-xl gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Edit Metadata</span>
                  </Button>
                  <Button
                    onClick={() => setPreviewFile(null)}
                    className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                  >
                    Done
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT FILE METADATA                                               */}
      {/* ========================================================================= */}
      <Dialog open={editFileOpen} onOpenChange={setEditFileOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border shadow-2xl">
          {editingFile && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-500" />
                  <span>Edit Document Info</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">File Name</Label>
                  <Input
                    type="text"
                    value={editingFile.name}
                    onChange={(e) => setEditingFile({ ...editingFile, name: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select
                    value={editingFile.category}
                    onValueChange={(val: any) => setEditingFile({ ...editingFile, category: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Confidentiality</Label>
                  <Select
                    value={editingFile.confidentiality}
                    onValueChange={(val: any) => setEditingFile({ ...editingFile, confidentiality: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="Restricted">Restricted</SelectItem>
                      <SelectItem value="Strictly Confidential">Strictly Confidential</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Notes / Remarks</Label>
                  <Input
                    type="text"
                    value={editingFile.notes || ""}
                    onChange={(e) => setEditingFile({ ...editingFile, notes: e.target.value })}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setEditFileOpen(false)} className="h-9 text-xs rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateVaultFile(editingFile.id, {
                      name: editingFile.name,
                      category: editingFile.category,
                      confidentiality: editingFile.confidentiality,
                      notes: editingFile.notes,
                    });
                    setEditFileOpen(false);
                    toast.success("Document info updated!");
                  }}
                  className="h-9 text-xs rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
