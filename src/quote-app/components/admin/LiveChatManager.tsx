import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/quote-app/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/quote-app/components/ui/card';
import { Button } from '@/quote-app/components/ui/button';
import { Input } from '@/quote-app/components/ui/input';
import { Badge } from '@/quote-app/components/ui/badge';
import { ScrollArea } from '@/quote-app/components/ui/scroll-area';
import { MessageSquare, Send, Users, Clock, Globe, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/quote-app/hooks/use-toast';
import { format } from 'date-fns';

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

export function LiveChatManager() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeVisitors, setActiveVisitors] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('chat-widget-messages', {
        body: { action: 'list_conversations' },
      });
      if (data?.conversations) setConversations(data.conversations);
    } catch (e) {
      console.error('Error loading conversations:', e);
    }
  }, []);

  const loadActiveVisitors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })
        .limit(50);
      if (data) setActiveVisitors(data as VisitorSession[]);
    } catch (e) {
      console.error('Error loading visitors:', e);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data } = await supabase.functions.invoke('chat-widget-messages', {
        body: { action: 'get_messages', conversationId },
      });
      if (data?.messages) {
        setMessages(data.messages);
        // Mark as read
        await supabase.functions.invoke('chat-widget-messages', {
          body: { action: 'mark_read', conversationId, senderType: 'admin' },
        });
        // Update local unread
        setConversations(prev => prev.map(c => 
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadActiveVisitors();
    setLoading(false);

    // Poll every 5 seconds
    pollRef.current = window.setInterval(() => {
      loadConversations();
      loadActiveVisitors();
      if (selectedConv) loadMessages(selectedConv.id);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv) return;
    const text = replyText.trim();
    setReplyText('');

    try {
      await supabase.functions.invoke('chat-widget-messages', {
        body: {
          action: 'send_message',
          conversationId: selectedConv.id,
          visitorId: selectedConv.visitor_id,
          content: text,
          senderType: 'admin',
          senderName: 'Premier Party Cruises',
        },
      });
      loadMessages(selectedConv.id);
      loadConversations();
    } catch (e) {
      toast({ title: 'Error sending message', variant: 'destructive' });
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Active Visitors</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeVisitors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Open Chats</span>
            </div>
            <p className="text-2xl font-bold mt-1">{conversations.filter(c => c.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Unread Messages</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalUnread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Total Conversations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{conversations.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '600px' }}>
        {/* Active Visitors Panel */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Active Visitors ({activeVisitors.length})
              <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0" onClick={() => { loadActiveVisitors(); loadConversations(); }}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {activeVisitors.map(v => (
                <div key={v.id} className="p-2 rounded-md border text-xs hover:bg-muted/50 cursor-pointer" onClick={() => {
                  const conv = conversations.find(c => c.visitor_id === v.visitor_id);
                  if (conv) setSelectedConv(conv);
                }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{v.ip_address || 'Unknown'}</span>
                    <Badge variant="outline" className="text-[10px] h-4">{v.domain}</Badge>
                  </div>
                  <p className="text-muted-foreground truncate mt-0.5">{v.page_url}</p>
                  <div className="flex gap-2 mt-1 text-muted-foreground">
                    <span>{v.page_views} pages</span>
                    <span>•</span>
                    <span>{v.total_seconds}s</span>
                    <span>•</span>
                    <span>↓{v.max_scroll_depth}%</span>
                  </div>
                </div>
              ))}
              {activeVisitors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No active visitors</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Conversations List */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map(c => (
                <div
                  key={c.id}
                  className={`p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                    selectedConv?.id === c.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedConv(c)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {c.visitor_name || c.visitor_email || c.visitor_id.slice(0, 12)}
                    </span>
                    {c.unread_count > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] h-4 min-w-4 justify-center">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate mt-0.5">
                    {c.last_message_preview || 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{c.last_message_at ? format(new Date(c.last_message_at), 'MMM d, h:mm a') : 'N/A'}</span>
                    {c.domain && (
                      <>
                        <span>•</span>
                        <span>{c.domain}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Window */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm">
              {selectedConv ? (
                <div className="flex items-center justify-between">
                  <span>{selectedConv.visitor_name || selectedConv.visitor_email || 'Chat'}</span>
                  {selectedConv.visitor_email && (
                    <span className="text-muted-foreground font-normal">{selectedConv.visitor_email}</span>
                  )}
                </div>
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.sender_type === 'admin'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'system'
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {!selectedConv && (
              <p className="text-sm text-muted-foreground text-center py-12">
                Select a conversation to view messages
              </p>
            )}
          </ScrollArea>
          {selectedConv && (
            <div className="p-3 border-t flex gap-2">
              <Input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type a reply..."
                onKeyPress={e => { if (e.key === 'Enter') sendReply(); }}
              />
              <Button size="sm" onClick={sendReply} disabled={!replyText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Embed Script Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Embed Script for premierpartycruises.com</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Paste this script tag before the closing <code>&lt;/body&gt;</code> tag on your main website to enable the chat widget and visitor tracking:
          </p>
          <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto">
            {`<script src="https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/chat-widget-script" async></script>`}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              navigator.clipboard.writeText(
                `<script src="https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/chat-widget-script" async></script>`
              );
              toast({ title: 'Copied to clipboard!' });
            }}
          >
            Copy Script Tag
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
