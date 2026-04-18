import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Minus, Anchor } from 'lucide-react';
import { Button } from '@/quote-app/components/ui/button';
import { Input } from '@/quote-app/components/ui/input';
import { Label } from '@/quote-app/components/ui/label';
import { Checkbox } from '@/quote-app/components/ui/checkbox';
import { ScrollArea } from '@/quote-app/components/ui/scroll-area';
import { Calendar } from '@/quote-app/components/ui/calendar';
import { cn } from '@/quote-app/lib/utils';
import { supabase } from '@/quote-app/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/quote-app/hooks/use-toast';

// Boat images
import dayTripper1 from '@/quote-app/assets/boats/day-tripper-1.jpg';
import meeseeks1 from '@/quote-app/assets/boats/meeseeks-1.jpg';
import cleverGirl1 from '@/quote-app/assets/boats/clever-girl-1.jpg';

// ─── Types ───
type LeadStep = 'idle' | 'party_type' | 'date' | 'guest_count' | 'availability' | 'contact_info' | 'complete';

interface QuickReplyButton {
  label: string;
  action: 'ask' | 'navigate' | 'lead_capture';
  value: string;
}

interface ChatMsg {
  role: 'user' | 'assistant' | 'system';
  content: string;
  quickReplies?: QuickReplyButton[];
  widget?: 'party_type' | 'date' | 'guest_count' | 'contact_form' | 'availability' | 'ai_date_picker' | 'ai_guest_selector' | 'ai_boat_photo';
  widgetPrompt?: string;
  boatKey?: string;
  boatCaption?: string;
}

interface LeadData {
  partyType: string;
  date: Date | undefined;
  guestCount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  wantDiscount: boolean;
  wantTransport: boolean;
  wantDrinkDelivery: boolean;
  wantPricingInfo: boolean;
}

const PARTY_TYPES = [
  { label: '🎀 Bachelorette Party', value: 'bachelorette' },
  { label: '🤵 Bachelor Party', value: 'bachelor' },
  { label: '🏢 Company Party', value: 'company' },
  { label: '👨‍👩‍👧‍👦 Family Party', value: 'family' },
  { label: '🎂 Birthday', value: 'birthday' },
  { label: '🎓 Graduation', value: 'graduation' },
  { label: '🎉 Other', value: 'other' },
];

// ─── Availability helpers ───
function getBoatForGuests(count: number) {
  if (count <= 14) return { name: 'Day Tripper', capacity: '14', image: dayTripper1, tier: '1-14' };
  if (count <= 25) return { name: 'Meeseeks / The Irony', capacity: '25', image: meeseeks1, tier: '15-25' };
  if (count <= 30) return { name: 'Meeseeks / The Irony', capacity: '30 (extra crew)', image: meeseeks1, tier: '26-30' };
  if (count <= 50) return { name: 'Clever Girl', capacity: '50', image: cleverGirl1, tier: '31-50' };
  return { name: 'Clever Girl', capacity: '75 (extra crew)', image: cleverGirl1, tier: '51-75' };
}

function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getPrivateSlots(day: string): string[] {
  const d = day.toLowerCase();
  if (['monday', 'tuesday', 'wednesday', 'thursday'].includes(d)) {
    return ['9:00 AM – 12:00 PM (3hr)', '9:00 AM – 1:00 PM (4hr)', '12:00 PM – 4:00 PM (4hr)', '1:00 PM – 4:00 PM (3hr)', '4:00 PM – 8:00 PM (4hr)'];
  }
  if (d === 'friday') {
    return ['9:00 AM – 1:00 PM (4hr)', '12:00 PM – 4:00 PM (4hr)', '2:00 PM – 6:00 PM (4hr)', '4:00 PM – 8:00 PM (4hr)'];
  }
  if (d === 'saturday') {
    return ['9:00 AM – 1:00 PM (4hr)', '10:00 AM – 2:00 PM (4hr)', '2:00 PM – 6:00 PM (4hr)', '3:00 PM – 7:00 PM (4hr)', '4:00 PM – 8:00 PM (4hr)'];
  }
  // Sunday
  return ['9:00 AM – 1:00 PM (4hr)', '11:00 AM – 3:00 PM (4hr)', '2:00 PM – 6:00 PM (4hr)', '4:00 PM – 8:00 PM (4hr)'];
}

