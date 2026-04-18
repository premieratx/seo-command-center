import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/quote-app/components/ui/dialog";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { Mail, MessageSquare, Link2, Copy, Check } from "lucide-react";
import { useToast } from "@/quote-app/hooks/use-toast";
import { supabase } from "@/quote-app/integrations/supabase/client";

interface ShareQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
}

export const ShareQuoteDialog = ({
  open,
  onOpenChange,
  quoteId,
  customerEmail,
  customerPhone,
  customerName,
}: ShareQuoteDialogProps) => {
  const [email, setEmail] = useState(customerEmail);
  const [phone, setPhone] = useState(customerPhone);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Use current pathname to support both /new-quote and /quote-v2
  const currentPath = window.location.pathname;
  const shareUrl = `${window.location.origin}${currentPath}?id=${quoteId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Quote link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('share-quote-email', {
        body: {
          email,
          quoteId,
          customerName,
          shareUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent!",
        description: `Quote has been sent to ${email}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Send Failed",
        description: "Could not send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!phone) {
      toast({
        title: "Phone Required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('share-quote-sms', {
        body: {
          phone,
          quoteId,
          customerName,
          shareUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "SMS Sent!",
        description: `Quote has been sent to ${phone}`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Send Failed",
        description: "Could not send SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Quote</DialogTitle>
          <DialogDescription>
            Share this quote via email, SMS, or copy the link
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={handleCopyLink} size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the quote
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleSendEmail} disabled={sending} className="w-full">
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={handleSendSMS} disabled={sending} className="w-full">
              {sending ? "Sending..." : "Send SMS"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
