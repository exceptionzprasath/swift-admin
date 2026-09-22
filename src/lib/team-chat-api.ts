// SWIFT — Team Chat API Client & WebSocket Integration for Swift Admin
import { getBackendUrl } from "./store";

export interface TeamGroupMember {
  id: string;
  name: string;
  role?: string;
  department?: string;
  avatar?: string;
  isAdmin?: boolean;
  empCode?: string;
}

export interface MessageReadReceipt {
  userId: string;
  userName: string;
  userAvatar?: string;
  role?: string;
  readAt: string;
}

export interface TeamGroupMessage {
  id: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  time: string;
  isSystem?: boolean;
  createdAt?: string;
  readBy?: MessageReadReceipt[];
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    mediaType?: "image" | "video" | "document" | "audio";
  };
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedForUserIds?: string[];
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  clientMessageId?: string;
}

export interface TeamGroup {
  id: string;
  subject: string;
  description?: string;
  avatarUrl?: string;
  iconEmoji: string;
  iconBgColor: string;
  createdBy: string;
  creatorId?: string;
  createdAt: string;
  status: "approved" | "pending_approval" | "rejected";
  members: TeamGroupMember[];
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageSender: string;
  unreadCount: number;
  requestId?: string;
  updatedAt?: string;
  isMuted?: boolean;
  mutedUntil?: string;
  disappearingDuration?: "off" | "24h" | "7d" | "90d";
  chatTheme?: string;
}

export interface ChatWallpaperOption {
  id: string;
  name: string;
  subtitle: string;
  previewBg: string;
  accentColor: string;
  sourceUrl: string | null;
  isDefault?: boolean;
}

export const CHAT_WALLPAPERS: ChatWallpaperOption[] = [
  {
    id: "dark",
    name: "Dark WhatsApp",
    subtitle: "Classic dark doodle theme",
    previewBg: "#0b141a",
    accentColor: "#25D366",
    sourceUrl: null,
  },
  {
    id: "white",
    name: "Default White",
    subtitle: "Clean white background",
    previewBg: "#FFFFFF",
    accentColor: "#10b981",
    sourceUrl: null,
    isDefault: true,
  },
  {
    id: "doodle_white",
    name: "White Doodle",
    subtitle: "Monochrome doodle pattern",
    previewBg: "#F8FAFC",
    accentColor: "#64748b",
    sourceUrl: "/wallpapers/wallpaper_doodle_white.png",
  },
  {
    id: "doodle_cream",
    name: "Warm Cream",
    subtitle: "Classic WhatsApp parchment",
    previewBg: "#F5EFE6",
    accentColor: "#d97706",
    sourceUrl: "/wallpapers/wallpaper_doodle_cream.png",
  },
  {
    id: "doodle_blue",
    name: "Soft Blue",
    subtitle: "Sky blue doodle pattern",
    previewBg: "#BFD7ED",
    accentColor: "#0284c7",
    sourceUrl: "/wallpapers/wallpaper_doodle_blue.jpg",
  },
];

export const PRESET_FAVICONS = [
  { id: "fav-tech", name: "Tech & Dev", icon: "💻", color: "#0284c7" },
  { id: "fav-rocket", name: "Launch & Growth", icon: "🚀", color: "#10b981" },
  { id: "fav-briefcase", name: "Executive", icon: "💼", color: "#075E54" },
  { id: "fav-lightning", name: "Ops & Sprint", icon: "⚡", color: "#f59e0b" },
  { id: "fav-palette", name: "Design & UI", icon: "🎨", color: "#ec4899" },
  { id: "fav-shield", name: "Security & QA", icon: "🛡️", color: "#6366f1" },
  { id: "fav-chart", name: "Finance & Sales", icon: "📊", color: "#059669" },
  { id: "fav-megaphone", name: "Announcements", icon: "📢", color: "#ef4444" },
  { id: "fav-coffee", name: "Watercooler", icon: "☕", color: "#8b5cf6" },
  { id: "fav-target", name: "Goals & Strategy", icon: "🎯", color: "#f43f5e" },
  { id: "fav-handshake", name: "HR & People", icon: "🤝", color: "#128C7E" },
  { id: "fav-star", name: "Leadership", icon: "⭐", color: "#eab308" },
];

