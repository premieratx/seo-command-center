import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/quote-app/components/ui/button';
import { Input } from '@/quote-app/components/ui/input';
import { Calendar } from '@/quote-app/components/ui/calendar';
import { Slider } from '@/quote-app/components/ui/slider';
import { Badge } from '@/quote-app/components/ui/badge';
import { supabase } from '@/quote-app/integrations/supabase/client';
import { useToast } from '@/quote-app/hooks/use-toast';
import { Heart, Users, Briefcase, Cake, GraduationCap, PartyPopper, Loader2, CalendarDays, Check } from 'lucide-react';
import { format, getDay } from 'date-fns';

const PARTY_TYPES = [
  { id: 'bachelorette_party', label: 'Bachelorette Party', icon: Heart, emoji: '💃' },
  { id: 'bachelor_party', label: 'Bachelor Party', icon: PartyPopper, emoji: '🎉' },
  { id: 'combined_bach', label: 'Combined Bach Party', icon: Users, emoji: '💍' },
  { id: 'wedding_event', label: 'Wedding Event', icon: Heart, emoji: '💒' },
  { id: 'corporate_event', label: 'Corporate Event', icon: Briefcase, emoji: '🏢' },
  { id: 'birthday_party', label: 'Birthday Party', icon: Cake, emoji: '🎂' },
  { id: 'graduation', label: 'Graduation Party', icon: GraduationCap, emoji: '🎓' },
  { id: 'other', label: 'Other Occasion', icon: PartyPopper, emoji: '🎊' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type FlowStep = 'greeting' | 'party_type' | 'date' | 'guest_count' | 'availability' | 'contact_first' | 'contact_last' | 'contact_email' | 'contact_phone' | 'creating_lead' | 'done';

interface ChatBubble {
  role: 'assistant' | 'user';
  content: string;
  widget?: FlowStep;
}

export const GuidedQuoteFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>('greeting');
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [partyType, setPartyType] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [guestCount, setGuestCount] = useState(10);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles, step]);

  // Start the flow
  useEffect(() => {
    setBubbles([
      { role: 'assistant', content: "Welcome to Premier Party Cruises! 🎉\n\nWhat type of event are you planning?", widget: 'party_type' },
    ]);
    setStep('party_type');
  }, []);

  const addBubble = (bubble: ChatBubble) => {
    setBubbles(prev => [...prev, bubble]);
  };

  const handlePartyType = (typeId: string) => {
    const type = PARTY_TYPES.find(t => t.id === typeId);
    addBubble({ role: 'user', content: `${type?.emoji} ${type?.label}` });
    setPartyType(typeId);
    setTimeout(() => {
      addBubble({ role: 'assistant', content: `${type?.label} — great choice! 🙌\n\nWhat date are you looking at?`, widget: 'date' });
      setStep('date');
    }, 300);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setEventDate(date);
    const dayName = DAYS[getDay(date)];
    addBubble({ role: 'user', content: format(date, 'EEEE, MMMM do, yyyy') });
    setTimeout(() => {
      addBubble({ role: 'assistant', content: `${dayName}, ${format(date, 'MMM d')} — got it! 📅\n\nHow many guests?`, widget: 'guest_count' });
      setStep('guest_count');
    }, 300);
  };

  const handleGuestCountConfirm = () => {
    addBubble({ role: 'user', content: `${guestCount} guests` });
    const dayName = eventDate ? DAYS[getDay(eventDate)] : '';
    const isBach = ['bachelorette_party', 'bachelor_party', 'combined_bach'].includes(partyType);
    const isWeekend = eventDate ? [5, 6].includes(getDay(eventDate)) : false;

    // Build availability preview
    let availText = `**Here's what I found for ${guestCount} guests on ${dayName}:**\n\n`;

    if (isBach && isWeekend) {
      availText += "🪩 **ATX Disco Cruise** (March-October)\n";
      availText += "• Friday: 12-4 PM — $95/person\n";
      availText += "• Saturday AM: 11 AM-3 PM — $105/person\n";
      availText += "• Saturday PM: 3:30-7:30 PM — $85/person\n\n";
    }

    let boat = 'Day Tripper';
    if (guestCount > 30) boat = 'Clever Girl';
    else if (guestCount > 14) boat = 'Meeseeks / The Irony';

    const rates: Record<string, number> = {};
    if (guestCount <= 14) {
      rates['Mon-Thu'] = 200; rates['Friday'] = 225; rates['Saturday'] = 350; rates['Sunday'] = 225;
    } else if (guestCount <= 25) {
      rates['Mon-Thu'] = 250; rates['Friday'] = 250; rates['Saturday'] = 375; rates['Sunday'] = 250;
    } else if (guestCount <= 30) {
      rates['Mon-Thu'] = 300; rates['Friday'] = 300; rates['Saturday'] = 425; rates['Sunday'] = 300;
    } else if (guestCount <= 50) {
      rates['Mon-Thu'] = 300; rates['Friday'] = 300; rates['Saturday'] = 400; rates['Sunday'] = 300;
    } else {
      rates['Mon-Thu'] = 400; rates['Friday'] = 400; rates['Saturday'] = 500; rates['Sunday'] = 400;
    }

    availText += `🚤 **Private Cruise** on **${boat}**\n`;
    Object.entries(rates).forEach(([day, rate]) => {
      availText += `• ${day}: $${rate}/hr\n`;
    });
    availText += `\nReady to see your full personalized quote with live availability?`;

    setTimeout(() => {
      addBubble({ role: 'assistant', content: availText, widget: 'availability' });
      setStep('availability');
    }, 400);
  };

  const handleGetQuote = () => {
    addBubble({ role: 'user', content: "Yes, get my quote! 🎯" });
    setTimeout(() => {
      addBubble({ role: 'assistant', content: "Awesome! To build your personalized quote with:\n\n💰 **$150 OFF** if you book by March 24th\n🍹 Free drink & ice delivery\n📅 Real-time availability calendar\n\nWhat's your **first name**?", widget: 'contact_first' });
      setStep('contact_first');
    }, 300);
  };

  const handleFirstName = () => {
    if (!firstName.trim()) return;
    addBubble({ role: 'user', content: firstName });
    setTimeout(() => {
      addBubble({ role: 'assistant', content: `Hi ${firstName}! 👋 What's your **last name**?`, widget: 'contact_last' });
      setStep('contact_last');
    }, 200);
  };

  const handleLastName = () => {
    if (!lastName.trim()) return;
    addBubble({ role: 'user', content: lastName });
    setTimeout(() => {
      addBubble({ role: 'assistant', content: `What's the best **email** to send your quote to?`, widget: 'contact_email' });
      setStep('contact_email');
    }, 200);
  };

  const handleEmail = () => {
    if (!email.trim()) return;
    addBubble({ role: 'user', content: email });
    setTimeout(() => {
      addBubble({ role: 'assistant', content: `Last one — what's your **phone number**?`, widget: 'contact_phone' });
      setStep('contact_phone');
    }, 200);
  };

  const handlePhone = async () => {
    if (!phone.trim()) return;
    addBubble({ role: 'user', content: phone });
    setStep('creating_lead');
    setIsCreating(true);

    try {
      const formattedDate = eventDate ? format(eventDate, 'yyyy-MM-dd') : '';
      const partyLabel = PARTY_TYPES.find(t => t.id === partyType)?.label || partyType;
      const quoteUrl = `https://booking.premierpartycruises.com/?date=${formattedDate}&type=${partyType}&guests=${guestCount}`;

      const { data, error } = await supabase.functions.invoke('create-lead', {
        body: {
          firstName,
          lastName,
          email,
          phone,
          eventDate: formattedDate,
          partyType: partyLabel,
          guestCount,
          quoteUrl,
          sourceType: 'chat_guided_flow',
          sourceUrl: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.leadId) setLeadId(data.leadId);

      setTimeout(() => {
        addBubble({
          role: 'assistant',
          content: `🎉 **Your quote is ready, ${firstName}!**\n\nI've created your personalized quote with all available time slots and pricing.\n\n✅ Quote #${data?.quoteNumber || 'generated'}\n✅ Sent to ${email}\n✅ $150 OFF expires in 10 days\n\nClick below to view your full quote and book online!`,
          widget: 'done',
        });
        setStep('done');
      }, 400);

      toast({ title: 'Lead created!', description: `Quote ${data?.quoteNumber} for ${firstName} ${lastName}` });
    } catch (err) {
      console.error('Create lead error:', err);
      addBubble({ role: 'assistant', content: '❌ Something went wrong creating your quote. Please try again.' });
      setStep('contact_phone');
      toast({ title: 'Error', description: 'Failed to create lead', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const openLeadDashboard = () => {
    if (!leadId) {
      toast({ title: 'Error', description: 'No lead ID found', variant: 'destructive' });
      return;
    }
    navigate(`/lead-dashboard?lead=${leadId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {bubbles.map((bubble, i) => (
          <div key={i}>
            {/* Message bubble */}
            <div className={`flex ${bubble.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                bubble.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              }`}>
                {bubble.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1 [&>ol]:mb-1 whitespace-pre-line">
                    {bubble.content.split('\n').map((line, li) => {
                      if (line.startsWith('**') && line.endsWith('**')) return <p key={li} className="font-bold">{line.replace(/\*\*/g, '')}</p>;
                      if (line.startsWith('• ')) return <p key={li} className="ml-2">{line}</p>;
                      return <p key={li}>{line.replace(/\*\*/g, '')}</p>;
                    })}
                  </div>
                ) : (
                  <p className="leading-relaxed">{bubble.content}</p>
                )}
              </div>
            </div>

            {/* Inline widgets — only show for the LAST assistant message that has a widget */}
            {bubble.role === 'assistant' && bubble.widget && i === bubbles.length - 1 && (
              <div className="mt-3 ml-1">
                {/* Party Type Buttons */}
                {bubble.widget === 'party_type' && step === 'party_type' && (
                  <div className="grid grid-cols-2 gap-2 max-w-md">
                    {PARTY_TYPES.map(type => (
                      <Button
                        key={type.id}
                        variant="outline"
                        className="h-auto py-2.5 px-3 text-xs justify-start gap-2 hover:bg-primary/10 hover:border-primary transition-all"
                        onClick={() => handlePartyType(type.id)}
                      >
                        <span className="text-base">{type.emoji}</span>
                        <span className="text-left leading-tight">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                )}

                {/* Date Picker */}
                {bubble.widget === 'date' && step === 'date' && (
                  <div className="bg-card border rounded-xl p-2 inline-block shadow-sm">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </div>
                )}

                {/* Guest Count Slider */}
                {bubble.widget === 'guest_count' && step === 'guest_count' && (
                  <div className="max-w-sm space-y-3 bg-card border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Guests</span>
                      <Badge variant="secondary" className="text-lg font-bold px-3">{guestCount}</Badge>
                    </div>
                    <Slider
                      value={[guestCount]}
                      onValueChange={v => setGuestCount(v[0])}
                      min={1}
                      max={75}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1</span>
                      <span>14</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[6, 10, 15, 20, 25, 30, 40, 50].map(n => (
                        <Button key={n} size="sm" variant={guestCount === n ? 'default' : 'outline'} className="text-xs h-7 px-2.5" onClick={() => setGuestCount(n)}>
                          {n}
                        </Button>
                      ))}
                    </div>
                    <Button className="w-full mt-2" onClick={handleGuestCountConfirm}>
                      Confirm {guestCount} Guests →
                    </Button>
                  </div>
                )}

                {/* Availability + Get Quote CTA */}
                {bubble.widget === 'availability' && step === 'availability' && (
                  <div className="max-w-sm">
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 gap-2 animate-pulse"
                      onClick={handleGetQuote}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Get My Quote & See Availability
                    </Button>
                  </div>
                )}

                {/* Contact fields - one at a time */}
                {bubble.widget === 'contact_first' && step === 'contact_first' && (
                  <div className="max-w-xs flex gap-2">
                    <Input
                      placeholder="First name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleFirstName()}
                      autoFocus
                      className="text-sm"
                    />
                    <Button onClick={handleFirstName} disabled={!firstName.trim()}>→</Button>
                  </div>
                )}
                {bubble.widget === 'contact_last' && step === 'contact_last' && (
                  <div className="max-w-xs flex gap-2">
                    <Input
                      placeholder="Last name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLastName()}
                      autoFocus
                      className="text-sm"
                    />
                    <Button onClick={handleLastName} disabled={!lastName.trim()}>→</Button>
                  </div>
                )}
                {bubble.widget === 'contact_email' && step === 'contact_email' && (
                  <div className="max-w-xs flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEmail()}
                      autoFocus
                      className="text-sm"
                    />
                    <Button onClick={handleEmail} disabled={!email.trim()}>→</Button>
                  </div>
                )}
                {bubble.widget === 'contact_phone' && step === 'contact_phone' && (
                  <div className="max-w-xs flex gap-2">
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePhone()}
                      autoFocus
                      className="text-sm"
                    />
                    <Button onClick={() => handlePhone()} disabled={!phone.trim() || isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : '→'}
                    </Button>
                  </div>
                )}

                {/* Creating lead spinner */}
                {step === 'creating_lead' && bubble.widget === 'contact_phone' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating your quote...
                  </div>
                )}

                {/* Done — View Dashboard */}
                {bubble.widget === 'done' && step === 'done' && (
                  <div className="max-w-sm">
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 gap-2"
                      onClick={openLeadDashboard}
                    >
                      <Check className="h-4 w-4" /> View My Quote & Book Online
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default GuidedQuoteFlow;
