import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/quote-app/components/ui/card';
import { Button } from '@/quote-app/components/ui/button';
import { Input } from '@/quote-app/components/ui/input';
import { Textarea } from '@/quote-app/components/ui/textarea';
import { Badge } from '@/quote-app/components/ui/badge';
import { ScrollArea } from '@/quote-app/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/quote-app/components/ui/tabs';
import { Switch } from '@/quote-app/components/ui/switch';
import { Label } from '@/quote-app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/quote-app/components/ui/select';
import { Slider } from '@/quote-app/components/ui/slider';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquare, Send, Users, Clock, Globe, Eye, RefreshCw, 
  Settings, Zap, Trash2, Copy, ExternalLink, Plus,
  Target, MousePointerClick, ScrollText, LogOut,
  Layers, Edit2, Check, X, Bot, BookOpen, Save,
  RotateCcw, Sparkles
} from 'lucide-react';
import { useToast } from '@/quote-app/hooks/use-toast';
import { format } from 'date-fns';
import GuidedQuoteFlow from '@/quote-app/components/chat/GuidedQuoteFlow';

// ─── Types ───
interface Conversation {
  id: string;
  visitor_id: string;
  lead_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  domain: string | null;
  page_url: string | null;
  ip_address: string | null;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  engagement_score: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface VisitorSession {
  id: string;
  visitor_id: string;
  domain: string;
  page_url: string | null;
  total_seconds: number;
  page_views: number;
  max_scroll_depth: number;
  is_active: boolean;
  last_activity_at: string;
  ip_address: string | null;
  created_at: string;
}

interface WidgetRule {
  id: string;
  name: string;
  enabled: boolean;
  domain: string | null;
  page_path_pattern: string | null;
  visitor_type: string;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  prompt_message: string | null;
  cta_text: string | null;
  cta_url: string | null;
  priority: number;
  max_shows_per_session: number;
  created_at: string;
  updated_at: string;
}

import type { KnowledgeEntry } from '@/quote-app/lib/chatbotKnowledge';
import { KNOWLEDGE_CATEGORIES, DEFAULT_SYSTEM_PROMPT, SEED_KNOWLEDGE } from '@/quote-app/lib/chatbotKnowledge';

interface QuickReplyButton {
  label: string;
  action: 'ask' | 'navigate' | 'lead_capture';
  value: string;
}

interface TestMsg {
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: QuickReplyButton[];
}

const TRIGGER_ICONS: Record<string, any> = {
  delay: Clock,
  scroll_depth: ScrollText,
  button_click: MousePointerClick,
  exit_intent: LogOut,
  page_count: Layers,
};

const TRIGGER_LABELS: Record<string, string> = {
  delay: 'Time Delay',
  scroll_depth: 'Scroll Depth',
  button_click: 'Button Click',
  exit_intent: 'Exit Intent',
  page_count: 'Page Count',
};

const VISITOR_LABELS: Record<string, string> = {
  all: 'All Visitors',
  new: 'New Visitors Only',
  returning: 'Returning Visitors Only',
};

const ACTION_LABELS: Record<string, string> = {
  prompt: 'Show Prompt Bubble',
  open_chat: 'Open Chat Window',
  show_link: 'Show Link',
  show_cta: 'Show CTA Button',
};

// ─── Rule Editor Component ───
const RuleEditor = ({ rule, onSave, onCancel }: { rule: Partial<WidgetRule>; onSave: (r: Partial<WidgetRule>) => void; onCancel: () => void }) => {
  const [form, setForm] = useState<Partial<WidgetRule>>({ ...rule });
  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Rule Name</Label>
          <Input value={form.name || ''} onChange={e => update('name', e.target.value)} placeholder="e.g. Homepage Welcome" />
        </div>
        <div>
          <Label className="text-xs">Priority (higher = first)</Label>
          <Input type="number" value={form.priority || 0} onChange={e => update('priority', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Domain (blank = all)</Label>
          <Input value={form.domain || ''} onChange={e => update('domain', e.target.value || null)} placeholder="premierpartycruises.com" />
        </div>
        <div>
          <Label className="text-xs">Page Path Pattern</Label>
          <Input value={form.page_path_pattern || ''} onChange={e => update('page_path_pattern', e.target.value || null)} placeholder="/quote*, /pricing, /" />
        </div>
        <div>
          <Label className="text-xs">Visitor Type</Label>
          <Select value={form.visitor_type || 'all'} onValueChange={v => update('visitor_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(VISITOR_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Trigger</Label>
          <Select value={form.trigger_type || 'delay'} onValueChange={v => update('trigger_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">
            {form.trigger_type === 'delay' ? 'Seconds' : 
             form.trigger_type === 'scroll_depth' ? 'Scroll %' :
             form.trigger_type === 'button_click' ? 'CSS Selector' :
             form.trigger_type === 'page_count' ? '# Pages' : 'Value'}
          </Label>
          <Input value={form.trigger_value || ''} onChange={e => update('trigger_value', e.target.value)} placeholder={form.trigger_type === 'exit_intent' ? '(none needed)' : ''} />
        </div>
        <div>
          <Label className="text-xs">Action</Label>
          <Select value={form.action_type || 'prompt'} onValueChange={v => update('action_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Prompt Message</Label>
        <Textarea value={form.prompt_message || ''} onChange={e => update('prompt_message', e.target.value)} placeholder="Need help planning your cruise? 🎉" rows={2} />
      </div>

      {(form.action_type === 'show_link' || form.action_type === 'show_cta') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">CTA Button Text</Label>
            <Input value={form.cta_text || ''} onChange={e => update('cta_text', e.target.value)} placeholder="Get a Quote" />
          </div>
          <div>
            <Label className="text-xs">CTA URL</Label>
            <Input value={form.cta_url || ''} onChange={e => update('cta_url', e.target.value)} placeholder="https://booking.premierpartycruises.com/quote" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Max Shows Per Session</Label>
          <Input type="number" value={form.max_shows_per_session || 1} onChange={e => update('max_shows_per_session', parseInt(e.target.value) || 1)} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled !== false} onCheckedChange={v => update('enabled', v)} />
            <Label className="text-xs">Enabled</Label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} className="gap-1"><Check className="h-3 w-3" /> Save Rule</Button>
        <Button variant="outline" onClick={onCancel} className="gap-1"><X className="h-3 w-3" /> Cancel</Button>
      </div>
    </div>
  );
};

// ─── AI Chat Test Component ───
const AIChatTest = () => {
  const { toast } = useToast();
  const [testMessages, setTestMessages] = useState<TestMsg[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReplyButton[]>([]);
  const [visitorType, setVisitorType] = useState<'new' | 'returning' | 'booked'>('new');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptDraft, setSystemPromptDraft] = useState('');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbContent, setNewKbContent] = useState('');
  const [newKbCategory, setNewKbCategory] = useState('general');
  const [kbCategoryFilter, setKbCategoryFilter] = useState('all');
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  const [maxTokens, setMaxTokens] = useState(800);
  const [temperature, setTemperature] = useState(0.7);
  const [savedConversations, setSavedConversations] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'prompt' | 'knowledge' | 'settings' | 'history'>('chat');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig();
    loadSavedConversations();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testMessages]);

  const loadConfig = async () => {
    const { data } = await supabase.from('ai_chatbot_config').select('*');
    if (data) {
      data.forEach((row: any) => {
        if (row.key === 'system_prompt') {
          const val = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
          setSystemPrompt(val);
          setSystemPromptDraft(val);
        }
        if (row.key === 'knowledge_base') {
          setKnowledgeEntries(Array.isArray(row.value) ? row.value : []);
        }
        if (row.key === 'ai_settings') {
          setAiModel(row.value.model || 'google/gemini-2.5-flash');
          setMaxTokens(row.value.max_tokens || 800);
          setTemperature(row.value.temperature ?? 0.7);
        }
      });
    }
  };

  const loadSavedConversations = async () => {
    const { data } = await supabase
      .from('ai_test_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setSavedConversations(data);
  };

  const saveSystemPrompt = async () => {
    const { error } = await supabase.from('ai_chatbot_config').upsert({ key: 'system_prompt', value: systemPromptDraft as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    setSystemPrompt(systemPromptDraft);
    toast({ title: 'System prompt saved!' });
  };

  const saveKnowledgeBase = async () => {
    const { error } = await supabase.from('ai_chatbot_config').upsert({ key: 'knowledge_base', value: knowledgeEntries as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Knowledge base saved!' });
  };

  const saveAiSettings = async () => {
    const { error } = await supabase.from('ai_chatbot_config').upsert({ key: 'ai_settings', value: { model: aiModel, max_tokens: maxTokens, temperature } as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'AI settings saved!' });
  };

  const addKnowledgeEntry = () => {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    const entry: KnowledgeEntry = { id: crypto.randomUUID(), title: newKbTitle.trim(), content: newKbContent.trim(), category: newKbCategory };
    setKnowledgeEntries(prev => [...prev, entry]);
    setNewKbTitle('');
    setNewKbContent('');
  };

  const seedKnowledge = async () => {
    const merged = [...knowledgeEntries];
    for (const seed of SEED_KNOWLEDGE) {
      if (!merged.some(e => e.id === seed.id)) merged.push(seed);
    }
    setKnowledgeEntries(merged);
    // Also set system prompt if empty
    if (!systemPrompt || systemPrompt.length < 50) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setSystemPromptDraft(DEFAULT_SYSTEM_PROMPT);
      await supabase.from('ai_chatbot_config').upsert({ key: 'system_prompt', value: DEFAULT_SYSTEM_PROMPT as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    await supabase.from('ai_chatbot_config').upsert({ key: 'knowledge_base', value: merged as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    toast({ title: `Seeded ${SEED_KNOWLEDGE.length} knowledge entries & system prompt!` });
  };

  const removeKnowledgeEntry = (id: string) => {
    setKnowledgeEntries(prev => prev.filter(e => e.id !== id));
  };

  const sendTestMessage = async (overrideInput?: string) => {
    const inputText = overrideInput || testInput.trim();
    if (!inputText || isStreaming) return;
    const userMsg: TestMsg = { role: 'user', content: inputText };
    const updatedMessages = [...testMessages, userMsg];
    setTestMessages(updatedMessages);
    setTestInput('');
    setIsStreaming(true);
    setQuickReplies([]);

    let assistantContent = '';
    let toolCallArgs = '';

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          systemPromptOverride: systemPrompt,
          knowledgeEntries,
          model: aiModel,
          maxTokens,
          temperature,
          visitorContext: { type: visitorType },
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
        setTestMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      };

      const applyQuickReplies = (buttons: QuickReplyButton[]) => {
        setQuickReplies(buttons);
        setTestMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, quickReplies: buttons } : m);
          }
          return prev;
        });
      };

      const processSSELine = (line: string): boolean | 'requeue' => {
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') return false;
        if (!line.startsWith('data: ')) return false;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          const delta = choice?.delta;
          if (delta?.content) upsertAssistant(delta.content);
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
            }
          }
          if (choice?.finish_reason === 'tool_calls' || choice?.finish_reason === 'stop') {
            if (toolCallArgs) {
              try {
                const p = JSON.parse(toolCallArgs);
                if (p.buttons && Array.isArray(p.buttons)) applyQuickReplies(p.buttons);
              } catch { /* partial */ }
            }
          }
        } catch {
          return 'requeue';
        }
        return false;
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
          const result = processSSELine(line);
          if (result === true) { streamDone = true; break; }
          if (result === 'requeue') { textBuffer = line + '\n' + textBuffer; break; }
        }
      }

      if (textBuffer.trim()) {
        for (const raw of textBuffer.split('\n')) {
          if (!raw) continue;
          processSSELine(raw);
        }
      }

      // Final attempt to parse tool args
      if (toolCallArgs && quickReplies.length === 0) {
        try {
          const p = JSON.parse(toolCallArgs);
          if (p.buttons && Array.isArray(p.buttons)) applyQuickReplies(p.buttons);
        } catch { /* ignore */ }
      }
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleQuickReply = (button: QuickReplyButton) => {
    if (button.action === 'navigate') {
      window.open(button.value, '_blank');
    } else {
      sendTestMessage(button.value || button.label);
    }
  };

  const clearChat = () => setTestMessages([]);

  const saveConversation = async () => {
    if (testMessages.length === 0) return;
    const name = `Test ${format(new Date(), 'MMM d, h:mm a')}`;
    await supabase.from('ai_test_conversations').insert({ name, messages: testMessages as any });
    toast({ title: 'Conversation saved!' });
    loadSavedConversations();
  };

  const loadConversation = (conv: any) => {
    setTestMessages(conv.messages || []);
    setActiveSubTab('chat');
    toast({ title: `Loaded: ${conv.name}` });
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('ai_test_conversations').delete().eq('id', id);
    loadSavedConversations();
  };

  const MODEL_OPTIONS = [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (best)' },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'openai/gpt-5', label: 'GPT-5 (premium)' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Left sidebar - config subtabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {(['chat', 'prompt', 'knowledge', 'settings', 'history'] as const).map(tab => (
            <Button key={tab} size="sm" variant={activeSubTab === tab ? 'default' : 'outline'} onClick={() => setActiveSubTab(tab)} className="text-xs capitalize">
              {tab === 'chat' && <Bot className="h-3 w-3 mr-1" />}
              {tab === 'prompt' && <Edit2 className="h-3 w-3 mr-1" />}
              {tab === 'knowledge' && <BookOpen className="h-3 w-3 mr-1" />}
              {tab === 'settings' && <Settings className="h-3 w-3 mr-1" />}
              {tab === 'history' && <Clock className="h-3 w-3 mr-1" />}
              {tab}
            </Button>
          ))}
        </div>

        {/* System Prompt Editor */}
        {activeSubTab === 'prompt' && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Edit2 className="h-4 w-4" /> System Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">This is the core instruction given to the AI. Edit it to change the bot's personality, knowledge, and behavior.</p>
              <Textarea
                value={systemPromptDraft}
                onChange={e => setSystemPromptDraft(e.target.value)}
                rows={20}
                className="text-xs font-mono"
                placeholder="You are a helpful assistant..."
              />
              <div className="flex gap-2">
                <Button onClick={saveSystemPrompt} className="gap-1 flex-1"><Save className="h-3 w-3" /> Save Prompt</Button>
                <Button variant="outline" onClick={() => setSystemPromptDraft(systemPrompt)} className="gap-1"><RotateCcw className="h-3 w-3" /> Reset</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">{systemPromptDraft.length} characters</p>
            </CardContent>
          </Card>
        )}

        {/* Knowledge Base */}
        {activeSubTab === 'knowledge' && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Knowledge Base</span>
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={seedKnowledge}>
                  <Sparkles className="h-3 w-3" /> Seed All Data
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Category filter tabs */}
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant={kbCategoryFilter === 'all' ? 'default' : 'outline'} onClick={() => setKbCategoryFilter('all')} className="text-[10px] h-6 px-2">
                  All ({knowledgeEntries.length})
                </Button>
                {KNOWLEDGE_CATEGORIES.map(cat => {
                  const count = knowledgeEntries.filter(e => (e.category || 'general') === cat.id).length;
                  if (count === 0 && kbCategoryFilter !== cat.id) return null;
                  return (
                    <Button key={cat.id} size="sm" variant={kbCategoryFilter === cat.id ? 'default' : 'outline'} onClick={() => setKbCategoryFilter(cat.id)} className="text-[10px] h-6 px-2">
                      {cat.icon} {cat.label} ({count})
                    </Button>
                  );
                })}
              </div>

              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {knowledgeEntries
                    .filter(e => kbCategoryFilter === 'all' || (e.category || 'general') === kbCategoryFilter)
                    .map(entry => (
                    <div key={entry.id} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-xs">{entry.title}</p>
                            {entry.category && (
                              <Badge variant="outline" className="text-[9px] h-4">{KNOWLEDGE_CATEGORIES.find(c => c.id === entry.category)?.icon} {entry.category}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeKnowledgeEntry(entry.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newKbTitle} onChange={e => setNewKbTitle(e.target.value)} placeholder="Topic title" className="text-xs" />
                  <Select value={newKbCategory} onValueChange={setNewKbCategory}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.icon} {cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={newKbContent} onChange={e => setNewKbContent(e.target.value)} placeholder="Content the AI should know..." rows={4} className="text-xs" />
                <Button onClick={addKnowledgeEntry} disabled={!newKbTitle.trim() || !newKbContent.trim()} className="gap-1 w-full text-xs"><Plus className="h-3 w-3" /> Add Entry</Button>
              </div>

              <Button onClick={saveKnowledgeBase} className="w-full gap-1"><Save className="h-3 w-3" /> Save Knowledge Base</Button>
              <p className="text-[10px] text-muted-foreground">{knowledgeEntries.length} entries across {new Set(knowledgeEntries.map(e => e.category || 'general')).size} categories</p>
            </CardContent>
          </Card>
        )}

        {/* AI Settings */}
        {activeSubTab === 'settings' && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> AI Model Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Model</Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Max Tokens: {maxTokens}</Label>
                <Slider value={[maxTokens]} onValueChange={v => setMaxTokens(v[0])} min={200} max={4000} step={100} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Temperature: {temperature.toFixed(1)}</Label>
                <Slider value={[temperature * 10]} onValueChange={v => setTemperature(v[0] / 10)} min={0} max={20} step={1} className="mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Lower = more focused, Higher = more creative</p>
              </div>
              <Button onClick={saveAiSettings} className="w-full gap-1"><Save className="h-3 w-3" /> Save Settings</Button>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {activeSubTab === 'history' && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Saved Test Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedConversations.map(conv => (
                <div key={conv.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="cursor-pointer flex-1" onClick={() => loadConversation(conv)}>
                      <p className="text-xs font-medium">{conv.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(conv.messages || []).length} messages • {format(new Date(conv.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteConversation(conv.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {savedConversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No saved conversations yet</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chat instructions when on chat tab */}
        {activeSubTab === 'chat' && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Live AI Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Chat with your AI bot using the <strong>current system prompt</strong> and <strong>knowledge base</strong>.</p>
              <p>• Edit the prompt in the <strong>Prompt</strong> tab</p>
              <p>• Add facts/policies in the <strong>Knowledge</strong> tab</p>
              <p>• Tune model settings in <strong>Settings</strong></p>
              <p>• Save good test conversations in <strong>History</strong></p>
              <div className="pt-2 border-t space-y-2">
                <p className="font-medium text-foreground">Test as visitor type:</p>
                <div className="flex gap-1">
                  {(['new', 'returning', 'booked'] as const).map(vt => (
                    <Button key={vt} size="sm" variant={visitorType === vt ? 'default' : 'outline'} className="text-[10px] h-6 px-2 capitalize" onClick={() => setVisitorType(vt)}>
                      {vt === 'new' ? '👋 New' : vt === 'returning' ? '🔄 Returning' : '✅ Booked'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t space-y-1">
                <p className="font-medium text-foreground">Current config:</p>
                <p>Model: <Badge variant="outline" className="text-[10px]">{MODEL_OPTIONS.find(m => m.value === aiModel)?.label || aiModel}</Badge></p>
                <p>Prompt: {systemPrompt.length} chars</p>
                <p>Knowledge: {knowledgeEntries.length} entries</p>
                <p>Temp: {temperature.toFixed(1)} • Max tokens: {maxTokens}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right side - Chat window */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="py-3 px-4 border-b flex-shrink-0">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> {showGuidedFlow ? 'New Visitor Quote Flow' : 'AI Chatbot Test'}
              {isStreaming && !showGuidedFlow && <Badge variant="secondary" className="text-[10px] animate-pulse">Streaming...</Badge>}
            </span>
            <div className="flex gap-1">
              {showGuidedFlow ? (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowGuidedFlow(false)}>
                  <RotateCcw className="h-3 w-3" /> Back to AI Chat
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={saveConversation} disabled={testMessages.length === 0}>
                    <Save className="h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={clearChat}>
                    <RotateCcw className="h-3 w-3" /> Clear
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {/* Test Flow Scenarios */}
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Test Flows:</span>
          <Button
            size="sm"
            variant={showGuidedFlow ? 'default' : 'outline'}
            className={`text-xs h-7 gap-1 ${!showGuidedFlow ? 'border-amber-400/50 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-amber-950/30' : ''}`}
            onClick={() => setShowGuidedFlow(true)}
          >
            <Target className="h-3 w-3" /> New Visitor Quote Flow
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1 border-blue-400/50 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950/30"
            onClick={() => {
              setShowGuidedFlow(false);
              setTestMessages([]);
              setQuickReplies([]);
              setVisitorType('new');
              setTimeout(() => {
                sendTestMessage("How much is a bachelorette party cruise for 15 people on a Saturday in July?");
              }, 100);
            }}
            disabled={isStreaming}
          >
            <Sparkles className="h-3 w-3 text-blue-500" /> Bach Pricing Flow
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 gap-1 border-green-400/50 hover:bg-green-50 hover:border-green-400 dark:hover:bg-green-950/30"
            onClick={() => {
              setShowGuidedFlow(false);
              setTestMessages([]);
              setQuickReplies([]);
              setVisitorType('new');
              setTimeout(() => {
                sendTestMessage("I want to book a private cruise for a birthday party with 30 people.");
              }, 100);
            }}
            disabled={isStreaming}
          >
            <Users className="h-3 w-3 text-green-500" /> Private Cruise Flow
          </Button>
        </div>

        {showGuidedFlow ? (
          <GuidedQuoteFlow />
        ) : (
          <>
            <ScrollArea className="flex-1 p-4" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 380px)' }}>
              <div className="space-y-4">
                {testMessages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Start a test conversation</p>
                    <p className="text-xs mt-1">Type a message or select a test flow above</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {['How much is a bachelorette cruise?', 'I need a boat for 20 people on Saturday', 'What packages do you offer?'].map(q => (
                        <Button key={q} size="sm" variant="outline" className="text-xs" onClick={() => { setTestInput(q); }}>
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {testMessages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>h4]:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    </div>
                    {/* Quick reply bubbles */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && i === testMessages.length - 1 && (
                      <div className="flex flex-wrap gap-2 mt-2 ml-1">
                        {msg.quickReplies.map((btn, bi) => (
                          <Button
                            key={bi}
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs border-primary/30 hover:bg-primary/10 hover:border-primary transition-all"
                            onClick={() => handleQuickReply(btn)}
                            disabled={isStreaming}
                          >
                            {btn.action === 'navigate' && <ExternalLink className="h-3 w-3 mr-1" />}
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Show latest quick replies below last message when no messages have them attached yet */}
                {quickReplies.length > 0 && !isStreaming && testMessages.length > 0 && !testMessages[testMessages.length - 1]?.quickReplies && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-1">
                    {quickReplies.map((btn, bi) => (
                      <Button
                        key={bi}
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs border-primary/30 hover:bg-primary/10 hover:border-primary transition-all"
                        onClick={() => handleQuickReply(btn)}
                      >
                        {btn.action === 'navigate' && <ExternalLink className="h-3 w-3 mr-1" />}
                        {btn.label}
                      </Button>
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <Input
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                placeholder="Type a test message..."
                className="rounded-full"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
                disabled={isStreaming}
              />
              <Button onClick={() => sendTestMessage()} disabled={!testInput.trim() || isStreaming} className="rounded-full px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

// ─── Main Component ───
const ChatTestApp = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('ai-test');
  
  // Dashboard state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeVisitors, setActiveVisitors] = useState<VisitorSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  // Rules state
  const [rules, setRules] = useState<WidgetRule[]>([]);
  const [editingRule, setEditingRule] = useState<Partial<WidgetRule> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Settings state
  const [widgetColor, setWidgetColor] = useState('#7c3aed');
  const [companyName, setCompanyName] = useState('Premier Party Cruises');
  const [subtitle, setSubtitle] = useState('We typically reply within minutes');
  const [enabledDomains, setEnabledDomains] = useState<string[]>(['premierpartycruises.com', 'booking.premierpartycruises.com', 'ppc-quote-builder.lovable.app']);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  // ─── Data Loading ───
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('chat-widget-messages', {
        body: { action: 'list_conversations' },
      });
      if (data?.conversations) setConversations(data.conversations);
    } catch (e) { console.error('Error loading conversations:', e); }
  }, []);

  const loadActiveVisitors = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })
        .limit(50);
      if (data) setActiveVisitors(data as VisitorSession[]);
    } catch (e) { console.error('Error loading visitors:', e); }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data } = await supabase.functions.invoke('chat-widget-messages', {
        body: { action: 'get_messages', conversationId },
      });
      if (data?.messages) {
        setMessages(data.messages);
        await supabase.functions.invoke('chat-widget-messages', {
          body: { action: 'mark_read', conversationId, senderType: 'admin' },
        });
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
      }
    } catch (e) { console.error('Error loading messages:', e); }
  }, []);

  const loadRules = useCallback(async () => {
    const { data } = await supabase
      .from('chat_widget_rules')
      .select('*')
      .order('priority', { ascending: false });
    if (data) setRules(data as WidgetRule[]);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from('chat_widget_settings')
      .select('*');
    if (data) {
      data.forEach((s: any) => {
        if (s.key === 'appearance') {
          setWidgetColor(s.value.color || '#7c3aed');
          setCompanyName(s.value.companyName || 'Premier Party Cruises');
          setSubtitle(s.value.subtitle || '');
        }
        if (s.key === 'domains') {
          setEnabledDomains(s.value.enabled || []);
        }
        if (s.key === 'global') {
          setChatEnabled(s.value.chatEnabled !== false);
          setTrackingEnabled(s.value.trackingEnabled !== false);
        }
      });
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadActiveVisitors();
    loadRules();
    loadSettings();
    pollRef.current = window.setInterval(() => {
      loadConversations();
      loadActiveVisitors();
      if (selectedConv) loadMessages(selectedConv.id);
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Rule CRUD ───
  const saveRule = async (rule: Partial<WidgetRule>) => {
    if (!rule.name) { toast({ title: 'Rule name is required', variant: 'destructive' }); return; }
    
    if (rule.id) {
      const { error } = await supabase.from('chat_widget_rules').update({
        name: rule.name, enabled: rule.enabled, domain: rule.domain,
        page_path_pattern: rule.page_path_pattern, visitor_type: rule.visitor_type,
        trigger_type: rule.trigger_type, trigger_value: rule.trigger_value,
        action_type: rule.action_type, prompt_message: rule.prompt_message,
        cta_text: rule.cta_text, cta_url: rule.cta_url, priority: rule.priority,
        max_shows_per_session: rule.max_shows_per_session, updated_at: new Date().toISOString(),
      }).eq('id', rule.id);
      if (error) { toast({ title: 'Error saving rule', variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('chat_widget_rules').insert({
        name: rule.name, enabled: rule.enabled !== false, domain: rule.domain || null,
        page_path_pattern: rule.page_path_pattern || null, visitor_type: rule.visitor_type || 'all',
        trigger_type: rule.trigger_type || 'delay', trigger_value: rule.trigger_value || '15',
        action_type: rule.action_type || 'prompt', prompt_message: rule.prompt_message || '',
        cta_text: rule.cta_text || null, cta_url: rule.cta_url || null,
        priority: rule.priority || 0, max_shows_per_session: rule.max_shows_per_session || 1,
      });
      if (error) { toast({ title: 'Error creating rule', variant: 'destructive' }); return; }
    }
    toast({ title: 'Rule saved!' });
    setEditingRule(null); setIsCreating(false); loadRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from('chat_widget_rules').delete().eq('id', id);
    toast({ title: 'Rule deleted' }); loadRules();
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    await supabase.from('chat_widget_rules').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id);
    loadRules();
  };

  // ─── Settings Save ───
  const saveSettings = async () => {
    await Promise.all([
      supabase.from('chat_widget_settings').update({ value: { color: widgetColor, companyName, subtitle }, updated_at: new Date().toISOString() }).eq('key', 'appearance'),
      supabase.from('chat_widget_settings').update({ value: { enabled: enabledDomains }, updated_at: new Date().toISOString() }).eq('key', 'domains'),
      supabase.from('chat_widget_settings').update({ value: { chatEnabled, trackingEnabled }, updated_at: new Date().toISOString() }).eq('key', 'global'),
    ]);
    toast({ title: 'Settings saved!' });
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv) return;
    const text = replyText.trim(); setReplyText('');
    try {
      await supabase.functions.invoke('chat-widget-messages', {
        body: { action: 'send_message', conversationId: selectedConv.id, visitorId: selectedConv.visitor_id, content: text, senderType: 'admin', senderName: companyName },
      });
      loadMessages(selectedConv.id); loadConversations();
      toast({ title: 'Reply sent!' });
    } catch { toast({ title: 'Error sending message', variant: 'destructive' }); }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const SUPABASE_URL = 'https://tgambsdjfwgoohkqopns.supabase.co';
  const embedScript = `<script src="${SUPABASE_URL}/functions/v1/chat-widget-script" async></script>`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">PPC Chat & AI Assistant</h1>
                <p className="text-xs text-muted-foreground">AI Training • Rules Engine • Live Chat • Tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {totalUnread > 0 && <Badge className="bg-red-500 text-white">{totalUnread} unread</Badge>}
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {activeVisitors.length} online
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="ai-test" className="gap-2"><Bot className="h-4 w-4" /> AI Chatbot</TabsTrigger>
            <TabsTrigger value="rules" className="gap-2"><Target className="h-4 w-4" /> Rules & Prompts</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2"><MessageSquare className="h-4 w-4" /> Live Chat {totalUnread > 0 && <Badge className="bg-red-500 text-white text-[10px] h-4 ml-1">{totalUnread}</Badge>}</TabsTrigger>
            <TabsTrigger value="visitors" className="gap-2"><Users className="h-4 w-4" /> Visitors</TabsTrigger>
            <TabsTrigger value="embed" className="gap-2"><Copy className="h-4 w-4" /> Embed</TabsTrigger>
            <TabsTrigger value="ghl-setup" className="gap-2"><ExternalLink className="h-4 w-4" /> GHL Setup</TabsTrigger>
          </TabsList>

          {/* ─── AI Test Tab ─── */}
          <TabsContent value="ai-test">
            <AIChatTest />
          </TabsContent>

          {/* ─── Rules Tab ─── */}
          <TabsContent value="rules">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Widget Rules</h2>
                  <p className="text-sm text-muted-foreground">Configure per-page prompts, behavioral triggers, and outreach messages.</p>
                </div>
                <Button onClick={() => { setIsCreating(true); setEditingRule({ enabled: true, visitor_type: 'all', trigger_type: 'delay', trigger_value: '15', action_type: 'prompt', priority: 0, max_shows_per_session: 1 }); }} className="gap-2">
                  <Plus className="h-4 w-4" /> New Rule
                </Button>
              </div>
              {(isCreating && editingRule && !editingRule.id) && (
                <RuleEditor rule={editingRule} onSave={saveRule} onCancel={() => { setIsCreating(false); setEditingRule(null); }} />
              )}
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id}>
                    {editingRule?.id === rule.id ? (
                      <RuleEditor rule={editingRule} onSave={saveRule} onCancel={() => setEditingRule(null)} />
                    ) : (
                      <div className={`p-4 rounded-lg border transition-colors ${rule.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Switch checked={rule.enabled} onCheckedChange={v => toggleRule(rule.id, v)} />
                              <span className="font-medium text-sm">{rule.name}</span>
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {(() => { const Icon = TRIGGER_ICONS[rule.trigger_type] || Clock; return <Icon className="h-3 w-3" />; })()}
                                {TRIGGER_LABELS[rule.trigger_type] || rule.trigger_type}
                                {rule.trigger_value && `: ${rule.trigger_value}${rule.trigger_type === 'scroll_depth' ? '%' : rule.trigger_type === 'delay' ? 's' : ''}`}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">{VISITOR_LABELS[rule.visitor_type] || rule.visitor_type}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{ACTION_LABELS[rule.action_type] || rule.action_type}</Badge>
                              <Badge className="text-[10px] bg-primary/10 text-primary">P{rule.priority}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {rule.domain && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{rule.domain}</span>}
                              {rule.page_path_pattern && <span className="flex items-center gap-1">📄 {rule.page_path_pattern}</span>}
                              {!rule.domain && !rule.page_path_pattern && <span className="italic">All pages, all domains</span>}
                            </div>
                            {rule.prompt_message && <p className="text-xs mt-2 bg-muted p-2 rounded italic">"{rule.prompt_message}"</p>}
                            {rule.cta_text && <p className="text-xs mt-1 text-muted-foreground">CTA: {rule.cta_text} → {rule.cta_url}</p>}
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingRule(rule)}><Edit2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRule(rule.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No rules configured yet</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ─── Settings Tab ─── */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Global Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between"><Label>Chat Widget Enabled</Label><Switch checked={chatEnabled} onCheckedChange={setChatEnabled} /></div>
                  <div className="flex items-center justify-between"><Label>Visitor Tracking Enabled</Label><Switch checked={trackingEnabled} onCheckedChange={setTrackingEnabled} /></div>
                  <div>
                    <Label className="text-sm">Enabled Domains (one per line)</Label>
                    <Textarea value={enabledDomains.join('\n')} onChange={e => setEnabledDomains(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} className="mt-1 font-mono text-xs" rows={4} placeholder="premierpartycruises.com&#10;booking.premierpartycruises.com" />
                    <p className="text-xs text-muted-foreground mt-1">Widget will only appear on these domains.</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Appearance</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label className="text-sm">Company Name</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-sm">Subtitle</Label><Input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="mt-1" /></div>
                  <div>
                    <Label className="text-sm">Widget Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={widgetColor} onChange={e => setWidgetColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={widgetColor} onChange={e => setWidgetColor(e.target.value)} className="w-28" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm mb-3 block">Preview</Label>
                    <div className="relative bg-muted rounded-lg p-8 flex items-end justify-end min-h-[160px]">
                      <div className="absolute bottom-20 right-4 bg-white rounded-xl p-3 shadow-lg text-sm max-w-[220px]">Preview prompt message</div>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${widgetColor}, ${widgetColor}dd)` }}>
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="lg:col-span-2"><Button onClick={saveSettings} className="w-full" size="lg">Save All Settings</Button></div>
            </div>
          </TabsContent>

          {/* ─── Live Chat Tab ─── */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
              <Card className="flex flex-col">
                <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversations ({conversations.length})</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={loadConversations}><RefreshCw className="h-3 w-3" /></Button>
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {conversations.map(c => (
                      <div key={c.id} className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${selectedConv?.id === c.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`} onClick={() => setSelectedConv(c)}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{c.visitor_name || c.visitor_email || `Visitor ${c.visitor_id.slice(2, 10)}`}</span>
                          {c.unread_count > 0 && <Badge className="bg-red-500 text-white text-[10px] h-5 min-w-5 justify-center">{c.unread_count}</Badge>}
                        </div>
                        <p className="text-muted-foreground truncate mt-1 text-xs">{c.last_message_preview || 'No messages yet'}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{c.last_message_at ? format(new Date(c.last_message_at), 'MMM d, h:mm a') : '—'}
                          {c.domain && <><span>•</span><Globe className="h-3 w-3" />{c.domain}</>}
                        </div>
                      </div>
                    ))}
                    {conversations.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground"><MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">No conversations yet</p></div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
              <Card className="lg:col-span-2 flex flex-col">
                <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                  <CardTitle className="text-sm">
                    {selectedConv ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{selectedConv.visitor_name || selectedConv.visitor_email || `Visitor ${selectedConv.visitor_id.slice(2, 10)}`}</span>
                          {selectedConv.page_url && <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate">On: {selectedConv.page_url}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                          {selectedConv.visitor_email && <span>{selectedConv.visitor_email}</span>}
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground">Select a conversation</span>}
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground rounded-br-md' : msg.sender_type === 'system' ? 'bg-yellow-50 text-yellow-900 border border-yellow-200' : 'bg-muted rounded-bl-md'}`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className="text-[10px] opacity-50 mt-1">{msg.sender_name && <span>{msg.sender_name} • </span>}{format(new Date(msg.created_at), 'h:mm a')}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {!selectedConv && <div className="text-center py-20 text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>Select a conversation</p></div>}
                </ScrollArea>
                {selectedConv && (
                  <div className="p-3 border-t flex gap-2">
                    <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." className="rounded-full" onKeyPress={e => { if (e.key === 'Enter') sendReply(); }} />
                    <Button onClick={sendReply} disabled={!replyText.trim()} className="rounded-full px-4"><Send className="h-4 w-4" /></Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* ─── Visitors Tab ─── */}
          <TabsContent value="visitors">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 text-sm font-medium"><span className="w-2 h-2 rounded-full bg-green-500" />Active Now</div><p className="text-3xl font-bold mt-1">{activeVisitors.length}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-blue-500" />Open Chats</div><p className="text-3xl font-bold mt-1">{conversations.filter(c => c.status === 'active').length}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 text-sm font-medium"><Eye className="h-4 w-4 text-orange-500" />Unread</div><p className="text-3xl font-bold mt-1">{totalUnread}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4 text-purple-500" />Total Chats</div><p className="text-3xl font-bold mt-1">{conversations.length}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-green-500" />Active Visitors</span>
                  <Button size="sm" variant="outline" onClick={loadActiveVisitors}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeVisitors.map(v => (
                    <div key={v.id} className="p-3 rounded-lg border flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-medium text-sm">{v.ip_address || 'Unknown IP'}</span>
                          <Badge variant="outline" className="text-[10px]">{v.domain}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">{v.page_url}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{v.page_views} pages</span>
                        <span>{Math.floor(v.total_seconds / 60)}m {v.total_seconds % 60}s</span>
                        <span>↓{v.max_scroll_depth}%</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                          const conv = conversations.find(c => c.visitor_id === v.visitor_id);
                          if (conv) { setSelectedConv(conv); setActiveTab('dashboard'); }
                          else toast({ title: 'No chat started by this visitor yet' });
                        }}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                  {activeVisitors.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No active visitors</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Embed Tab ─── */}
          <TabsContent value="embed">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">📋 Install Script</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Paste before <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> on any page.</p>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all">{embedScript}</div>
                  <Button onClick={() => { navigator.clipboard.writeText(embedScript); toast({ title: 'Copied!' }); }} className="gap-2"><Copy className="h-4 w-4" /> Copy Script Tag</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">🎯 How Rules Work</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Targeting</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>✅ Per-domain filtering</li><li>✅ Page path patterns (glob: /quote*)</li>
                        <li>✅ New vs returning visitor targeting</li><li>✅ Priority-based rule ordering</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Triggers</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>⏱️ Time delay (X seconds)</li><li>📜 Scroll depth (%)</li>
                        <li>🖱️ Button click (CSS selector)</li><li>🚪 Exit intent</li><li>📄 Page count</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Actions</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>💬 Show prompt bubble</li><li>📨 Auto-open chat</li><li>🔗 Show link</li><li>🎯 Show CTA button</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Visitor Context</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>✅ Cross-session visitor ID</li><li>✅ New vs returning detection</li>
                        <li>✅ Max shows per session</li><li>✅ Quote number auto-linking</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">🧪 Test</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" asChild><a href="https://booking.premierpartycruises.com" target="_blank" rel="noopener noreferrer" className="gap-2"><ExternalLink className="h-4 w-4" /> Booking Site</a></Button>
                    <Button variant="outline" asChild><a href="https://premierpartycruises.com" target="_blank" rel="noopener noreferrer" className="gap-2"><ExternalLink className="h-4 w-4" /> Main Site</a></Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── GHL Setup Tab ─── */}
          <TabsContent value="ghl-setup">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">🔗 Go High Level Chat Integration</CardTitle>
                  <p className="text-sm text-muted-foreground">Connect your live chat widget to Go High Level so you can reply to visitors from the GHL Conversations dashboard.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">📌 What This Does</p>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>When a visitor sends a chat message on your website → it appears in GHL as a conversation</li>
                      <li>When you reply from GHL → the visitor sees your reply in the chat widget on the website</li>
                      <li>Two-way, real-time messaging between your site and GHL</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Step 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Step 1: Create a GHL Workflow to RECEIVE Visitor Messages</CardTitle>
                  <p className="text-xs text-muted-foreground">This tells GHL "hey, a visitor just sent a message on the website"</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                      <div>
                        <p className="font-medium">Open Go High Level → Automation → Workflows</p>
                        <p className="text-muted-foreground text-xs">Click the blue "+ Create Workflow" button in the top right</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                      <div>
                        <p className="font-medium">Start from scratch → Add a trigger → pick "Inbound Webhook"</p>
                        <p className="text-muted-foreground text-xs">This creates a special URL that our chat system sends messages to</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                      <div>
                        <p className="font-medium">Copy the Webhook URL that GHL gives you</p>
                        <p className="text-muted-foreground text-xs">It looks like: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">https://services.leadconnectorhq.com/hooks/...</code></p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">4</span>
                      <div>
                        <p className="font-medium">Go to Supabase → Edge Function Secrets → add <code className="bg-muted px-1.5 py-0.5 rounded">GHL_WEBHOOK_URL</code></p>
                        <p className="text-muted-foreground text-xs">Paste that webhook URL as the value. This is already done if you see it in your secrets list.</p>
                        <Button size="sm" variant="outline" className="mt-2 text-xs gap-1" asChild>
                          <a href="https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/settings/functions" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Open Supabase Secrets
                          </a>
                        </Button>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">5</span>
                      <div>
                        <p className="font-medium">In the workflow, add actions to create/update a GHL Contact and start a Conversation</p>
                        <p className="text-muted-foreground text-xs">Map these webhook fields to GHL contact fields:</p>
                        <div className="bg-muted rounded-lg p-3 mt-2 text-xs font-mono space-y-0.5">
                          <p>{'{{visitorName}}'} → Contact Name</p>
                          <p>{'{{visitorEmail}}'} → Contact Email</p>
                          <p>{'{{visitorPhone}}'} → Contact Phone</p>
                          <p>{'{{message}}'} → Message Body</p>
                          <p>{'{{conversationId}}'} → Custom Field (save this — you need it for replies!)</p>
                          <p>{'{{replyWebhookUrl}}'} → Custom Field (the URL to send replies back)</p>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">✓</span>
                      <div>
                        <p className="font-medium text-green-700">Save & Publish the workflow!</p>
                        <p className="text-muted-foreground text-xs">Now visitor messages will show up in GHL.</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Step 2: Set Up a Reply Webhook so GHL Can Send Messages BACK</CardTitle>
                  <p className="text-xs text-muted-foreground">This tells our system "an agent replied from GHL — show it to the visitor"</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                      <div>
                        <p className="font-medium">Create ANOTHER workflow in GHL</p>
                        <p className="text-muted-foreground text-xs">Trigger: "Customer Replied" or "Conversation → Message Added" (when an AGENT sends a message)</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                      <div>
                        <p className="font-medium">Add action: "Send Webhook" (HTTP POST)</p>
                        <p className="text-muted-foreground text-xs">Point it to this URL:</p>
                        <div className="bg-muted rounded-lg p-3 mt-2 font-mono text-xs break-all">
                          https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/ghl-chat-webhook
                        </div>
                        <Button size="sm" variant="outline" className="mt-2 text-xs gap-1" onClick={() => {
                          navigator.clipboard.writeText('https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/ghl-chat-webhook');
                          toast({ title: 'Webhook URL copied!' });
                        }}>
                          <Copy className="h-3 w-3" /> Copy Webhook URL
                        </Button>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                      <div>
                        <p className="font-medium">Set the webhook body (JSON) to include these fields:</p>
                        <div className="bg-muted rounded-lg p-3 mt-2 text-xs font-mono whitespace-pre-wrap">{`{
  "message": "{{message.body}}",
  "conversationId": "{{contact.custom_field.conversationId}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "name": "{{user.name}}"
}`}</div>
                        <p className="text-muted-foreground text-xs mt-2">⚠️ The <code className="bg-muted px-1 rounded">conversationId</code> custom field is key — it must match the ID we sent in Step 1. Without it, the system falls back to email/phone matching.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">✓</span>
                      <div>
                        <p className="font-medium text-green-700">Save & Publish!</p>
                        <p className="text-muted-foreground text-xs">Now when you reply in GHL, the visitor sees it on the website in real-time.</p>
                      </div>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Step 3 - Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Step 3: Test It!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</span>
                      <p>Open your website in a new tab and click the chat bubble</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</span>
                      <p>Type "Hello, testing GHL integration" and send it</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</span>
                      <p>Go to GHL → Conversations → you should see the message</p>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">4</span>
                      <p>Reply from GHL → go back to your website → the reply should appear in the chat widget</p>
                    </li>
                  </ol>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" asChild>
                      <a href="https://premierpartycruises.com" target="_blank" rel="noopener noreferrer" className="gap-2"><ExternalLink className="h-4 w-4" /> Test on Main Site</a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="https://booking.premierpartycruises.com" target="_blank" rel="noopener noreferrer" className="gap-2"><ExternalLink className="h-4 w-4" /> Test on Booking Site</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Troubleshooting */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🛠️ Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">Messages not appearing in GHL?</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                        <li>Check that <code className="bg-background px-1 rounded">GHL_WEBHOOK_URL</code> is set in Supabase secrets</li>
                        <li>Check the Edge Function logs for errors</li>
                        <li>Make sure the GHL workflow is published (not just saved)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">GHL replies not showing on the website?</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                        <li>Make sure the reply webhook URL is exactly right (copy from above)</li>
                        <li>Check that <code className="bg-background px-1 rounded">conversationId</code> is being passed back correctly</li>
                        <li>Check the <code className="bg-background px-1 rounded">ghl-chat-webhook</code> function logs</li>
                      </ul>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                        <a href="https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/functions/chat-widget-messages/logs" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Chat Messages Logs
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                        <a href="https://supabase.com/dashboard/project/tgambsdjfwgoohkqopns/functions/ghl-chat-webhook/logs" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> GHL Webhook Logs
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatTestApp;