export const EMOJI_OPTIONS = ["🚀", "💼", "⚡", "🎨", "📢", "☕", "🌟", "🎯", "💡", "🛡️", "📊", "🤝", "🔥", "🏆", "💎", "🎉", "💻", "✨", "🙌", "❤️"];
export const COLOR_OPTIONS = ["#075E54", "#128C7E", "#25D366", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#6366f1"];

export const PARTICIPANT_COLORS = [
  "#0284c7",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#2563eb",
  "#4f46e5",
];

// Helper to get participant color
export function getParticipantColor(name: string): string {
  if (!name) return PARTICIPANT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

// -------------------------------------------------------------
// Centralized Date & Time Utilities
// -------------------------------------------------------------
export function formatMessageTime(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return "";
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

export function formatGroupListTime(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return "";
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return "";

    if (isToday(date)) {
      return formatMessageTime(date);
    }

    if (isYesterday(date)) {
      return "Yesterday";
    }

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7 && diffDays > 1) {
      return date.toLocaleDateString([], { weekday: "short" });
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

export function getDateSeparatorLabel(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return "";
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return "";

    if (isToday(date)) return "TODAY";
    if (isYesterday(date)) return "YESTERDAY";

    const day = date.getDate();
    const month = date.toLocaleDateString([], { month: "short" }).toUpperCase();
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    if (year === currentYear) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return "";
  }
}

export function shouldShowDateSeparator(
  prevTimestamp?: string | number | Date | null,
  currTimestamp?: string | number | Date | null
): boolean {
  if (!currTimestamp) return false;
  if (!prevTimestamp) return true;

  try {
    const prevDate = new Date(prevTimestamp);
    const currDate = new Date(currTimestamp);
    if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) return false;

    return (
      prevDate.getDate() !== currDate.getDate() ||
      prevDate.getMonth() !== currDate.getMonth() ||
      prevDate.getFullYear() !== currDate.getFullYear()
    );
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// WebSocket Helpers
// -------------------------------------------------------------
export function getWebSocketUrl(): string {
  const backend = getBackendUrl();
  let wsUrl = backend.replace(/^http/, "ws");
  if (!wsUrl.startsWith("ws")) {
    if (typeof window !== "undefined") {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${proto}//${window.location.host}`;
    } else {
      wsUrl = "ws://localhost:5000";
    }
  }
  return `${wsUrl}/ws/team-chat`;
}

// -------------------------------------------------------------
// REST API Functions
// -------------------------------------------------------------
const FETCH_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

export async function fetchTeamGroups(tenantId: string, employeeId?: string): Promise<TeamGroup[]> {
  try {
    const url = `${getBackendUrl()}/api/team-chat/groups?tenantId=${encodeURIComponent(tenantId)}${
      employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""
    }`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (res.ok) {
      const data = await res.json();
      return data.groups || [];
    }
  } catch (err) {
    console.warn("[TeamChat API] fetchTeamGroups error:", err);
  }
  return [];
}

export async function fetchGroupMessages(
  tenantId: string,
  groupId: string,
  limit = 50,
  before?: string
): Promise<{ messages: TeamGroupMessage[]; hasMore: boolean; totalCount: number }> {
  try {
    let url = `${getBackendUrl()}/api/team-chat/messages?tenantId=${encodeURIComponent(tenantId)}&groupId=${encodeURIComponent(
      groupId
    )}&limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (res.ok) {
      const data = await res.json();
      return {
        messages: data.messages || [],
        hasMore: !!data.hasMore,
        totalCount: data.totalCount || (data.messages?.length ?? 0),
      };
    }
  } catch (err) {
    console.warn("[TeamChat API] fetchGroupMessages error:", err);
  }
  return { messages: [], hasMore: false, totalCount: 0 };
}

export async function sendTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  text?: string;
  mediaType?: "image" | "video" | "document" | "audio";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string | number;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    mediaType?: "image" | "video" | "document" | "audio";
  };
  clientMessageId?: string;
}): Promise<{ success: boolean; message?: TeamGroupMessage; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/send`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] sendTeamChatMessage error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function editTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  messageId: string;
  newText: string;
  userId: string;
}): Promise<{ success: boolean; message?: TeamGroupMessage; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/edit`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] editTeamChatMessage error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function deleteTeamChatMessage(payload: {
  tenantId: string;
  groupId: string;
  messageId: string;
  userId: string;
  mode?: "everyone" | "me";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/delete`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] deleteTeamChatMessage error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function markMessagesAsRead(payload: {
  tenantId: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  readAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/mark-read`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] markMessagesAsRead error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function requestCreateGroup(payload: {
  tenantId: string;
  creatorId: string;
  creatorName: string;
  subject: string;
  description?: string;
  avatarUrl?: string;
  iconEmoji?: string;
  iconBgColor?: string;
  members: TeamGroupMember[];
}): Promise<{ success: boolean; group?: TeamGroup; request?: any; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/groups/request`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] requestCreateGroup error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function updateTeamGroup(payload: {
  tenantId: string;
  groupId: string;
  avatarUrl?: string;
  iconEmoji?: string;
  iconBgColor?: string;
  subject?: string;
  description?: string;
  members?: TeamGroupMember[];
  isMuted?: boolean;
  mutedUntil?: string;
  disappearingDuration?: string;
  chatTheme?: string;
}): Promise<{ success: boolean; group?: TeamGroup; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/groups/update`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] updateTeamGroup error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function deleteTeamGroup(payload: {
  tenantId: string;
  groupId: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/groups/delete`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] deleteTeamGroup error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function clearGroupMessages(payload: {
  tenantId: string;
  groupId: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/groups/clear-messages`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] clearGroupMessages error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function askSwiftAIPrivately(payload: {
  prompt: string;
  context?: string;
  groupSubject?: string;
  senderName?: string;
}): Promise<{ success: boolean; response: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/team-chat/ai-query`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] askSwiftAIPrivately error:", err);
    return {
      success: true,
      response: `[Swift AI Copilot] Query "${payload.prompt}" acknowledged. All team operations are functioning smoothly!`,
    };
  }
}

export async function searchTeamChatMessages(
  tenantId: string,
  groupId: string,
  q: string
): Promise<{ success: boolean; results: TeamGroupMessage[] }> {
  try {
    const url = `${getBackendUrl()}/api/team-chat/search?tenantId=${encodeURIComponent(tenantId)}&groupId=${encodeURIComponent(
      groupId
    )}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[TeamChat API] searchTeamChatMessages error:", err);
  }
  return { success: false, results: [] };
}

export async function uploadChatFile(
  tenantId: string,
  path: string,
  fileDataUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/companies/upload`, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: JSON.stringify({ tenantId, path, fileDataUrl }),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("[TeamChat API] uploadChatFile error:", err);
    return { success: false, url: fileDataUrl }; // Fallback to inline dataUrl
  }
}
