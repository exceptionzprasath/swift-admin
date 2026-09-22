import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, MoreVertical, Send, Paperclip, Smile, Image as ImageIcon,
  FileText, Check, CheckCheck, Clock, Reply, Edit3, Trash2, Info,
  Sparkles, ShieldCheck, Users, X, Download, ShieldAlert, ArrowLeft,
  ChevronRight, Lock, BellOff, Eye, Palette, CheckCircle2, AlertCircle,
  Play, Pause, Mic, MicOff, Volume2, Camera, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  type TeamGroup,
  type TeamGroupMessage,
  type TeamGroupMember,
  type ChatWallpaperOption,
  CHAT_WALLPAPERS,
  PRESET_FAVICONS,
  EMOJI_OPTIONS,
  COLOR_OPTIONS,
  getParticipantColor,
  formatMessageTime,
  formatGroupListTime,
  getDateSeparatorLabel,
  shouldShowDateSeparator,
  getWebSocketUrl,
  fetchTeamGroups,
  fetchGroupMessages,
  sendTeamChatMessage,
  editTeamChatMessage,
  deleteTeamChatMessage,
  markMessagesAsRead,
  requestCreateGroup,
  updateTeamGroup,
  deleteTeamGroup,
  clearGroupMessages,
  askSwiftAIPrivately,
  searchTeamChatMessages,
  uploadChatFile,
} from "@/lib/team-chat-api";

export const Route = createFileRoute("/admin/team-chat")({
  head: () => ({ meta: [{ title: "Team Chat · SWIFT Admin" }] }),
  component: AdminTeamChatPage,
});

// -------------------------------------------------------------
// Voice Message Audio Player Component (WhatsApp Style)
// -------------------------------------------------------------
function VoiceMessagePlayer({
  mediaUrl,
  durationText,
  isMe,
}: {
  mediaUrl?: string;
  durationText?: string;
  isMe: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    if (durationText) {
      const match = durationText.match(/(\d+):(\d+)/);
      if (match) {
        return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
    }
    return 6;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (mediaUrl && !mediaUrl.startsWith("https://swift-mock-audio")) {
      const audio = new Audio(mediaUrl);
      audioRef.current = audio;
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(Math.round(audio.duration));
        }
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [mediaUrl]);

  const togglePlay = () => {
    if (audioRef.current && mediaUrl && !mediaUrl.startsWith("https://swift-mock-audio")) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          startSimulatedPlay();
        });
      }
    } else {
      if (isPlaying) {
        clearInterval(intervalRef.current);
        setIsPlaying(false);
      } else {
        startSimulatedPlay();
      }
    }
  };

  const startSimulatedPlay = () => {
    setIsPlaying(true);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.5;
      });
    }, 500);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const displayTime = isPlaying
    ? `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, "0")}`
    : (durationText?.replace(/[()]/g, "") || `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, "0")}`);

  const bars = [4, 10, 16, 8, 14, 20, 12, 6, 18, 14, 8, 12, 16, 6, 10, 14, 8];

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl my-1 select-none min-w-[240px] max-w-[320px] transition-all shadow-xs ${
        isMe
          ? "bg-emerald-600/10 border border-emerald-600/20 text-emerald-950 dark:text-emerald-100"
          : "bg-muted/80 border border-border text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-sm ${
          isMe
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        }`}
        title={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-1 h-6 px-1">
          {bars.map((height, i) => {
            const barProgress = (i / bars.length) * 100;
            const isFilled = progressPercent >= barProgress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isFilled
                    ? isMe
                      ? "bg-emerald-600 dark:bg-emerald-400"
                      : "bg-primary"
                    : "bg-muted-foreground/30"
                } ${isPlaying ? "animate-pulse" : ""}`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <Mic className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Voice message
          </span>
          <span className="font-mono">{displayTime}</span>
        </div>
      </div>
    </div>
  );
}

