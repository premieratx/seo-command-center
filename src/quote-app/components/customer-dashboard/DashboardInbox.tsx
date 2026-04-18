import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Badge } from "@/quote-app/components/ui/badge";
import { Button } from "@/quote-app/components/ui/button";
import { Mail, MailOpen, ArrowLeft, Clock, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface DashboardMessage {
  id: string;
  booking_id: string;
  subject: string;
  content: string;
  sender_type: string;
  sender_name: string;
  read_at: string | null;
  created_at: string;
}

interface DashboardInboxProps {
  bookingId: string;
  onBack: () => void;
  onNavigateTab?: (tab: string) => void;
  isAdminView?: boolean;
}

const renderContent = (content: string, bookingId: string, onNavigateTab?: (tab: string) => void, onLinkClick?: () => void) => {
  // Split on bold, links, and tab links
  const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) return <strong key={i} className="text-white">{boldMatch[1]}</strong>;
    
    const linkMatch = part.match(/^\[(.+)\]\((.+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2];
      
      // Handle tab: links — navigate to a dashboard tab
      if (href.startsWith("tab:")) {
        const tabName = href.replace("tab:", "");
        return (
          <button
            key={i}
            onClick={() => { onLinkClick?.(); onNavigateTab?.(tabName); }}
            className="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            {label}
          </button>
        );
      }
      
      // Handle waiver links — show copy button inline
      if (href.includes("/waiver?booking=")) {
        const fullUrl = href.startsWith("/") ? `${window.location.origin}${href}` : href;
        return (
          <span key={i} className="inline-flex items-center gap-2 my-2">
            <button
              onClick={() => {
                onLinkClick?.();
                navigator.clipboard.writeText(fullUrl);
                toast.success("Waiver link copied to clipboard!");
              }}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              {label}
            </button>
          </span>
        );
      }
      
      // Regular links
      const isRelative = href.startsWith("/");
      return (
        <a
          key={i}
          href={isRelative ? `${window.location.origin}${href}` : href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline font-semibold"
          onClick={() => onLinkClick?.()}
        >
          {label}
        </a>
      );
    }
    return part;
  });
};

export const DashboardInbox = ({ bookingId, onBack, onNavigateTab, isAdminView = false }: DashboardInboxProps) => {
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DashboardMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [bookingId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("dashboard_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data as unknown as DashboardMessage[]);
    }
    setLoading(false);
  };

  const markAsRead = async (msg: DashboardMessage) => {
    if (!msg.read_at && !isAdminView) {
      await supabase
        .from("dashboard_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", msg.id);
      
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
      );
    }
    setSelectedMessage(msg);
  };

  const markAsClicked = async (msgId: string) => {
    if (isAdminView) return;
    await supabase
      .from("dashboard_messages")
      .update({ clicked_at: new Date().toISOString() } as any)
      .eq("id", msgId);
  };

  const unreadCount = messages.filter((m) => !m.read_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (selectedMessage) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedMessage(null)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inbox
        </Button>
        <Card className="bg-slate-800/70 border-slate-600/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg text-white">{selectedMessage.subject}</CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  From: <span className="text-sky-300">{selectedMessage.sender_name}</span> •{" "}
                  {new Date(selectedMessage.created_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
              {renderContent(selectedMessage.content, bookingId, onNavigateTab, () => markAsClicked(selectedMessage.id))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white">{unreadCount} unread</Badge>
        )}
      </div>

      {messages.length === 0 ? (
        <Card className="bg-slate-800/70 border-slate-600/50">
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => markAsRead(msg)}
              className={`w-full text-left rounded-lg border p-4 transition-all hover:border-sky-500/50 ${
                msg.read_at
                  ? "bg-slate-800/40 border-slate-700/50"
                  : "bg-sky-950/30 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.1)]"
              }`}
            >
              <div className="flex items-start gap-3">
                {msg.read_at ? (
                  <MailOpen className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                ) : (
                  <Mail className="h-5 w-5 text-sky-400 mt-0.5 shrink-0 animate-pulse" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm truncate ${msg.read_at ? "text-slate-300" : "text-white"}`}>
                      {msg.subject}
                    </span>
                    {!msg.read_at && (
                      <Badge className="bg-sky-500 text-white text-[10px] px-1.5 py-0 shrink-0">NEW</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{msg.sender_name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-[11px] text-slate-500">
                      {new Date(msg.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const useUnreadMessageCount = (bookingId: string | null) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!bookingId) return;

    const fetchCount = async () => {
      const { count: unread } = await supabase
        .from("dashboard_messages")
        .select("*", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .is("read_at", null);
      setCount(unread || 0);
    };

    fetchCount();

    // Poll every 30 seconds for new messages
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [bookingId]);

  return count;
};
