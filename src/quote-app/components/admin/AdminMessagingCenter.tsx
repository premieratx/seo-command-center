import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Textarea } from "@/quote-app/components/ui/textarea";
import { Badge } from "@/quote-app/components/ui/badge";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { Send, Mail, MailOpen, Clock, Loader2, Search, ChevronDown, ChevronUp, CalendarIcon, X, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/quote-app/lib/utils";
import type { DateRange } from "react-day-picker";
import { SmartPromptBar } from "./messaging/SmartPromptBar";
import { MessageTemplates } from "./messaging/MessageTemplates";
import { CompactRecipientList } from "./messaging/CompactRecipientList";

interface DashboardMessage {
  id: string;
  booking_id: string;
  subject: string;
  content: string;
  sender_type: string;
  sender_name: string;
  read_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

interface BookingSummary {
  id: string;
  customer_name: string;
  customer_email: string;
  event_date: string;
  experience_title: string;
}

export const AdminMessagingCenter = () => {
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDropdown, setShowDropdown] = useState(false);
  // Smart prompt results (shown in compact list when populated)
  const [promptMatchedIds, setPromptMatchedIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchAllMessages();
  }, []);

  const fetchBookings = async () => {
    const { data, error: fnErr } = await supabase.functions.invoke("list-bookings", {
      body: {},
    });
    if (fnErr) console.error("[MessagingCenter] list-bookings error:", fnErr);
    if (data?.bookings) {
      const mapped = data.bookings.map((b: any) => ({
        id: b.id,
        customer_name: b.customer?.name || "Unknown",
        customer_email: b.customer?.email || "",
        event_date: b.time_slot?.start_at || "",
        experience_title: b.time_slot?.experience?.title || "",
      }));
      setBookings(mapped);
    }
    setLoading(false);
  };

  const fetchAllMessages = async () => {
    const { data } = await supabase
      .from("dashboard_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setMessages(data as unknown as DashboardMessage[]);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_email.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (dateRange?.from && b.event_date) {
        const eventDate = new Date(b.event_date);
        const from = dateRange.from;
        const to = dateRange.to || from;
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
        matchesDate = eventDay >= fromDay && eventDay <= toDay;
      }

      const notSelected = !selectedBookingIds.includes(b.id);
      return matchesSearch && matchesDate && notSelected;
    });
  }, [bookings, searchQuery, dateRange, selectedBookingIds]);

  // Bookings matched by smart prompt (for compact list)
  const promptMatchedBookings = useMemo(() => {
    if (!promptMatchedIds) return [];
    return bookings.filter((b) => promptMatchedIds.includes(b.id));
  }, [bookings, promptMatchedIds]);

  const handleSend = async () => {
    if (selectedBookingIds.length === 0 || !subject.trim() || !content.trim()) {
      toast.error("Please select at least one customer, enter a subject, and write a message");
      return;
    }
    setSending(true);
    try {
      const inserts = selectedBookingIds.map((bookingId) => ({
        booking_id: bookingId,
        subject: subject.trim(),
        content: content.trim(),
        sender_type: "admin",
        sender_name: "Premier Party Cruises",
      }));

      const { error } = await supabase.from("dashboard_messages").insert(inserts as any);
      if (error) throw error;

      toast.success(`Message sent to ${selectedBookingIds.length} customer${selectedBookingIds.length > 1 ? "s" : ""}!`);
      setSubject("");
      setContent("");
      setSelectedBookingIds([]);
      setPromptMatchedIds(null);
      fetchAllMessages();
    } catch (err: any) {
      toast.error("Failed to send: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const addBooking = (id: string) => {
    setSelectedBookingIds((prev) => [...prev, id]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const removeBooking = (id: string) => {
    setSelectedBookingIds((prev) => prev.filter((bid) => bid !== id));
  };

  const selectAllFiltered = () => {
    const newIds = filteredBookings.map((b) => b.id);
    setSelectedBookingIds((prev) => [...new Set([...prev, ...newIds])]);
    setShowDropdown(false);
  };

  const handleSmartPromptSelect = (ids: string[]) => {
    setPromptMatchedIds(ids);
    setSelectedBookingIds(ids);
  };

  const toggleRecipient = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedBookingSummaries = selectedBookingIds
    .map((id) => bookings.find((b) => b.id === id))
    .filter(Boolean) as BookingSummary[];

  const bookingMessages = selectedBookingIds.length === 1
    ? messages.filter((m) => m.booking_id === selectedBookingIds[0])
    : messages;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Send and manage internal messages to customer dashboards.</p>

      {/* Smart Prompt */}
      <Card className="bg-amber-950/20 border-amber-500/20">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs text-amber-300 flex items-center gap-1.5">
            ✨ Smart Prompt — describe who to message
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <SmartPromptBar bookings={bookings} onSelectBookings={handleSmartPromptSelect} />
          <p className="text-[10px] text-slate-500 mt-1.5">
            e.g. "disco cruise bookings between March 1 and April 30" or "private cruise bookings between 6/1 and 6/30"
          </p>
        </CardContent>
      </Card>

      {/* Compact Recipient List (shown after smart prompt match) */}
      {promptMatchedBookings.length > 0 && (
        <CompactRecipientList
          bookings={promptMatchedBookings}
          selectedIds={selectedBookingIds}
          onToggle={toggleRecipient}
          onSelectAll={() => setSelectedBookingIds(promptMatchedIds || [])}
          onDeselectAll={() => setSelectedBookingIds([])}
        />
      )}

      {/* Compose */}
      <Card className="bg-slate-700/40 border-slate-600/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-sky-300 flex items-center gap-2">
            <Send className="h-4 w-4" /> Compose Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Manual Customer selector (still available) */}
          {!promptMatchedIds && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Select Customer(s) manually</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="bg-slate-800/50 border-slate-600 text-white pl-9 placeholder:text-slate-500"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white shrink-0",
                        dateRange?.from && "text-sky-300 border-sky-500/30"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1.5" />
                      {dateRange?.from
                        ? dateRange.to
                          ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                          : format(dateRange.from, "MMM d, yyyy")
                        : "Filter by date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                    {dateRange?.from && (
                      <div className="px-3 pb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-400 hover:text-white w-full"
                          onClick={() => setDateRange(undefined)}
                        >
                          Clear date filter
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {showDropdown && (searchQuery || dateRange?.from) && (
                <div className="max-h-48 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md">
                  {filteredBookings.length > 0 && (
                    <button
                      onClick={selectAllFiltered}
                      className="w-full text-left px-3 py-2 bg-sky-900/30 hover:bg-sky-900/50 text-xs text-sky-300 font-semibold border-b border-slate-700/50 flex items-center gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Select all {filteredBookings.length} matching customers
                    </button>
                  )}
                  {filteredBookings.slice(0, 20).map((b) => {
                    const eventDateStr = b.event_date
                      ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "";
                    return (
                      <button
                        key={b.id}
                        onClick={() => addBooking(b.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm text-slate-200 border-b border-slate-700/50 last:border-0"
                      >
                        <span className="font-medium text-white">{b.customer_name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{b.customer_email}</span>
                        {eventDateStr && (
                          <span className="text-slate-500 ml-2 text-xs">• {eventDateStr}</span>
                        )}
                      </button>
                    );
                  })}
                  {filteredBookings.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-500">No matching customers</p>
                  )}
                  {filteredBookings.length > 20 && (
                    <p className="px-3 py-1.5 text-[11px] text-slate-500 text-center">
                      Showing 20 of {filteredBookings.length} — refine your search
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected recipients (chip view when no prompt match) */}
          {!promptMatchedIds && selectedBookingSummaries.length > 0 && (
            <div className="bg-sky-950/30 border border-sky-500/20 rounded-md px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-sky-300 font-semibold">
                  📧 To: {selectedBookingSummaries.length} recipient{selectedBookingSummaries.length > 1 ? "s" : ""}
                </span>
                {selectedBookingSummaries.length > 1 && (
                  <button
                    onClick={() => setSelectedBookingIds([])}
                    className="text-[10px] text-slate-400 hover:text-red-400"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedBookingSummaries.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 bg-slate-700/60 text-slate-200 text-xs px-2 py-1 rounded-full"
                  >
                    {b.customer_name}
                    <button
                      onClick={() => removeBooking(b.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt match summary */}
          {promptMatchedIds && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-sky-300">
                📧 {selectedBookingIds.length} of {promptMatchedIds.length} recipients selected
              </span>
              <button
                onClick={() => { setPromptMatchedIds(null); setSelectedBookingIds([]); }}
                className="text-[10px] text-slate-400 hover:text-red-400"
              >
                Clear prompt results
              </button>
            </div>
          )}

          <Input
            placeholder="Subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
          />
          <Textarea
            placeholder="Write your message... (supports **bold** and [link text](url) formatting)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
          />

          {/* Templates */}
          <MessageTemplates
            subject={subject}
            content={content}
            onLoadTemplate={(s, c) => { setSubject(s); setContent(c); }}
          />

          <Button
            onClick={handleSend}
            disabled={sending || selectedBookingIds.length === 0 || !subject.trim() || !content.trim()}
            className="bg-sky-600 hover:bg-sky-500 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send to {selectedBookingIds.length || "..."} Customer{selectedBookingIds.length !== 1 ? "s" : ""}
          </Button>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card className="bg-slate-700/40 border-slate-600/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-300">
            Sent Messages {bookingMessages.length > 0 && `(${bookingMessages.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingMessages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No messages sent yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {bookingMessages.map((msg) => {
                const booking = bookings.find((b) => b.id === msg.booking_id);
                return (
                  <div
                    key={msg.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      {msg.read_at ? (
                        <MailOpen className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Mail className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{msg.subject}</span>
                          {msg.read_at ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Read</Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Unread</Badge>
                          )}
                          {msg.clicked_at ? (
                            <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">Clicked</Badge>
                          ) : msg.read_at ? (
                            <Badge className="bg-slate-500/20 text-slate-400 text-[10px]">No Clicks</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400">
                          To: {booking?.customer_name || "Unknown"} •{" "}
                          <Clock className="h-3 w-3 inline" />{" "}
                          {new Date(msg.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <button
                          onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}
                          className="text-xs text-sky-400 hover:text-sky-300 mt-1 flex items-center gap-1"
                        >
                          {expandedMsg === msg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedMsg === msg.id ? "Hide" : "Preview"}
                        </button>
                        {expandedMsg === msg.id && (
                          <p className="text-xs text-slate-300 mt-2 whitespace-pre-line bg-slate-900/50 rounded p-2">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