function AdminTeamChatPage() {
  const { user, activeTenantId } = useAuth();
  const { company, employees } = useStore();
  const effectiveTenantId = activeTenantId || company?.id || "10300b23-e442-41f0-a3fa-383e5e5a18c3";

  // Current admin details (matching company employee if available)
  const matchingEmployee = useMemo(() => {
    return employees.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [employees, user?.email]);

  const adminId = matchingEmployee?.id || user?.id || "admin";
  const adminName = matchingEmployee?.name || (company?.name ? `${company.name} Admin` : "Admin");
  const adminRole = matchingEmployee?.designation || "Admin";

  // UI Navigation States
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending">("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [messages, setMessages] = useState<TeamGroupMessage[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Chat message input & state
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TeamGroupMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TeamGroupMessage | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice recording state in Admin
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const [selectedWallpaper, setSelectedWallpaper] = useState<ChatWallpaperOption>(CHAT_WALLPAPERS[3]); // warm cream doodle by default

  // In-Chat Search
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamGroupMessage[]>([]);

  // Modals & Panels
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [newGroupStep, setNewGroupStep] = useState<1 | 2>(1);
  const [newGroupSubject, setNewGroupSubject] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("🚀");
  const [newGroupColor, setNewGroupColor] = useState("#128C7E");
  const [newGroupSelectedMembers, setNewGroupSelectedMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Group Info / Management Drawer
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSelected, setAddMemberSelected] = useState<string[]>([]);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Message Info Modal
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState<TeamGroupMessage | null>(null);

  // Ask SWIFT AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContextMsg, setAiContextMsg] = useState<TeamGroupMessage | null>(null);

  // Lightbox for media preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Emoji popover
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Dedicated container-only scroll that never scrolls ancestor/page
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Lock outer window/body scroll while Team Chat is active
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (activeTab === "approved" && g.status !== "approved") return false;
      if (activeTab === "pending" && g.status !== "pending_approval") return false;
      if (!groupSearchQuery.trim()) return true;
      const q = groupSearchQuery.toLowerCase();
      const matchSubject = g.subject.toLowerCase().includes(q);
      const matchLastMsg = g.lastMessageText?.toLowerCase().includes(q);
      const matchMembers = g.members?.some((m) => m.name.toLowerCase().includes(q));
      return matchSubject || matchLastMsg || matchMembers;
    });
  }, [groups, activeTab, groupSearchQuery]);

  // Pending groups count
  const pendingCount = useMemo(() => {
    return groups.filter((g) => g.status === "pending_approval").length;
  }, [groups]);

  // -------------------------------------------------------------
  // Load Groups
  // -------------------------------------------------------------
  const loadGroupsList = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const list = await fetchTeamGroups(effectiveTenantId);
      if (Array.isArray(list)) {
        setGroups(list);
        if (!activeGroupId && list.length > 0) {
          const firstApproved = list.find((g) => g.status === "approved") || list[0];
          setActiveGroupId(firstApproved.id);
        }
      }
    } catch (err) {
      console.warn("[AdminTeamChat] Failed to load groups:", err);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [effectiveTenantId, activeGroupId]);

  useEffect(() => {
    loadGroupsList();
  }, [loadGroupsList]);

  // -------------------------------------------------------------
  // Background Auto-Sync Interval (every 6 seconds fallback)
  // -------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const list = await fetchTeamGroups(effectiveTenantId);
        if (Array.isArray(list) && list.length > 0) {
          setGroups((prev) => {
            return list.map((latestG) => {
              const old = prev.find((p) => p.id === latestG.id);
              return {
                ...latestG,
                unreadCount: old?.id === activeGroupId ? 0 : (old?.unreadCount ?? latestG.unreadCount),
              };
            });
          });
        }
        if (activeGroupId) {
          const res = await fetchGroupMessages(effectiveTenantId, activeGroupId, 100);
          if (res.messages && res.messages.length > 0) {
            setMessages((prev) => {
              if (res.messages.length !== prev.length || res.messages.some((m, idx) => m.id !== prev[idx]?.id)) {
                return res.messages;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // silent fail-soft
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [effectiveTenantId, activeGroupId]);

  // -------------------------------------------------------------
  // Load Messages for Active Group
  // -------------------------------------------------------------
  const loadMessagesForGroup = useCallback(async (groupId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetchGroupMessages(effectiveTenantId, groupId, 100);
      setMessages(res.messages || []);
      // Mark messages as read for admin
      await markMessagesAsRead({
        tenantId: effectiveTenantId,
        groupId,
        userId: adminId,
        userName: adminName,
        role: adminRole,
      });
      // Clear unread count locally for active group
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g))
      );
    } catch (err) {
      console.warn("[AdminTeamChat] Error loading messages:", err);
    } finally {
      setIsLoadingMessages(false);
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    }
  }, [effectiveTenantId, adminId, adminName, adminRole, scrollToBottom]);

  useEffect(() => {
    if (activeGroupId) {
      loadMessagesForGroup(activeGroupId);
    } else {
      setMessages([]);
    }
  }, [activeGroupId, loadMessagesForGroup]);

  // Handle WS incoming messages
  const handleWsMessage = useCallback((data: any) => {
    if (!data || !data.type) return;

    if (data.type === "new_message") {
      const msg: TeamGroupMessage = data.message;
      if (!msg) return;

      // Update and re-order group preview snippet in sidebar
      setGroups((prev) => {
        const target = prev.find((g) => g.id === msg.groupId);
        const others = prev.filter((g) => g.id !== msg.groupId);
        if (!target) return prev;
        const updated = {
          ...target,
          lastMessageText: msg.text || (msg.fileName ? `📎 ${msg.fileName}` : "Attachment"),
          lastMessageTime: msg.time || formatMessageTime(new Date()),
          lastMessageSender: msg.senderName,
          unreadCount: msg.groupId === activeGroupId ? 0 : (target.unreadCount || 0) + 1,
          updatedAt: msg.createdAt || new Date().toISOString(),
        };
        return [updated, ...others];
      });

      // Append to active chat if matching active group
      if (msg.groupId === activeGroupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId))) {
            return prev.map((m) => (m.id === msg.id || m.clientMessageId === msg.clientMessageId ? msg : m));
          }
          return [...prev, msg];
        });
        setTimeout(() => {
          scrollToBottom("smooth");
        }, 50);

        // Auto mark read if we are looking at this group
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "mark_read",
              tenantId: effectiveTenantId,
              groupId: activeGroupId,
              userId: adminId,
              userName: adminName,
              readAt: new Date().toISOString(),
            })
          );
        }
      }
    } else if (data.type === "user_typing") {
      const { groupId, userId, userName, isTyping } = data;
      if (groupId === activeGroupId && userId !== adminId) {
        setTypingUser(isTyping ? userName || "Someone" : null);
      }
    } else if (data.type === "message_edited") {
      const { groupId, messageId, newText } = data;
      if (groupId === activeGroupId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: newText, isEdited: true } : m))
        );
      }
    } else if (data.type === "message_deleted") {
      const { groupId, messageId } = data;
      if (groupId === activeGroupId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, text: "This message was deleted" }
              : m
          )
        );
      }
    } else if (data.type === "messages_read") {
      const { groupId, userId, userName, readAt } = data;
      if (groupId === activeGroupId) {
        setMessages((prev) =>
          prev.map((m) => {
            const existing = m.readBy || [];
            if (!existing.some((r) => r.userId === userId)) {
              return { ...m, readBy: [...existing, { userId, userName, readAt }] };
            }
            return m;
          })
        );
      }
    } else if (data.type === "group_updated") {
      const updatedGroup: TeamGroup = data.group;
      if (updatedGroup) {
        setGroups((prev) =>
          prev.map((g) => (g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g))
        );
      }
    } else if (data.type === "group_deleted") {
      const { groupId } = data;
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroupId === groupId) {
        setActiveGroupId(null);
      }
    } else if (data.type === "group_cleared") {
      const { groupId } = data;
      if (groupId === activeGroupId) {
        setMessages([]);
      }
    }
  }, [activeGroupId, effectiveTenantId, adminId, adminName]);

  // -------------------------------------------------------------
  // Continuous WebSocket Connection (does not drop on group switch)
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const wsUrl = getWebSocketUrl();
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          // Register admin presence
          ws?.send(
            JSON.stringify({
              type: "register",
              tenantId: effectiveTenantId,
              employeeId: adminId,
              name: adminName,
              role: "Admin",
              isAdmin: true,
            })
          );
          if (activeGroupId) {
            ws?.send(
              JSON.stringify({
                type: "join",
                tenantId: effectiveTenantId,
                employeeId: adminId,
                groupId: activeGroupId,
                isAdmin: true,
                role: "Admin",
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWsMessage(data);
          } catch (e) {
            console.warn("[WS Parse Error]", e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn("[WS Error]", err);
          ws?.close();
        };
      } catch (err) {
        console.warn("[WS Connection Error]", err);
        reconnectTimeout = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [effectiveTenantId, adminId, adminName, handleWsMessage]);

  // Inform WS of active room switch seamlessly
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeGroupId) {
      wsRef.current.send(
        JSON.stringify({
          type: "join",
          tenantId: effectiveTenantId,
          employeeId: adminId,
          groupId: activeGroupId,
          isAdmin: true,
          role: "Admin",
        })
      );
    }
  }, [activeGroupId, effectiveTenantId, adminId]);

  // -------------------------------------------------------------
  // Send Message (Dual WS + REST with Live Push Notification)
  // -------------------------------------------------------------
  const handleSendMessage = async () => {
    if (!activeGroupId || (!messageText.trim() && !isUploading) || isSending) return;

    const trimmed = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    const timeNow = formatMessageTime(new Date());

    // Stop typing indicator
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing_stop",
          groupId: activeGroupId,
          userId: adminId,
          userName: adminName,
        })
      );
    }

    if (editingMessage) {
      // Edit mode
      const targetId = editingMessage.id;
      setEditingMessage(null);
      setMessageText("");
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, text: trimmed, isEdited: true } : m))
      );
      await editTeamChatMessage({
        tenantId: effectiveTenantId,
        groupId: activeGroupId,
        messageId: targetId,
        newText: trimmed,
        userId: adminId,
      });
      return;
    }

    // Optimistic message
    const optimisticMsg: TeamGroupMessage = {
      id: tempId,
      clientMessageId: tempId,
      groupId: activeGroupId,
      senderId: adminId,
      senderName: adminName,
      senderRole: adminRole,
      text: trimmed,
      time: timeNow,
      createdAt: new Date().toISOString(),
      status: "sending",
      ...(replyingTo
        ? {
            replyTo: {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.text,
              mediaType: replyingTo.mediaType,
            },
          }
        : {}),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setReplyingTo(null);
    setIsSending(true);

    setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);

    // Fast-path: Send via open WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "send_message",
          id: tempId,
          tenantId: effectiveTenantId,
          groupId: activeGroupId,
          senderId: adminId,
          senderName: adminName,
          text: trimmed,
          time: timeNow,
        })
      );
    }

    try {
      const res = await sendTeamChatMessage({
        tenantId: effectiveTenantId,
        groupId: activeGroupId,
        senderId: adminId,
        senderName: adminName,
        senderRole: adminRole,
        text: trimmed,
        replyTo: optimisticMsg.replyTo,
        clientMessageId: tempId,
      });

      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.message!, status: "sent" } : m))
        );
      }
    } catch (err) {
      console.warn("[AdminTeamChat] Failed to send message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  // -------------------------------------------------------------
  // Voice Recording Handlers (Web Audio API)
  // -------------------------------------------------------------
  const startVoiceRecording = async () => {
    if (!activeGroupId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Could not access microphone:", err);
      alert("Microphone permission is required to record voice notes.");
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const finishAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !activeGroupId) return;

    clearInterval(recordingTimerRef.current);
    const durationSecs = recordingDuration;
    setIsRecordingVoice(false);
    setRecordingDuration(0);

    const minutes = Math.floor(durationSecs / 60);
    const seconds = durationSecs % 60;
    const durationFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const fileName = `voice_${Date.now()}.webm`;
        const s3Path = `team_chat/${activeGroupId}/${Date.now()}_${fileName}`;

        let mediaUrl = base64;
        try {
          const upRes = await uploadChatFile(effectiveTenantId, s3Path, base64);
          if (upRes && upRes.url) {
            mediaUrl = upRes.url;
          }
        } catch (e) {
          console.warn("Audio upload fallback to data url:", e);
        }

        const effectiveText = `🎤 Voice message (${durationFormatted})`;
        const tempId = `temp-${Date.now()}`;
        const timeNow = formatMessageTime(new Date());

        const optimisticMsg: TeamGroupMessage = {
          id: tempId,
          clientMessageId: tempId,
          groupId: activeGroupId,
          senderId: adminId,
          senderName: adminName,
          senderRole: adminRole,
          text: effectiveText,
          time: timeNow,
          createdAt: new Date().toISOString(),
          mediaType: "audio",
          mediaUrl,
          fileName,
          fileSize: durationFormatted,
          status: "sending",
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setTimeout(() => scrollToBottom("smooth"), 50);

        // Send via WS
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "send_message",
              id: tempId,
              tenantId: effectiveTenantId,
              groupId: activeGroupId,
              senderId: adminId,
              senderName: adminName,
              text: effectiveText,
              time: timeNow,
              mediaType: "audio",
              mediaUrl,
              fileName,
              fileSize: durationFormatted,
            })
          );
        }

        try {
          const res = await sendTeamChatMessage({
            tenantId: effectiveTenantId,
            groupId: activeGroupId,
            senderId: adminId,
            senderName: adminName,
            senderRole: adminRole,
            text: effectiveText,
            mediaType: "audio",
            mediaUrl,
            fileName,
            fileSize: durationFormatted,
            clientMessageId: tempId,
          });
          if (res.success && res.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...res.message!, status: "sent" } : m))
            );
          }
        } catch (err) {
          console.warn("[AdminTeamChat] Failed to send voice message:", err);
        }
      };
      reader.readAsDataURL(audioBlob);
    };

    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // -------------------------------------------------------------
  // File / Image Attachment Upload
  // -------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroupId) return;

    setIsUploading(true);
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const mediaType = isImage ? "image" : isVideo ? "video" : "document";
    const fileSizeFormatted = file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const effectiveText = isImage ? "📷 Photo" : isVideo ? "🎥 Video" : file.name;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const s3Path = `team_chat/${activeGroupId}/${Date.now()}_${file.name}`;
      
      let mediaUrl = base64;
      try {
        const uploadRes = await uploadChatFile(effectiveTenantId, s3Path, base64);
        if (uploadRes?.url) mediaUrl = uploadRes.url;
      } catch (upErr) {
        console.warn("Upload fallback to data url:", upErr);
      }

      const tempId = `temp-${Date.now()}`;
      const timeNow = formatMessageTime(new Date());

      const optimisticMsg: TeamGroupMessage = {
        id: tempId,
        clientMessageId: tempId,
        groupId: activeGroupId,
        senderId: adminId,
        senderName: adminName,
        senderRole: adminRole,
        text: effectiveText,
        time: timeNow,
        createdAt: new Date().toISOString(),
        mediaType,
        mediaUrl,
        fileName: file.name,
        fileSize: fileSizeFormatted,
        status: "sending",
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => scrollToBottom("smooth"), 50);

      // Fast-path: Send via open WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "send_message",
            id: tempId,
            tenantId: effectiveTenantId,
            groupId: activeGroupId,
            senderId: adminId,
            senderName: adminName,
            text: effectiveText,
            time: timeNow,
            mediaType,
            mediaUrl,
            fileName: file.name,
            fileSize: fileSizeFormatted,
          })
        );
      }

      try {
        const res = await sendTeamChatMessage({
          tenantId: effectiveTenantId,
          groupId: activeGroupId,
          senderId: adminId,
          senderName: adminName,
          senderRole: adminRole,
          text: effectiveText,
          mediaType,
          mediaUrl,
          fileName: file.name,
          fileSize: fileSizeFormatted,
          clientMessageId: tempId,
        });

        if (res.success && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...res.message!, status: "sent" } : m))
          );
        }
      } catch (err) {
        console.warn("[AdminTeamChat] Failed to send attachment:", err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Group Approval Actions (Admin Privilege)
  // -------------------------------------------------------------
  const handleApproveGroup = async (group: TeamGroup) => {
    try {
      await updateTeamGroup({
        tenantId: effectiveTenantId,
        groupId: group.id,
        subject: group.subject,
      });

      // Also trigger backend approval if requestId exists
      if (group.requestId) {
        await fetch(`${getBackendUrl()}/api/requests/act`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: effectiveTenantId,
            requestId: group.requestId,
            action: "approve_close",
            comment: "Approved by Admin via Team Chat",
            actorId: adminId,
            actorName: adminName,
            actorRole: adminRole,
          }),
        }).catch(() => {});
      }

      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, status: "approved" } : g))
      );
      loadGroupsList();
    } catch (err) {
      console.warn("[AdminTeamChat] Failed to approve group:", err);
    }
  };

  const handleDeclineGroup = async (group: TeamGroup) => {
    if (!confirm(`Are you sure you want to decline the creation of "${group.subject}"?`)) return;
    try {
      await deleteTeamGroup({
        tenantId: effectiveTenantId,
        groupId: group.id,
        userId: adminId,
      });
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      if (activeGroupId === group.id) setActiveGroupId(null);
    } catch (err) {
      console.warn("[AdminTeamChat] Failed to decline group:", err);
    }
  };

  // -------------------------------------------------------------
  // Create New Group (Admin Direct Creation)
  // -------------------------------------------------------------
  const handleCreateNewGroup = async () => {
    if (!newGroupSubject.trim() || isCreatingGroup) return;

    setIsCreatingGroup(true);
    try {
      const selectedMembersData: TeamGroupMember[] = newGroupSelectedMembers.map((empId) => {
        const emp = employees.find((e) => e.id === empId || e.empCode === empId);
        return {
          id: empId,
          name: emp?.name || "Team Member",
          role: emp?.role || "Member",
          department: emp?.department || "General",
          avatar: emp?.avatar || "",
          isAdmin: false,
          empCode: emp?.empCode,
        };
      });

      // Add Admin as member
      selectedMembersData.unshift({
        id: adminId,
        name: adminName,
        role: adminRole,
        department: "Administration",
        isAdmin: true,
      });

      const payload = {
        tenantId: effectiveTenantId,
        creatorId: adminId,
        creatorName: adminName,
        subject: newGroupSubject.trim(),
        description: newGroupDesc.trim(),
        iconEmoji: newGroupEmoji,
        iconBgColor: newGroupColor,
        members: selectedMembersData,
      };

      const res = await requestCreateGroup(payload);
      if (res.success && res.group) {
        // As admin, immediately approve group!
        await updateTeamGroup({
          tenantId: effectiveTenantId,
          groupId: res.group.id,
          subject: res.group.subject,
        });

        // Close modal and select new group
        setIsNewGroupOpen(false);
        setNewGroupStep(1);
        setNewGroupSubject("");
        setNewGroupDesc("");
        setNewGroupSelectedMembers([]);
        await loadGroupsList();
        setActiveGroupId(res.group.id);
      }
    } catch (err) {
      console.warn("[AdminTeamChat] Failed to create group:", err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // -------------------------------------------------------------
  // Add Members to Existing Group
  // -------------------------------------------------------------
  const handleAddMembersToGroup = async () => {
    if (!activeGroup || addMemberSelected.length === 0 || isUpdatingGroup) return;

    setIsUpdatingGroup(true);
    try {
      const newMembers: TeamGroupMember[] = addMemberSelected.map((empId) => {
        const emp = employees.find((e) => e.id === empId || e.empCode === empId);
        return {
          id: empId,
          name: emp?.name || "Team Member",
          role: emp?.role || "Member",
          department: emp?.department || "General",
          avatar: emp?.avatar || "",
          isAdmin: false,
          empCode: emp?.empCode,
        };
      });

      const updatedMembers = [...activeGroup.members, ...newMembers];
      await updateTeamGroup({
        tenantId: effectiveTenantId,
        groupId: activeGroup.id,
        members: updatedMembers,
      });

      // Send announcement
      await sendTeamChatMessage({
        tenantId: effectiveTenantId,
        groupId: activeGroup.id,
        senderId: "system",
        senderName: "System",
        text: `Admin added ${newMembers.map((m) => m.name).join(", ")} to the group.`,
      });

      setGroups((prev) =>
        prev.map((g) => (g.id === activeGroup.id ? { ...g, members: updatedMembers } : g))
      );
      setIsAddMemberOpen(false);
      setAddMemberSelected([]);
    } catch (err) {
      console.warn("[AdminTeamChat] Error adding members:", err);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeGroup) return;
    if (!confirm(`Remove ${memberName} from this group?`)) return;

    const updated = activeGroup.members.filter((m) => m.id !== memberId);
    await updateTeamGroup({
      tenantId: effectiveTenantId,
      groupId: activeGroup.id,
      members: updated,
    });
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? { ...g, members: updated } : g))
    );
  };

  // -------------------------------------------------------------
  // Message Actions
  // -------------------------------------------------------------
  const handleDeleteMessage = async (msg: TeamGroupMessage, mode: "everyone" | "me") => {
    if (!activeGroupId) return;
    if (!confirm(`Delete message for ${mode === "everyone" ? "everyone" : "you"}?`)) return;

    await deleteTeamChatMessage({
      tenantId: effectiveTenantId,
      groupId: activeGroupId,
      messageId: msg.id,
      userId: adminId,
      mode,
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isDeleted: true, text: "This message was deleted" } : m))
    );
  };

  const handleClearChat = async () => {
    if (!activeGroupId) return;
    if (!confirm("Are you sure you want to clear all messages in this group? This cannot be undone.")) return;

    await clearGroupMessages({
      tenantId: effectiveTenantId,
      groupId: activeGroupId,
      userId: adminId,
    });
    setMessages([]);
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!confirm(`Delete group "${activeGroup.subject}" completely? All members will be removed.`)) return;

    await deleteTeamGroup({
      tenantId: effectiveTenantId,
      groupId: activeGroup.id,
      userId: adminId,
    });
    setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
    setActiveGroupId(null);
    setIsGroupInfoOpen(false);
  };

  // -------------------------------------------------------------
  // Ask SWIFT AI Privately
  // -------------------------------------------------------------
  const handleAskAI = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");

    try {
      const res = await askSwiftAIPrivately({
        prompt: aiPrompt.trim(),
        context: aiContextMsg?.text || (messages.slice(-5).map((m) => `${m.senderName}: ${m.text}`).join("\n")),
        groupSubject: activeGroup?.subject || "Team Chat",
        senderName: aiContextMsg?.senderName,
      });

      setAiResponse(res.response || "No response received from Swift AI.");
    } catch (err: any) {
      setAiResponse("Failed to query Swift AI Copilot. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDEBAR: GROUP LIST (WhatsApp Web Style) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col w-full md:w-[380px] lg:w-[420px] shrink-0 h-full border-r border-border bg-card/60 backdrop-blur-md overflow-hidden">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-brand text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-primary/20">
                {company?.name ? company.name.substring(0, 2).toUpperCase() : "SW"}
              </div>
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                  wsConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
                title={wsConnected ? "Connected to Team Chat" : "Connecting..."}
              />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5 font-display">
                Team Chat
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  LIVE
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                {wsConnected ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Synced with Mobile App
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Connecting...
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setNewGroupStep(1);
                setIsNewGroupOpen(true);
              }}
              className="h-8 gap-1.5 text-xs bg-gradient-brand shadow-sm font-semibold hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Group</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="Search or start new chat..."
              className="pl-9 pr-8 h-9 text-xs bg-background/90 rounded-xl border-border/80 focus-visible:ring-primary"
            />
            {groupSearchQuery && (
              <button
                onClick={() => setGroupSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === "approved"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Active Channels
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Pending Approval
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Groups Scroll Area */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 overscroll-contain">
          {isLoadingGroups && groups.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
              Loading channels...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {groupSearchQuery ? "No channels match your search" : "No team chat channels found"}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = group.id === activeGroupId;
              const isPending = group.status === "pending_approval";

              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all border-l-4 ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "border-transparent hover:bg-muted/40"
                  }`}
                >
                  {/* Group Avatar / Favicon */}
                  <div className="relative shrink-0">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm overflow-hidden"
                      style={{ backgroundColor: group.iconBgColor || "#128C7E" }}
                    >
                      {group.avatarUrl ? (
                        <img src={group.avatarUrl} alt={group.subject} className="h-full w-full object-cover" />
                      ) : (
                        <span>{group.iconEmoji || "🚀"}</span>
                      )}
                    </div>
                    {isPending && (
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-500 rounded-full ring-2 ring-card" title="Awaiting Admin Approval" />
                    )}
                  </div>

                  {/* Group Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                        {group.subject}
                        {isPending && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Pending
                          </Badge>
                        )}
                      </h2>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatGroupListTime(group.updatedAt || group.lastMessageTime || group.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground truncate max-w-[210px] flex items-center gap-1">
                        {group.lastMessageSender ? (
                          <span className="font-medium text-foreground/80 shrink-0">
                            {group.lastMessageSender}:{" "}
                          </span>
                        ) : null}
                        {group.lastMessageText === "📷 Photo" || group.lastMessageText?.startsWith("📷 ") ? (
                          <span className="flex items-center gap-1">
                            <Camera className="h-3 w-3 text-primary shrink-0" />
                            Photo
                          </span>
                        ) : group.lastMessageText?.startsWith("🎤 Voice") || group.lastMessageText?.startsWith("🎤 ") ? (
                          <span className="flex items-center gap-1">
                            <Mic className="h-3 w-3 text-emerald-600 shrink-0" />
                            Voice message
                          </span>
                        ) : group.lastMessageText?.startsWith("📄 ") ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-primary shrink-0" />
                            Document
                          </span>
                        ) : (
                          group.lastMessageText || "No messages yet"
                        )}
                      </p>

                      {group.unreadCount > 0 && !isSelected && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {group.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.members?.length || 0} participants
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT MAIN AREA: ACTIVE CHAT CONVERSATION */}
      {/* ------------------------------------------------------------- */}
      {activeGroup ? (
        <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden bg-background relative">
          {/* Active Chat Header */}
          <div className="h-16 px-4 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setIsGroupInfoOpen(true)}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-sm overflow-hidden"
                style={{ backgroundColor: activeGroup.iconBgColor || "#128C7E" }}
              >
                {activeGroup.avatarUrl ? (
                  <img src={activeGroup.avatarUrl} alt={activeGroup.subject} className="h-full w-full object-cover" />
                ) : (
                  <span>{activeGroup.iconEmoji || "🚀"}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                  {activeGroup.subject}
                  {activeGroup.status === "pending_approval" && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Awaiting Approval
                    </Badge>
                  )}
                </h2>
                {typingUser ? (
                  <p className="text-[11px] text-emerald-600 font-semibold animate-pulse flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {typingUser} is typing...
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground truncate max-w-md">
                    {activeGroup.members?.map((m) => m.name).join(", ") || "No members"}
                  </p>
                )}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatSearchOpen(!isChatSearchOpen)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Search in conversation"
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Wallpaper Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Change chat wallpaper"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Chat Wallpaper
                  </div>
                  <DropdownMenuSeparator />
                  {CHAT_WALLPAPERS.map((wp) => (
                    <DropdownMenuItem
                      key={wp.id}
                      onClick={() => setSelectedWallpaper(wp)}
                      className="text-xs flex items-center justify-between"
                    >
                      <span>{wp.name}</span>
                      {selectedWallpaper.id === wp.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Ask SWIFT AI Copilot */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAiContextMsg(null);
                  setAiPrompt("Summarize key discussion items and any urgent action items in this team chat.");
                  setAiModalOpen(true);
                }}
                className="h-8 gap-1.5 text-xs font-semibold bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </Button>

              {/* Group Info Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGroupInfoOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Group info"
              >
                <Info className="h-4 w-4" />
              </Button>

              {/* 3-Dots Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsGroupInfoOpen(true)} className="text-xs">
                    <Users className="h-3.5 w-3.5 mr-2" /> Group Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsAddMemberOpen(true)} className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-2" /> Add Participants
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleClearChat} className="text-xs text-amber-600 focus:text-amber-600">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Clear Chat History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteGroup} className="text-xs text-destructive focus:text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5 mr-2" /> Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Pending Approval Admin Banner */}
          {activeGroup.status === "pending_approval" && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Group created by <strong>{activeGroup.createdBy || "Employee"}</strong> is awaiting Administrator Approval.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleApproveGroup(activeGroup)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Approve Group
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineGroup(activeGroup)}
                  className="h-7 text-xs border-amber-500/40 text-destructive hover:bg-destructive/10"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* In-Chat Search Bar Drawer */}
          {isChatSearchOpen && (
            <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-2 z-10">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                autoFocus
                value={chatSearchQuery}
                onChange={async (e) => {
                  const val = e.target.value;
                  setChatSearchQuery(val);
                  if (val.trim()) {
                    const res = await searchTeamChatMessages(effectiveTenantId, activeGroup.id, val.trim());
                    setSearchResults(res.results || []);
                  } else {
                    setSearchResults([]);
                  }
                }}
                placeholder="Search messages in this channel..."
                className="h-8 text-xs bg-muted/40"
              />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {chatSearchQuery ? `${searchResults.length} matches` : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsChatSearchOpen(false);
                  setChatSearchQuery("");
                  setSearchResults([]);
                }}
                className="h-7 w-7 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* CHAT MESSAGES SCROLL VIEW WITH WALLPAPER */}
          {/* ------------------------------------------------------------- */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 relative overscroll-contain"
            style={{
              backgroundColor: selectedWallpaper.previewBg,
              backgroundImage: selectedWallpaper.sourceUrl ? `url(${selectedWallpaper.sourceUrl})` : "none",
              backgroundRepeat: "repeat",
              backgroundSize: "400px",
            }}
          >
            {/* End-to-end encryption & team notice pill */}
            <div className="flex justify-center my-2">
              <div className="px-3 py-1.5 rounded-xl bg-card/85 dark:bg-card/90 backdrop-blur-md text-foreground/80 text-[11px] shadow-sm flex items-center gap-1.5 max-w-md text-center border border-border/60">
                <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                <span>
                  Messages in this channel are synchronized in real-time with the SWIFT Mobile App.
                </span>
              </div>
            </div>

            {isLoadingMessages ? (
              <div className="flex justify-center p-8">
                <div className="p-3 bg-card/80 backdrop-blur rounded-2xl shadow-sm text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-primary" />
                  Loading conversation history...
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-3 shadow-inner">
                  {activeGroup.iconEmoji || "💬"}
                </div>
                <h3 className="font-bold text-sm text-foreground">Welcome to {activeGroup.subject}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  This channel is ready. Say hello or share updates with all {activeGroup.members?.length || 0} participants!
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderId === adminId || msg.senderRole === "Admin";
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showDateSep = shouldShowDateSeparator(prevMsg?.createdAt, msg.createdAt);
                const dateLabel = getDateSeparatorLabel(msg.createdAt);

                // System message
                if (msg.isSystem) {
                  return (
                    <div key={msg.id || index} className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-full bg-card/90 text-muted-foreground text-[10px] font-medium shadow-sm border border-border/60">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || index} className="space-y-2">
                    {/* Date separator pill */}
                    {showDateSep && (
                      <div className="flex justify-center my-3">
                        <span className="px-3 py-1 rounded-full bg-card/95 text-foreground/70 text-[10px] font-bold tracking-wider uppercase shadow-sm border border-border/80">
                          {dateLabel}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble Row */}
                    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"} group relative`}>
                      <div
                        className={`max-w-[75%] md:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm relative text-xs transition-all ${
                          isMe
                            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none border border-emerald-500/20"
                            : "bg-card text-foreground rounded-tl-none border border-border/80"
                        }`}
                      >
                        {/* Sender header (only on incoming group messages) */}
                        {!isMe && (
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className="font-bold text-[11px]"
                              style={{ color: getParticipantColor(msg.senderName) }}
                            >
                              {msg.senderName}
                            </span>
                            {msg.senderRole && (
                              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-muted text-muted-foreground">
                                {msg.senderRole}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quoted reply snippet */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/10 border-l-4 border-primary text-[11px]">
                            <span className="font-semibold block text-primary truncate">
                              {msg.replyTo.senderName}
                            </span>
                            <span className="text-muted-foreground truncate block">
                              {msg.replyTo.text || "[Attachment]"}
                            </span>
                          </div>
                        )}

                        {/* Attached Image / Photo (WhatsApp Web style) */}
                        {(msg.mediaType === "image" || (typeof msg.mediaUrl === "string" && msg.mediaUrl.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) || (typeof msg.text === "string" && (msg.text === "📷 Photo" || msg.text.startsWith("📷 ")))) && (
                          msg.mediaUrl ? (
                            <div className="my-1.5 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[320px] max-h-[360px] relative group bg-black/5 dark:bg-white/5">
                              <img
                                src={msg.mediaUrl}
                                alt={msg.fileName || "Photo"}
                                onClick={() => setLightboxUrl(msg.mediaUrl || null)}
                                className="w-full h-auto max-h-[340px] object-cover cursor-pointer hover:opacity-95 transition-all block rounded-xl shadow-xs"
                                loading="lazy"
                              />
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 text-white shadow-md">
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(msg.mediaUrl || null)}
                                  className="p-1.5 hover:bg-white/20 rounded cursor-pointer transition-colors"
                                  title="View full size"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <a
                                  href={msg.mediaUrl}
                                  download={msg.fileName || "photo.jpg"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-white/20 rounded text-white transition-colors"
                                  title="Download photo"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="my-1.5 p-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-border/70 flex items-center gap-3 max-w-[280px]">
                              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Camera className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                                  <span>Photo</span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {msg.fileSize || "Image"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {msg.fileName || "Photo attachment"}
                                </p>
                              </div>
                            </div>
                          )
                        )}

                        {/* Voice Note Audio Player */}
                        {(msg.mediaType === "audio" || (typeof msg.text === "string" && (msg.text.startsWith("🎤 Voice message") || msg.text.startsWith("🎤 Voice note") || msg.text.startsWith("🎤 ")))) && (
                          <VoiceMessagePlayer
                            mediaUrl={msg.mediaUrl}
                            durationText={msg.fileSize || (typeof msg.text === "string" ? msg.text : "0:06")}
                            isMe={isMe}
                          />
                        )}

                        {/* Attached Video */}
                        {msg.mediaType === "video" && (
                          <div className="my-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/10 flex items-center gap-3 max-w-[280px]">
                            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Video className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate">{msg.fileName || "Video"}</p>
                              <p className="text-[10px] text-muted-foreground">{msg.fileSize || "Video clip"}</p>
                            </div>
                          </div>
                        )}

                        {/* Attached Document */}
                        {msg.mediaType === "document" && (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.fileName || "document"}
                            className="my-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/10 flex items-center gap-2.5 hover:bg-black/10 dark:hover:bg-white/15 transition-colors text-inherit"
                          >
                            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[11px] truncate">{msg.fileName || "Document"}</p>
                              <p className="text-[10px] text-muted-foreground">{msg.fileSize || "Attachment"}</p>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground hover:text-foreground shrink-0" />
                          </a>
                        )}

                        {/* Message Text Caption (suppress placeholder labels so they aren't repeated under media) */}
                        {msg.text &&
                          msg.text !== "📷 Photo" &&
                          !msg.text.startsWith("📷 ") &&
                          msg.text !== "🎥 Video" &&
                          !msg.text.startsWith("🎥 ") &&
                          !msg.text.startsWith("🎤 Voice message") &&
                          !msg.text.startsWith("🎤 Voice note") &&
                          !msg.text.startsWith("🎤 ") &&
                          !msg.text.startsWith("📄 ") && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-[12px]">
                              {msg.text}
                            </p>
                        )}

                        {/* Footer: timestamp + read ticks + edited tag */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75 select-none">
                          {msg.isEdited && <span className="italic mr-0.5 text-[9px]">(edited)</span>}
                          <span>{msg.time || formatMessageTime(msg.createdAt)}</span>
                          {isMe && (
                            <span>
                              {msg.status === "sending" ? (
                                <Clock className="h-3 w-3 text-muted-foreground animate-spin" />
                              ) : msg.readBy && msg.readBy.length > 0 ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-500 font-bold" title={`Read by ${msg.readBy.length} members`} />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-muted-foreground" title="Delivered" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Hover Action Dropdown Menu */}
                        <div
                          className={`absolute top-1 ${
                            isMe ? "-left-8" : "-right-8"
                          } opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full bg-card shadow-md border border-border text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMe ? "start" : "end"} className="w-44 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setReplyingTo(msg);
                                  textareaRef.current?.focus();
                                }}
                              >
                                <Reply className="h-3.5 w-3.5 mr-2" /> Reply
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  if (msg.text) navigator.clipboard.writeText(msg.text);
                                }}
                              >
                                <FileText className="h-3.5 w-3.5 mr-2" /> Copy Text
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMessageForInfo(msg);
                                }}
                              >
                                <Info className="h-3.5 w-3.5 mr-2" /> Message Info
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setAiContextMsg(msg);
                                  setAiPrompt(`Help me understand or respond to this message from ${msg.senderName}: "${msg.text}"`);
                                  setAiModalOpen(true);
                                }}
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Ask SWIFT AI
                              </DropdownMenuItem>

                              {isMe && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setMessageText(msg.text);
                                      textareaRef.current?.focus();
                                    }}
                                  >
                                    <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit Message
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(msg, "everyone")}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete for Everyone
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CHAT INPUT AREA */}
          {/* ------------------------------------------------------------- */}
          <div className="p-3 border-t border-border bg-card/90 backdrop-blur-md shrink-0 relative z-20">
            {/* Replying To Banner */}
            {replyingTo && (
              <div className="mb-2 p-2 rounded-xl bg-muted/60 border-l-4 border-primary flex items-center justify-between text-xs animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-primary block truncate">
                    Replying to {replyingTo.senderName}
                  </span>
                  <span className="text-muted-foreground truncate block text-[11px]">
                    {replyingTo.text || "[Attachment]"}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Editing Message Banner */}
            {editingMessage && (
              <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 flex items-center justify-between text-xs animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-amber-700 dark:text-amber-300 block">
                    Editing message
                  </span>
                  <span className="text-muted-foreground truncate block text-[11px]">
                    Press Enter to save changes, Esc to cancel
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageText("");
                  }}
                  className="h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar Controls */}
            <div className="flex items-end gap-2">
              {isRecordingVoice ? (
                <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      Recording voice note...
                    </span>
                    <span className="font-mono text-muted-foreground ml-2 font-bold">
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelVoiceRecording}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                      title="Discard voice recording"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button
                      onClick={finishAndSendVoiceRecording}
                      size="sm"
                      className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full gap-1.5 text-xs shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Emoji Picker Popover */}
                  <DropdownMenu open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-64 p-3">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2">Emojis</div>
                      <div className="grid grid-cols-6 gap-2 text-xl max-h-48 overflow-y-auto">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setMessageText((prev) => prev + emoji);
                              setIsEmojiPickerOpen(false);
                              textareaRef.current?.focus();
                            }}
                            className="h-8 w-8 hover:bg-muted rounded flex items-center justify-center transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Attachment Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                    title="Attach Document or Image"
                  >
                    {isUploading ? (
                      <Clock className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </Button>

                  {/* Textarea Input */}
                  <div className="flex-1 bg-muted/40 rounded-2xl px-3 py-1.5 border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMessageText(val);
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeGroupId) {
                          wsRef.current.send(
                            JSON.stringify({
                              type: "typing_start",
                              groupId: activeGroupId,
                              userId: adminId,
                              userName: adminName,
                            })
                          );
                          clearTimeout(typingTimerRef.current);
                          typingTimerRef.current = setTimeout(() => {
                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeGroupId) {
                              wsRef.current.send(
                                JSON.stringify({
                                  type: "typing_stop",
                                  groupId: activeGroupId,
                                  userId: adminId,
                                  userName: adminName,
                                })
                              );
                            }
                          }, 2500);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                        if (e.key === "Escape" && editingMessage) {
                          setEditingMessage(null);
                          setMessageText("");
                        }
                      }}
                      placeholder="Type a message or press Shift+Enter for new line..."
                      rows={1}
                      className="w-full bg-transparent border-0 resize-none text-xs outline-none max-h-28 overflow-y-auto leading-relaxed"
                    />
                  </div>

                  {/* Send or Voice Note Button */}
                  {messageText.trim() ? (
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending}
                      size="icon"
                      className="h-9 w-9 rounded-full bg-gradient-brand shadow-md text-white shrink-0 hover:opacity-95 transition-transform active:scale-95"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={startVoiceRecording}
                      disabled={isUploading}
                      size="icon"
                      className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-md text-white shrink-0 transition-transform active:scale-95"
                      title="Click to record voice message"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State (WhatsApp Web Style) */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10 text-center select-none">
          <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-sm">
            <Users className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground font-display">SWIFT Team Chat for Admin</h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-2 leading-relaxed">
            Collaborate with employees across branches and departments. All messages, media, and announcements are fully synchronized with the mobile app.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>End-to-end synchronized organizational communication</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: NEW GROUP (Step 1: Participants, Step 2: Details) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {newGroupStep === 1 ? "New Group: Select Participants" : "New Group: Name & Theme"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {newGroupStep === 1
                ? "Choose team members to include in this channel."
                : "Give your team group a subject and custom icon."}
            </DialogDescription>
          </DialogHeader>

          {newGroupStep === 1 ? (
            <div className="space-y-3 py-2">
              {/* Selected Pills */}
              {newGroupSelectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-xl max-h-20 overflow-y-auto">
                  {newGroupSelectedMembers.map((empId) => {
                    const emp = employees.find((e) => e.id === empId || e.empCode === empId);
                    return (
                      <span
                        key={empId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium"
                      >
                        {emp?.name || empId}
                        <button
                          onClick={() =>
                            setNewGroupSelectedMembers((prev) => prev.filter((id) => id !== empId))
                          }
                          className="hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Member Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search staff by name or department..."
                  className="pl-8 h-8 text-xs bg-muted/20"
                />
              </div>

              {/* Employee list */}
              <div className="max-h-60 overflow-y-auto divide-y divide-border/40 border border-border/60 rounded-xl">
                {employees
                  .filter((emp) => {
                    if (!memberSearchQuery.trim()) return true;
                    const q = memberSearchQuery.toLowerCase();
                    return emp.name.toLowerCase().includes(q) || (emp.department && emp.department.toLowerCase().includes(q));
                  })
                  .map((emp) => {
                    const isSelected = newGroupSelectedMembers.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setNewGroupSelectedMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {emp.department || "General"} · {emp.designation || "Staff"}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Group Avatar Preview + Pickers */}
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-black/10"
                  style={{ backgroundColor: newGroupColor }}
                >
                  {newGroupEmoji}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Group Icon Emoji</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_OPTIONS.slice(0, 10).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewGroupEmoji(emoji)}
                        className={`h-7 w-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          newGroupEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Options */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Badge Background Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewGroupColor(color)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        newGroupColor === color ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Channel Subject *</label>
                <Input
                  value={newGroupSubject}
                  onChange={(e) => setNewGroupSubject(e.target.value)}
                  placeholder="e.g. Sales Team, Marketing Sprint, HR Notice..."
                  className="h-9 text-xs"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Purpose / Description (Optional)</label>
                <Input
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this channel for?"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {newGroupStep === 2 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewGroupStep(1)}
                className="text-xs"
              >
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNewGroupOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            )}

            {newGroupStep === 1 ? (
              <Button
                size="sm"
                onClick={() => setNewGroupStep(2)}
                disabled={newGroupSelectedMembers.length === 0}
                className="text-xs bg-gradient-brand"
              >
                Next ({newGroupSelectedMembers.length} selected)
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCreateNewGroup}
                disabled={!newGroupSubject.trim() || isCreatingGroup}
                className="text-xs bg-gradient-brand gap-1.5"
              >
                {isCreatingGroup ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Create Channel
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* DRAWER / MODAL: GROUP INFO & SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {isGroupInfoOpen && activeGroup && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="h-14 px-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Group Info
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsGroupInfoOpen(false)}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Header info */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-border/60">
              <div
                className="h-20 w-20 rounded-3xl flex items-center justify-center text-4xl shadow-md mb-2 overflow-hidden"
                style={{ backgroundColor: activeGroup.iconBgColor || "#128C7E" }}
              >
                {activeGroup.avatarUrl ? (
                  <img src={activeGroup.avatarUrl} alt={activeGroup.subject} className="h-full w-full object-cover" />
                ) : (
                  <span>{activeGroup.iconEmoji || "🚀"}</span>
                )}
              </div>
              <h4 className="font-bold text-base text-foreground">{activeGroup.subject}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created by {activeGroup.createdBy || "Admin"} · {new Date(activeGroup.createdAt).toLocaleDateString()}
              </p>
              {activeGroup.description && (
                <p className="text-xs text-foreground/80 mt-2 bg-muted/30 p-2 rounded-xl text-left w-full">
                  {activeGroup.description}
                </p>
              )}
            </div>

            {/* Participants list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">
                  {activeGroup.members?.length || 0} Participants
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="h-7 text-[11px] gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Member
                </Button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto divide-y divide-border/30">
                {activeGroup.members?.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.role || "Member"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.isAdmin && (
                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                          Admin
                        </Badge>
                      )}
                      {!m.isAdmin && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.name)}
                          className="text-[10px] text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border/60 space-y-2">
              <Button
                variant="outline"
                onClick={handleClearChat}
                className="w-full text-xs justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/20"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear Message History
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteGroup}
                className="w-full text-xs justify-start text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                <ShieldAlert className="h-4 w-4 mr-2" /> Delete Group Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD PARTICIPANTS TO GROUP */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Add Participants to {activeGroup?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              Select employees to invite to this group.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto divide-y divide-border/40 py-2">
            {employees
              .filter((e) => !activeGroup?.members?.some((m) => m.id === e.id || m.id === e.empCode))
              .map((emp) => {
                const isSelected = addMemberSelected.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setAddMemberSelected((prev) =>
                        isSelected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                      );
                    }}
                    className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/40 transition-colors ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.department || "Staff"}</p>
                    </div>
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        isSelected ? "bg-primary border-primary text-white" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddMemberOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddMembersToGroup}
              disabled={addMemberSelected.length === 0 || isUpdatingGroup}
              className="text-xs bg-gradient-brand"
            >
              Add Selected ({addMemberSelected.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MESSAGE INFO (Read Receipts) */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={!!selectedMessageForInfo}
        onOpenChange={(open) => !open && setSelectedMessageForInfo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-blue-500" /> Message Read Receipts
            </DialogTitle>
          </DialogHeader>

          {selectedMessageForInfo && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl">
                <span className="font-semibold text-foreground block mb-0.5">
                  {selectedMessageForInfo.senderName}
                </span>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedMessageForInfo.text || "[Media]"}
                </p>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Sent at {selectedMessageForInfo.time || formatMessageTime(selectedMessageForInfo.createdAt)}
                </span>
              </div>

              <div>
                <span className="font-bold text-foreground block mb-2">
                  Read by ({selectedMessageForInfo.readBy?.length || 0} members)
                </span>
                {(!selectedMessageForInfo.readBy || selectedMessageForInfo.readBy.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic">No read receipts yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-border/30">
                    {selectedMessageForInfo.readBy.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-semibold text-foreground">{r.userName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatMessageTime(r.readAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ASK SWIFT AI PRIVATELY */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> SWIFT AI Copilot (Private Chat Analysis)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ask AI about this conversation, draft responses, or extract statutory & company policy guidance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {aiContextMsg && (
              <div className="p-2.5 rounded-xl bg-muted/40 border-l-4 border-primary text-[11px]">
                <span className="font-semibold text-primary block">Context Message:</span>
                <p className="text-muted-foreground truncate">{aiContextMsg.text}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Your Prompt</label>
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask SWIFT AI..."
                className="text-xs"
              />
            </div>

            {aiResponse && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Swift AI Response
                </span>
                <p className="text-foreground/90 whitespace-pre-wrap text-xs leading-relaxed">
                  {aiResponse}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAiModalOpen(false)} className="text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleAskAI}
              disabled={!aiPrompt.trim() || aiLoading}
              className="text-xs bg-gradient-brand gap-1.5"
            >
              {aiLoading ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Reasoning...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask Copilot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* LIGHTBOX: FULL IMAGE PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-black font-bold flex items-center justify-center shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