function getDiscoSlots(day: string): string[] | null {
  const d = day.toLowerCase();
  if (d === 'friday') return ['12:00 PM – 4:00 PM'];
  if (d === 'saturday') return ['11:00 AM – 3:00 PM', '3:30 PM – 7:30 PM'];
  return null;
}

function isDiscoSeason(date: Date): boolean {
  const m = date.getMonth(); // 0-indexed
  return m >= 2 && m <= 9; // March (2) through October (9)
}

function isBachParty(type: string): boolean {
  return ['bachelorette', 'bachelor', 'combined'].includes(type.toLowerCase());
}

export const ChatWidget = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [leadStep, setLeadStep] = useState<LeadStep>('idle');
  const [leadData, setLeadData] = useState<LeadData>({
    partyType: '',
    date: undefined,
    guestCount: 10,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    wantDiscount: true,
    wantTransport: false,
    wantDrinkDelivery: false,
    wantPricingInfo: false,
  });
  const [quickReplies, setQuickReplies] = useState<QuickReplyButton[]>([]);
  const [aiDatePicked, setAiDatePicked] = useState(false);
  const [aiGuestPicked, setAiGuestPicked] = useState(false);
  const [aiGuestCount, setAiGuestCount] = useState(15);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, leadStep]);

  // ─── Lead capture flow ───
  const startLeadCapture = () => {
    setLeadStep('party_type');
    setQuickReplies([]);
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: "Awesome! Let's get you a personalized quote. 🎉\n\n**What kind of party are you planning?**", widget: 'party_type' },
    ]);
  };

  const selectPartyType = (type: string, label: string) => {
    setLeadData(prev => ({ ...prev, partyType: type }));
    setMessages(prev => [
      ...prev,
      { role: 'user', content: label },
      { role: 'assistant', content: `Great choice! 🙌\n\n**When is your ${type === 'other' ? 'event' : type.replace('_', ' ')}?**\n\nPick a date below:`, widget: 'date' },
    ]);
    setLeadStep('date');
  };

  const selectDate = (date: Date | undefined) => {
    if (!date) return;
    setLeadData(prev => ({ ...prev, date }));
    const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    setMessages(prev => [
      ...prev,
      { role: 'user', content: formatted },
      { role: 'assistant', content: `📅 **${formatted}** — perfect!\n\n**How many guests are coming?**\n\nUse the buttons below:`, widget: 'guest_count' },
    ]);
    setLeadStep('guest_count');
  };

  const confirmGuestCount = () => {
    if (!leadData.date) return;

    const day = getDayOfWeek(leadData.date);
    const boat = getBoatForGuests(leadData.guestCount);
    const privateSlots = getPrivateSlots(day);
    const discoSlots = getDiscoSlots(day);
    const showDisco = isBachParty(leadData.partyType) && isDiscoSeason(leadData.date) && discoSlots;

    let availabilityContent = `**${leadData.guestCount} guests** on a **${day}** — here's what's typically available! 🚤\n\n`;
    availabilityContent += `**Your boat: ${boat.name}** (up to ${boat.capacity} guests)\n\n`;
    availabilityContent += `**🛥️ Private Cruise Time Slots:**\n`;
    privateSlots.forEach(s => { availabilityContent += `• ${s}\n`; });

    if (showDisco) {
      availabilityContent += `\n**🪩 ATX Disco Cruise Slots:**\n`;
      discoSlots!.forEach(s => { availabilityContent += `• ${s}\n`; });
      availabilityContent += `\n_Disco cruises are per-person ticketed ($85–$105/person)_`;
    }

    availabilityContent += `\n\n_Actual availability depends on bookings — request a quote to see real-time open slots!_`;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: `${leadData.guestCount} guests` },
      { role: 'assistant', content: availabilityContent, widget: 'availability' },
    ]);
    setLeadStep('availability');
  };

  const goToContactForm = () => {
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `Almost there! 🎉\n\nTell us how to reach you and we'll create your **personalized quote** with real-time availability and pricing.\n\n**Why request a quote?**`, widget: 'contact_form' },
    ]);
    setLeadStep('contact_info');
  };

  const submitLead = async () => {
    if (!leadData.firstName || !leadData.email || !leadData.phone) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setMessages(prev => [
      ...prev,
      { role: 'user', content: `${leadData.firstName} ${leadData.lastName} — ${leadData.email}` },
      { role: 'assistant', content: '⏳ Creating your custom quote...' },
    ]);
    setLeadStep('complete');

    try {
      const eventDate = leadData.date ? leadData.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const baseUrl = window.location.origin;
      const quoteUrlForLead = `${baseUrl}/quote-v2?date=${eventDate}&guests=${leadData.guestCount}&partyType=${encodeURIComponent(leadData.partyType)}`;

      const { data, error } = await supabase.functions.invoke('create-lead', {
        body: {
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email,
          phone: leadData.phone,
          eventDate,
          guestCount: leadData.guestCount,
          partyType: leadData.partyType,
          quoteUrl: quoteUrlForLead,
          sourceType: 'chatbot',
          sourceUrl: window.location.href,
        },
      });

      if (error) throw error;

      const leadId = data?.leadId;
      const dashboardUrl = `${baseUrl}/lead-dashboard?lead=${leadId}`;

      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '⏳ Creating your custom quote...');
        return [
          ...filtered,
          {
            role: 'assistant',
            content: `🎉 **Your quote is ready!**\n\nWe've created a personalized quote with real-time availability, pricing, and booking options. Redirecting you now...`,
            quickReplies: [
              { label: '📋 View My Quote', action: 'navigate', value: dashboardUrl },
            ],
          },
        ];
      });

      setTimeout(() => {
        window.location.href = dashboardUrl;
      }, 2000);
    } catch (e: any) {
      console.error('Lead creation error:', e);
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '⏳ Creating your custom quote...');
        return [
          ...filtered,
          { role: 'assistant', content: `Sorry, there was an issue creating your quote. Please try again or call us directly!\n\nError: ${e.message || 'Unknown error'}` },
        ];
      });
      setLeadStep('contact_info');
    }
  };

  // ─── AI Chat ───
  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setQuickReplies([]);

    let assistantContent = '';
    // Track tool calls by index: { [index]: { name, args } }
    const toolCalls: Record<number, { name: string; args: string }> = {};

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          visitorContext: { type: 'new' },
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.widget) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      };

      const applyQuickReplies = (buttons: QuickReplyButton[]) => {
        setQuickReplies(buttons);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, quickReplies: buttons } : m);
          }
          return prev;
        });
      };

      const processToolCalls = () => {
        for (const tc of Object.values(toolCalls)) {
          try {
            const parsed = JSON.parse(tc.args);
            if (tc.name === 'suggest_quick_replies' && parsed.buttons) {
              applyQuickReplies(parsed.buttons);
            } else if (tc.name === 'show_date_picker') {
              setAiDatePicked(false);
              setMessages(prev => [...prev, { 
                role: 'assistant' as const, 
                content: parsed.prompt_text || 'Pick your event date:', 
                widget: 'ai_date_picker' as const,
                widgetPrompt: parsed.prompt_text 
              }]);
            } else if (tc.name === 'show_guest_selector') {
              setAiGuestPicked(false);
              setMessages(prev => [...prev, { 
                role: 'assistant' as const, 
                content: parsed.prompt_text || 'How many guests?', 
                widget: 'ai_guest_selector' as const,
                widgetPrompt: parsed.prompt_text 
              }]);
            } else if (tc.name === 'show_boat_photo') {
              const boatKey = parsed.boat_key || 'meeseeks';
              const caption = parsed.caption || '';
              const boatImages: Record<string, string> = {
                'day-tripper': dayTripper1,
                'meeseeks': meeseeks1,
                'clever-girl': cleverGirl1,
              };
              setMessages(prev => [...prev, {
                role: 'assistant' as const,
                content: caption,
                widget: 'ai_boat_photo' as const,
                boatKey,
                boatCaption: caption,
              }]);
            }
          } catch { /* partial parse */ }
        }
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            if (delta?.content) upsertAssistant(delta.content);
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCalls[idx]) toolCalls[idx] = { name: '', args: '' };
                if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments;
              }
            }
            if (choice?.finish_reason === 'tool_calls' || choice?.finish_reason === 'stop') {
              processToolCalls();
            }
          } catch { /* skip malformed */ }
        }
      }

      // Final fallback processing
      if (Object.keys(toolCalls).length > 0) {
        processToolCalls();
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I had trouble responding. Please try again! (${e.message})` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── AI-triggered widget handlers ───
  const handleAiDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setAiDatePicked(true);
    const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    // Send date as a user message so AI can continue the conversation
    sendMessage(`My event date is ${formatted}`);
  };

  const handleAiGuestSelect = (count: number) => {
    setAiGuestPicked(true);
    setAiGuestCount(count);
    sendMessage(`I'll have ${count} guests`);
  };

  const handleQuickReply = (btn: QuickReplyButton) => {
    if (btn.action === 'navigate') {
      window.open(btn.value, '_blank');
    } else if (btn.action === 'lead_capture') {
      startLeadCapture();
    } else {
      sendMessage(btn.value || btn.label);
    }
  };

  const toggleOpen = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey there! 👋 Welcome to **Premier Party Cruises**!\n\nI can help you plan the perfect party on the water in Austin. What can I help you with?",
        quickReplies: [
          { label: '🎉 Get a Quote', action: 'lead_capture', value: 'start' },
          { label: '💰 Check Pricing', action: 'ask', value: 'What are your prices?' },
          { label: '📅 Check Availability', action: 'ask', value: 'What dates are available?' },
          { label: '❓ Ask a Question', action: 'ask', value: 'What do you offer?' },
        ],
      }]);
    }
  };

  const maxDate = new Date('2027-12-31');

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 animate-bounce"
          style={{ animationDuration: '2s', animationIterationCount: 3 }}
          aria-label="Open chat"
        >
          <MessageSquare className="h-7 w-7" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed z-50 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
          "bottom-5 right-5 w-[400px] h-[600px]",
          "max-md:left-3 max-md:right-3 max-md:bottom-3 max-md:w-auto max-md:h-[75vh]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Party Cruise Concierge</p>
                <p className="text-[10px] opacity-80">Usually replies instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-primary-foreground/20 transition-colors" aria-label="Minimize chat">
                <Minus className="h-4 w-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-primary-foreground/20 transition-colors" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm">
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {msg.role === 'assistant' && !msg.widget && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── Party Type Widget ─── */}
                  {msg.widget === 'party_type' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {leadStep === 'party_type' && (
                        <div className="grid grid-cols-2 gap-2 px-1">
                          {PARTY_TYPES.map(pt => (
                            <button
                              key={pt.value}
                              onClick={() => selectPartyType(pt.value, pt.label)}
                              className="px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/50 transition-all text-sm font-medium text-left"
                            >
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Date Widget ─── */}
                  {msg.widget === 'date' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {leadStep === 'date' && (
                        <div className="flex justify-center px-1">
                          <Calendar
                            mode="single"
                            selected={leadData.date}
                            onSelect={selectDate}
                            disabled={(date) => date < new Date() || date > maxDate}
                            fromDate={new Date()}
                            toDate={maxDate}
                            className="rounded-xl border border-border bg-card p-2 pointer-events-auto"
                            classNames={{
                              months: "flex flex-col w-full",
                              month: "space-y-2 w-full",
                              caption: "flex justify-center pt-1 relative items-center h-8",
                              caption_label: "text-sm font-medium",
                              nav: "space-x-1 flex items-center",
                              nav_button: "h-8 w-8 bg-transparent border border-border rounded-md p-0 opacity-60 hover:opacity-100 hover:bg-muted transition-all inline-flex items-center justify-center",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse",
                              head_row: "flex w-full",
                              head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-xs",
                              row: "flex w-full mt-1",
                              cell: "flex-1 h-9 text-center text-sm p-0 relative",
                              day: "w-full h-9 p-0 font-normal aria-selected:opacity-100 text-sm rounded-md hover:bg-muted transition-colors",
                              day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                              day_today: "bg-accent text-accent-foreground font-semibold",
                              day_outside: "text-muted-foreground opacity-50",
                              day_disabled: "text-muted-foreground opacity-30",
                              day_hidden: "invisible",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Guest Count Widget ─── */}
                  {msg.widget === 'guest_count' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {leadStep === 'guest_count' && (
                        <div className="mx-1 p-4 rounded-xl border border-border bg-card space-y-4">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setLeadData(p => ({ ...p, guestCount: Math.max(1, p.guestCount - 1) }))}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                            >
                              −
                            </button>
                            <div className="text-center">
                              <span className="text-4xl font-bold text-primary">{leadData.guestCount}</span>
                              <p className="text-xs text-muted-foreground">guests</p>
                            </div>
                            <button
                              onClick={() => setLeadData(p => ({ ...p, guestCount: Math.min(75, p.guestCount + 1) }))}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {[6, 10, 15, 20, 25, 30, 40, 50].map(n => (
                              <button
                                key={n}
                                onClick={() => setLeadData(p => ({ ...p, guestCount: n }))}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                                  leadData.guestCount === n
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:border-primary/50 hover:bg-primary/10"
                                )}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <Button onClick={confirmGuestCount} className="w-full rounded-xl">
                            Continue with {leadData.guestCount} guests →
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Availability Widget with Boat Photo ─── */}
                  {msg.widget === 'availability' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[90%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {leadStep === 'availability' && (
                        <div className="mx-1 rounded-xl border border-border bg-card overflow-hidden">
                          {/* Boat photo */}
                          <div className="relative">
                            <img
                              src={getBoatForGuests(leadData.guestCount).image}
                              alt={getBoatForGuests(leadData.guestCount).name}
                              className="w-full h-36 object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                              <div className="flex items-center gap-1.5">
                                <Anchor className="h-4 w-4 text-white" />
                                <p className="text-white text-sm font-semibold">{getBoatForGuests(leadData.guestCount).name}</p>
                              </div>
                              <p className="text-white/80 text-xs">Up to {getBoatForGuests(leadData.guestCount).capacity} guests</p>
                            </div>
                          </div>
                          {/* CTA Button */}
                          <div className="p-3 space-y-2">
                            <Button
                              onClick={goToContactForm}
                              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold text-sm py-5"
                            >
                              📅 See Full Availability Calendar & Get a Quote
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground">
                              View real-time open time slots • Get personalized pricing
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── Contact Form Widget ─── */}
                  {msg.widget === 'contact_form' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {leadStep === 'contact_info' && (
                        <div className="mx-1 p-4 rounded-xl border border-border bg-card space-y-3">
                          {/* Incentive checkboxes */}
                          <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="discount"
                                checked={leadData.wantDiscount}
                                onCheckedChange={(c) => setLeadData(p => ({ ...p, wantDiscount: !!c }))}
                                className="mt-0.5"
                              />
                              <Label htmlFor="discount" className="text-xs leading-tight cursor-pointer">
                                <span className="font-semibold text-primary">💰 $150 OFF</span> — book by March 24th
                              </Label>
                            </div>
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="transport"
                                checked={leadData.wantTransport}
                                onCheckedChange={(c) => setLeadData(p => ({ ...p, wantTransport: !!c }))}
                                className="mt-0.5"
                              />
                              <Label htmlFor="transport" className="text-xs leading-tight cursor-pointer">
                                🚐 Get discount on round-trip transportation
                              </Label>
                            </div>
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="drinks"
                                checked={leadData.wantDrinkDelivery}
                                onCheckedChange={(c) => setLeadData(p => ({ ...p, wantDrinkDelivery: !!c }))}
                                className="mt-0.5"
                              />
                              <Label htmlFor="drinks" className="text-xs leading-tight cursor-pointer">
                                🍹 Free drink delivery & ice delivery
                              </Label>
                            </div>
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id="packages"
                                checked={leadData.wantPricingInfo}
                                onCheckedChange={(c) => setLeadData(p => ({ ...p, wantPricingInfo: !!c }))}
                                className="mt-0.5"
                              />
                              <Label htmlFor="packages" className="text-xs leading-tight cursor-pointer">
                                📋 Detailed pricing info & inclusions
                              </Label>
                            </div>
                          </div>

                          {/* Form fields */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">First Name</Label>
                              <Input
                                value={leadData.firstName}
                                onChange={e => setLeadData(p => ({ ...p, firstName: e.target.value }))}
                                placeholder="First name"
                                className="h-9 text-sm rounded-lg"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Last Name</Label>
                              <Input
                                value={leadData.lastName}
                                onChange={e => setLeadData(p => ({ ...p, lastName: e.target.value }))}
                                placeholder="Last name"
                                className="h-9 text-sm rounded-lg"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Email</Label>
                            <Input
                              type="email"
                              value={leadData.email}
                              onChange={e => setLeadData(p => ({ ...p, email: e.target.value }))}
                              placeholder="your@email.com"
                              className="h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Phone</Label>
                            <Input
                              type="tel"
                              value={leadData.phone}
                              onChange={e => setLeadData(p => ({ ...p, phone: e.target.value }))}
                              placeholder="(512) 555-1234"
                              className="h-9 text-sm rounded-lg"
                            />
                          </div>
                          <Button
                            onClick={submitLead}
                            disabled={!leadData.firstName || !leadData.email || !leadData.phone}
                            className="w-full rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
                          >
                            🎉 Get My Custom Quote
                          </Button>
                          <p className="text-[10px] text-center text-muted-foreground">No spam. Your info stays private.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── AI Date Picker Widget ─── */}
                  {msg.widget === 'ai_date_picker' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm font-medium">
                          📅 {msg.widgetPrompt || 'Pick your event date:'}
                        </div>
                      </div>
                      {!aiDatePicked && (
                        <div className="flex justify-center px-1">
                          <Calendar
                            mode="single"
                            selected={undefined}
                            onSelect={handleAiDateSelect}
                            disabled={(date) => date < new Date() || date > maxDate}
                            fromDate={new Date()}
                            toDate={maxDate}
                            className="rounded-xl border border-border bg-card p-2 pointer-events-auto"
                            classNames={{
                              months: "flex flex-col w-full",
                              month: "space-y-2 w-full",
                              caption: "flex justify-center pt-1 relative items-center h-8",
                              caption_label: "text-sm font-medium",
                              nav: "space-x-1 flex items-center",
                              nav_button: "h-8 w-8 bg-transparent border border-border rounded-md p-0 opacity-60 hover:opacity-100 hover:bg-muted transition-all inline-flex items-center justify-center",
                              nav_button_previous: "absolute left-1",
                              nav_button_next: "absolute right-1",
                              table: "w-full border-collapse",
                              head_row: "flex w-full",
                              head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-xs",
                              row: "flex w-full mt-1",
                              cell: "flex-1 h-9 text-center text-sm p-0 relative",
                              day: "w-full h-9 p-0 font-normal aria-selected:opacity-100 text-sm rounded-md hover:bg-muted transition-colors",
                              day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                              day_today: "bg-accent text-accent-foreground font-semibold",
                              day_outside: "text-muted-foreground opacity-50",
                              day_disabled: "text-muted-foreground opacity-30",
                              day_hidden: "invisible",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── AI Guest Selector Widget ─── */}
                  {msg.widget === 'ai_guest_selector' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-sm font-medium">
                          👥 {msg.widgetPrompt || 'How many guests?'}
                        </div>
                      </div>
                      {!aiGuestPicked && (
                        <div className="mx-1 p-4 rounded-xl border border-border bg-card space-y-4">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setAiGuestCount(p => Math.max(1, p - 1))}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                            >−</button>
                            <div className="text-center">
                              <span className="text-4xl font-bold text-primary">{aiGuestCount}</span>
                              <p className="text-xs text-muted-foreground">guests</p>
                            </div>
                            <button
                              onClick={() => setAiGuestCount(p => Math.min(100, p + 1))}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                            >+</button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {[6, 10, 15, 20, 25, 30, 40, 50].map(n => (
                              <button
                                key={n}
                                onClick={() => setAiGuestCount(n)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                                  aiGuestCount === n
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:border-primary/50 hover:bg-primary/10"
                                )}
                              >{n}</button>
                            ))}
                          </div>
                          <Button onClick={() => handleAiGuestSelect(aiGuestCount)} className="w-full rounded-xl">
                            Confirm {aiGuestCount} guests →
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── AI Boat Photo Widget ─── */}
                  {msg.widget === 'ai_boat_photo' && (
                    <div className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-xl border border-border bg-card overflow-hidden">
                          <img
                            src={msg.boatKey === 'day-tripper' ? dayTripper1 : msg.boatKey === 'clever-girl' ? cleverGirl1 : meeseeks1}
                            alt={msg.boatKey || 'Boat'}
                            className="w-full h-36 object-cover"
                          />
                          {msg.boatCaption && (
                            <div className="p-2.5">
                              <p className="text-xs text-muted-foreground">{msg.boatCaption}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.quickReplies && msg.quickReplies.length > 0 && i === messages.length - 1 && leadStep === 'idle' && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                      {msg.quickReplies.map((btn, bi) => (
                        <button
                          key={bi}
                          onClick={() => handleQuickReply(btn)}
                          disabled={isStreaming}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-card hover:bg-primary/10 hover:border-primary/50 transition-all disabled:opacity-50"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-muted">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {(leadStep === 'idle' || leadStep === 'complete') && (
            <div className="p-2 border-t flex gap-2 flex-shrink-0">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="rounded-full h-9 text-sm"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={isStreaming}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                size="sm"
                className="rounded-full h-9 w-9 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
