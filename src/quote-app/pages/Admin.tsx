import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { CalendarView } from "@/quote-app/components/admin/CalendarView";
import { TimeSlotManager } from "@/quote-app/components/admin/TimeSlotManager";
import { BookingsManager } from "@/quote-app/components/admin/BookingsManager";
import { BoatsManager } from "@/quote-app/components/admin/BoatsManager";
import { LeadsManager } from "@/quote-app/components/admin/LeadsManager";
import { SeedDataButton } from "@/quote-app/components/admin/SeedDataButton";
import { PromoCodesManager } from "@/quote-app/components/admin/PromoCodesManager";
import { AbandonedBookingsManager } from "@/quote-app/components/admin/AbandonedBookingsManager";
import AffiliatesManager from "@/quote-app/components/admin/AffiliatesManager";

import { QuoteAnalytics } from "@/quote-app/components/admin/QuoteAnalytics";
import { EngagementAnalytics } from "@/quote-app/components/admin/EngagementAnalytics";
import { SettingsManager } from "@/quote-app/components/admin/SettingsManager";
import { Shield, Calendar, Clock, Ship, Users, Inbox, Database, Tag, Code, AlertTriangle, DollarSign, BarChart3, Eye, Settings, ImageIcon, MessageSquare, BookOpen } from "lucide-react";
import { DocumentationTab } from "@/quote-app/components/admin/DocumentationTab";
import { LiveChatManager } from "@/quote-app/components/admin/LiveChatManager";
import { DiscoCruisePhotoUploader } from "@/quote-app/components/admin/DiscoCruisePhotoUploader";
import { BulkXolaImportButton } from "@/quote-app/components/admin/BulkXolaImportButton";
import { XolaCsvSyncButton } from "@/quote-app/components/admin/XolaCsvSyncButton";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/quote-app/components/ui/alert";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");
  // Temporarily disabled for development - NO AUTH CHECK
  const [isCheckingAuth] = useState(false);
  const [isAdmin] = useState(true);

  // CRITICAL SECURITY: Check admin role before allowing access
  // TEMPORARILY DISABLED - RE-ENABLE BEFORE PRODUCTION
  // useEffect(() => {
  //   checkAdminAccess();
  // }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setActiveTab(hash);
    
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setActiveTab(hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // TEMPORARILY DISABLED - RE-ENABLE BEFORE PRODUCTION
  // const checkAdminAccess = async () => {
  //   try {
  //     // Check if user is authenticated
  //     const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  //     
  //     if (sessionError || !session) {
  //       toast({
  //         title: "Authentication Required",
  //         description: "Please sign in to access the admin portal",
  //         variant: "destructive",
  //       });
  //       navigate("/auth");
  //       return;
  //     }

  //     // Check if user has admin role using the has_role function
  //     const { data: hasAdminRole, error: roleError } = await supabase
  //       .rpc('has_role', {
  //         _user_id: session.user.id,
  //         _role: 'admin'
  //       });

  //     if (roleError) {
  //       console.error("Error checking admin role:", roleError);
  //       toast({
  //         title: "Authorization Error",
  //         description: "Failed to verify admin access",
  //         variant: "destructive",
  //       });
  //       navigate("/");
  //       return;
  //     }

  //     if (!hasAdminRole) {
  //       toast({
  //         title: "Access Denied",
  //         description: "You do not have admin privileges",
  //         variant: "destructive",
  //       });
  //       navigate("/");
  //       return;
  //     }

  //     setIsAdmin(true);
  //   } catch (error) {
  //     console.error("Error in admin access check:", error);
  //     navigate("/");
  //   } finally {
  //     setIsCheckingAuth(false);
  //   }
  // };

  // TEMPORARILY DISABLED LOADING CHECK - RE-ENABLE BEFORE PRODUCTION
  // Show loading state while checking authentication
  // if (isCheckingAuth) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="text-center space-y-4">
  //         <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
  //         <p className="text-muted-foreground">Verifying admin access...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // // If not admin, don't render anything (navigation will redirect)
  // if (!isAdmin) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Admin Portal</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 bg-muted">
            <TabsTrigger value="widget" className="gap-2">
              <Code className="h-4 w-4" />
              Widget
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="timeslots" className="gap-2">
              <Clock className="h-4 w-4" />
              Time Slots
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Users className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="boats" className="gap-2">
              <Ship className="h-4 w-4" />
              Boats
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Inbox className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="abandoned" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Abandoned
            </TabsTrigger>
            <TabsTrigger value="promo-codes" className="gap-2">
              <Tag className="h-4 w-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Affiliates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="engagement" className="gap-2">
              <Eye className="h-4 w-4" />
              Engagement
            </TabsTrigger>
            <TabsTrigger value="seed" className="gap-2">
              <Database className="h-4 w-4" />
              Seed Data
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="live-chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="documentation" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documentation" className="space-y-4">
            <DocumentationTab />
          </TabsContent>

          <TabsContent value="widget" className="space-y-4">
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border border-primary">
                <h2 className="text-2xl font-bold mb-4 text-primary">✨ Quote V2 - Unified Quote Builder (CURRENT PRODUCTION)</h2>
                <p className="text-muted-foreground mb-4">
                  This is the CURRENT production quote builder that includes both disco and private cruise options in a single unified flow. All leads created from this app receive quote links back to /quote-v2.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Quote V2 Embed Code - CURRENT PRODUCTION -->
<!-- Copy and paste this code into your website where you want the quote builder to appear -->

<div id="quote-v2-widget-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="quote-v2-widget-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('quote-v2-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/quote-v2';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=embedded_quote_v2&autoResize=1\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'quote-v2-resize') {
      const iframe = document.getElementById('quote-v2-widget-iframe');
      const container = document.getElementById('quote-v2-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('quote-v2-widget-iframe').addEventListener('load', function() {
    this.style.height = '800px';
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Quote V2 Embed Code - CURRENT PRODUCTION -->
<!-- Copy and paste this code into your website where you want the quote builder to appear -->

<div id="quote-v2-widget-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="quote-v2-widget-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('quote-v2-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/quote-v2';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=embedded_quote_v2&autoResize=1\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'quote-v2-resize') {
      const iframe = document.getElementById('quote-v2-widget-iframe');
      const container = document.getElementById('quote-v2-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('quote-v2-widget-iframe').addEventListener('load', function() {
    this.style.height = '800px';
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Quote V2 embed code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Quote V2 Embed Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border border-yellow-500">
                <h2 className="text-2xl font-bold mb-4 text-yellow-600">🎉 EOY Sale Banner Embed (Countdown + Deals)</h2>
                <p className="text-muted-foreground mb-4">
                  Embeddable banner showing the New Year Kickoff Super Sale countdown timer and deal details with scrolling photo background.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- EOY Sale Banner Embed Code -->
<!-- Countdown timer and deal details with scrolling photo background -->

<div id="eoy-banner-container" style="width: 100%; min-height: 500px; position: relative; margin: 2rem 0;">
  <iframe 
    id="eoy-banner-iframe"
    src="https://booking.premierpartycruises.com/eoy-sale-banner-embed"
    style="width: 100%; height: 600px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="New Year Kickoff Super Sale - Premier Party Cruises"
  ></iframe>
</div>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- EOY Sale Banner Embed Code -->
<!-- Countdown timer and deal details with scrolling photo background -->

<div id="eoy-banner-container" style="width: 100%; min-height: 500px; position: relative; margin: 2rem 0;">
  <iframe 
    id="eoy-banner-iframe"
    src="https://booking.premierpartycruises.com/eoy-sale-banner-embed"
    style="width: 100%; height: 600px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="New Year Kickoff Super Sale - Premier Party Cruises"
  ></iframe>
</div>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "EOY Sale Banner embed code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-400"
                >
                  Copy EOY Sale Banner Embed Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border border-yellow-400">
                <h2 className="text-2xl font-bold mb-4 text-yellow-500">📌 EOY Sale Banner COMPACT (Header Strip)</h2>
                <p className="text-muted-foreground mb-4">
                  Compact full-width banner for the top of any webpage. Shows countdown and deal highlights in a slim header format.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- EOY Sale Banner Compact Embed Code -->
<!-- Header banner with photo strips, countdown and deals -->

<div id="eoy-banner-compact-container" style="width: 100%; position: relative;">
  <iframe 
    id="eoy-banner-compact-iframe"
    src="https://booking.premierpartycruises.com/eoy-sale-banner-compact"
    style="width: 100%; height: 420px; border: none; display: block;"
    title="New Year Kickoff Super Sale - Premier Party Cruises"
  ></iframe>
</div>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- EOY Sale Banner Compact Embed Code -->
<!-- Header banner with photo strips, countdown and deals -->

<div id="eoy-banner-compact-container" style="width: 100%; position: relative;">
  <iframe 
    id="eoy-banner-compact-iframe"
    src="https://booking.premierpartycruises.com/eoy-sale-banner-compact"
    style="width: 100%; height: 420px; border: none; display: block;"
    title="New Year Kickoff Super Sale - Premier Party Cruises"
  ></iframe>
</div>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "EOY Sale Banner Compact embed code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-300"
                >
                  Copy Compact Banner Embed Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">NEW Quote Flow - Formal Quote Display (LEGACY)</h2>
                <p className="text-muted-foreground mb-4">
                  This is the LEGACY quote flow with the formal quote display. Use Quote V2 above for current production.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- NEW Quote Flow Embed Code -->
<!-- Copy and paste this code into your website where you want the NEW quote builder to appear -->

<div id="new-quote-widget-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="new-quote-widget-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('new-quote-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/new-quote';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=embedded_new_quote\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'new-quote-resize') {
      const iframe = document.getElementById('new-quote-widget-iframe');
      const container = document.getElementById('new-quote-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('new-quote-widget-iframe').addEventListener('load', function() {
    this.style.height = '800px';
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- NEW Quote Flow Embed Code -->
<!-- Copy and paste this code into your website where you want the NEW quote builder to appear -->

<div id="new-quote-widget-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="new-quote-widget-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('new-quote-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/new-quote';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=embedded_new_quote\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'new-quote-resize') {
      const iframe = document.getElementById('new-quote-widget-iframe');
      const container = document.getElementById('new-quote-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('new-quote-widget-iframe').addEventListener('load', function() {
    this.style.height = '800px';
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "NEW Quote Flow embed code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy NEW Quote Flow Embed Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">OLD Quote Builder (WITH Source Tracking)</h2>
                <p className="text-muted-foreground mb-4">
                  This is the OLD quote builder. Use the NEW Quote Flow above for better user experience.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Quote Widget Embed Code -->
<!-- Copy and paste this code into your website where you want the widget to appear -->
<!-- This widget provides the full booking experience with dynamic height adjustment -->

<div id="quote-widget-container" style="width: 100%; min-height: 1200px; position: relative; margin: 2rem 0;">
  <iframe 
    id="quote-widget-iframe"
    src=""
    style="width: 100%; height: 1200px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('quote-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=embedded_quote_builder\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    // Accept messages from your app domain
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    // Listen for the correct message type from the Index page
    if (event.data.type === 'quote-builder-resize') {
      const iframe = document.getElementById('quote-widget-iframe');
      const container = document.getElementById('quote-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 1200); // Add padding and set minimum
        // Add smooth transition for height changes
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  // Initial height adjustment after load
  document.getElementById('quote-widget-iframe').addEventListener('load', function() {
    // Set generous initial height
    this.style.height = '1200px';
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Quote Widget Embed Code -->
<!-- Copy and paste this code into your website where you want the widget to appear -->
<!-- This widget provides the full booking experience with dynamic height adjustment -->

<div id="quote-widget-container" style="width: 100%; min-height: 1200px; position: relative; margin: 2rem 0;">
  <iframe 
    id="quote-widget-iframe"
    src=""
    style="width: 100%; height: 1200px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); position: relative; z-index: 1;"
    title="Get Your Quote - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('quote-widget-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=embedded_quote_builder\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    // Accept messages from your app domain
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    // Listen for the correct message type from the Index page
    if (event.data.type === 'quote-builder-resize') {
      const iframe = document.getElementById('quote-widget-iframe');
      const container = document.getElementById('quote-widget-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 1200); // Add padding and set minimum
        // Add smooth transition for height changes
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  // Initial height adjustment after load
  document.getElementById('quote-widget-iframe').addEventListener('load', function() {
    // Set generous initial height
    this.style.height = '1200px';
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Embedded Quote Builder code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Embedded Quote Builder Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Button-Activated Quote Builder (WITH Source Tracking)</h2>
                <p className="text-muted-foreground mb-4">
                  Use this for a button that expands to show the quote builder. This version tracks the source URL and shows as "button_activated_quote_builder" in reports.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Simplified Quote Builder Embed Code -->
<!-- Copy and paste this entire code block into your website's HTML -->

<style>
  .ppc-quote-section {
    padding: 3rem 1.5rem;
    background: linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #2563eb 100%);
    text-align: center;
  }
  
  .ppc-quote-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .ppc-quote-button {
    background: #facc15;
    color: #000;
    font-weight: bold;
    font-size: 1.5rem;
    padding: 1.5rem 3rem;
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
  
  .ppc-quote-button:hover {
    background: #eab308;
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }
  
  .ppc-iframe-wrapper {
    max-width: 1200px;
    margin: 2rem auto 0;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: none;
    animation: slideDown 0.4s ease-out;
    max-height: 1000px;
  }
  
  .ppc-iframe-wrapper.active {
    display: block;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .ppc-quote-button {
      font-size: 1.25rem;
      padding: 1.25rem 2rem;
    }
  }
</style>

<section class="ppc-quote-section">
  <div class="ppc-quote-container">
    <button id="ppcQuoteBtn" class="ppc-quote-button" onclick="showPPCQuoteBuilder()">
      ✨ Start Building Your Quote →
    </button>
    
    <div id="ppcIframeWrapper" class="ppc-iframe-wrapper">
              <iframe 
                id="ppcQuoteIframe"
                src="https://ppc-quote-builder.lovable.app/get-quote"
                title="Build Your Quote - Premier Party Cruises"
                style="width: 100%; height: 900px; max-height: 900px; border: none; display: block; overflow-y: auto;"
                allow="payment; clipboard-write"
              ></iframe>
    </div>
  </div>
</section>

<script>
  function showPPCQuoteBuilder() {
    const wrapper = document.getElementById('ppcIframeWrapper');
    const button = document.getElementById('ppcQuoteBtn');
    const iframe = document.getElementById('ppcQuoteIframe');
    
    if (!wrapper.classList.contains('active')) {
      // Update iframe src with source tracking parameters
      const currentUrl = encodeURIComponent(window.location.href);
      const baseUrl = 'https://ppc-quote-builder.lovable.app/get-quote';
      iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=button_activated_quote_builder\\\`;
      
      wrapper.classList.add('active');
      button.style.display = 'none';
      
      // Scroll to quote builder smoothly
      setTimeout(() => {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
  
  // Fixed height - no auto-resize to prevent whitespace growth
  // Content will scroll within the fixed 900px iframe
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Simplified Quote Builder Embed Code -->
<!-- Copy and paste this entire code block into your website's HTML -->

<style>
  .ppc-quote-section {
    padding: 3rem 1.5rem;
    background: linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #2563eb 100%);
    text-align: center;
  }
  
  .ppc-quote-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .ppc-quote-button {
    background: #facc15;
    color: #000;
    font-weight: bold;
    font-size: 1.5rem;
    padding: 1.5rem 3rem;
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
  
  .ppc-quote-button:hover {
    background: #eab308;
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }
  
  .ppc-iframe-wrapper {
    max-width: 1200px;
    margin: 2rem auto 0;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    display: none;
    animation: slideDown 0.4s ease-out;
  }
  
  .ppc-iframe-wrapper.active {
    display: block;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .ppc-quote-button {
      font-size: 1.25rem;
      padding: 1.25rem 2rem;
    }
  }
</style>

<section class="ppc-quote-section">
  <div class="ppc-quote-container">
    <button id="ppcQuoteBtn" class="ppc-quote-button" onclick="showPPCQuoteBuilder()">
      ✨ Start Building Your Quote →
    </button>
    
    <div id="ppcIframeWrapper" class="ppc-iframe-wrapper">
      <iframe 
        id="ppcQuoteIframe"
        src="https://ppc-quote-builder.lovable.app/get-quote"
        title="Build Your Quote - Premier Party Cruises"
        style="width: 100%; height: 500px; border: none; display: block; transition: height 0.3s ease;"
        allow="payment; clipboard-write"
      ></iframe>
    </div>
  </div>
</section>

<script>
  function showPPCQuoteBuilder() {
    const wrapper = document.getElementById('ppcIframeWrapper');
    const button = document.getElementById('ppcQuoteBtn');
    const iframe = document.getElementById('ppcQuoteIframe');
    
    if (!wrapper.classList.contains('active')) {
      // Update iframe src with source tracking parameters
      const currentUrl = encodeURIComponent(window.location.href);
      const baseUrl = 'https://ppc-quote-builder.lovable.app/get-quote';
      iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=button_activated_quote_builder\`;
      
      wrapper.classList.add('active');
      button.style.display = 'none';
      
      // Scroll to quote builder smoothly
      setTimeout(() => {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
  
  // Auto-resize iframe based on content
  window.addEventListener('message', function(event) {
    if (event.origin.includes('lovable.app') && (event.data.type === 'quote-widget-height' || event.data.type === 'quote-builder-resize')) {
      const iframe = document.getElementById('ppcQuoteIframe');
      const wrapper = document.getElementById('ppcIframeWrapper');
      if (iframe && event.data.height) {
        // Only allow growth when significant, with a minimum height of 500px
        const newHeight = Math.max(500, Math.min(event.data.height, 3000));
        iframe.style.height = newHeight + 'px';
        if (wrapper) {
          wrapper.style.minHeight = newHeight + 'px';
        }
      }
    }
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Button-Activated Quote Builder code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Button-Activated Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Compact Booking Widget (Golden Ticket)</h2>
                <p className="text-muted-foreground mb-4">
                  Use this compact widget for presentations or embeds where space is limited. Features a streamlined booking flow.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Compact Booking Widget Embed Code -->
<!-- Copy and paste this code where you want the compact booking widget -->

<div id="compact-booking-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="compact-booking-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Book Your Cruise - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('compact-booking-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/compact-booking';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=compact_booking_widget\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'compact-booking-resize') {
      const iframe = document.getElementById('compact-booking-iframe');
      const container = document.getElementById('compact-booking-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 20, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Compact Booking Widget Embed Code -->
<!-- Copy and paste this code where you want the compact booking widget -->

<div id="compact-booking-container" style="width: 100%; min-height: 800px; position: relative; margin: 2rem 0;">
  <iframe 
    id="compact-booking-iframe"
    src=""
    style="width: 100%; height: 800px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Book Your Cruise - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('compact-booking-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/compact-booking';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=compact_booking_widget\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'compact-booking-resize') {
      const iframe = document.getElementById('compact-booking-iframe');
      const container = document.getElementById('compact-booking-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 20, 800);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Compact Booking Widget code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Compact Booking Widget Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Disco Comparison Widget</h2>
                <p className="text-muted-foreground mb-4">
                  Use this to embed the disco cruise vs private cruise comparison calculator. Perfect for helping customers decide between options with custom discount scenarios.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Disco Comparison Widget Embed Code -->
<!-- Copy and paste this code where you want the comparison widget -->

<div id="disco-comparison-container" style="width: 100%; min-height: 1000px; position: relative; margin: 2rem 0;">
  <iframe 
    id="disco-comparison-iframe"
    src=""
    style="width: 100%; height: 1000px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Disco vs Private Cruise Comparison - Premier Party Cruises"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('disco-comparison-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/disco-comparison';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=disco_comparison_widget\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'disco-comparison-resize') {
      const iframe = document.getElementById('disco-comparison-iframe');
      const container = document.getElementById('disco-comparison-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 40, 1000);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Disco Comparison Widget Embed Code -->
<!-- Copy and paste this code where you want the comparison widget -->

<div id="disco-comparison-container" style="width: 100%; min-height: 1000px; position: relative; margin: 2rem 0;">
  <iframe 
    id="disco-comparison-iframe"
    src=""
    style="width: 100%; height: 1000px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Disco vs Private Cruise Comparison - Premier Party Cruises"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('disco-comparison-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/disco-comparison';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=disco_comparison_widget\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'disco-comparison-resize') {
      const iframe = document.getElementById('disco-comparison-iframe');
      const container = document.getElementById('disco-comparison-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 40, 1000);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Disco Comparison Widget code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Disco Comparison Widget Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Price Calculator Widget</h2>
                <p className="text-muted-foreground mb-4">
                  Interactive price calculator for comparing Disco Cruise vs Private Cruise options with custom discounts. Perfect for sales presentations and price comparisons.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
{`<!-- Price Calculator Embed Code -->
<!-- Copy and paste this code where you want the price calculator widget -->

<style>
  .ppc-price-calculator-section {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
  }

  .ppc-price-calculator-container {
    position: relative;
    width: 100%;
  }

  .ppc-price-calculator-button {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    border: none;
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    width: 100%;
    max-width: 400px;
    display: block;
    margin: 0 auto;
  }

  .ppc-price-calculator-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .ppc-price-calculator-iframe-wrapper {
    display: none;
    position: relative;
    width: 100%;
    min-height: 800px;
    margin-top: 20px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ppc-price-calculator-iframe {
    width: 100%;
    height: 100%;
    min-height: 800px;
    border: none;
    display: block;
  }
</style>

<section class="ppc-price-calculator-section">
  <div class="ppc-price-calculator-container">
    <button class="ppc-price-calculator-button" onclick="showPPCPriceCalculator()">
      Get Your Custom Price Quote
    </button>
    <div class="ppc-price-calculator-iframe-wrapper" id="ppcPriceCalculatorWrapper">
      <iframe 
        id="ppcPriceCalculatorIframe"
        class="ppc-price-calculator-iframe"
        src=""
        allow="payment"
        loading="lazy"
      ></iframe>
    </div>
  </div>
</section>

<script>
  function showPPCPriceCalculator() {
    const wrapper = document.getElementById('ppcPriceCalculatorWrapper');
    const iframe = document.getElementById('ppcPriceCalculatorIframe');
    const button = document.querySelector('.ppc-price-calculator-button');
    
    // Get current URL parameters to track source
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = new URLSearchParams();
    
    // Preserve UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      if (urlParams.has(param)) {
        utmParams.set(param, urlParams.get(param));
      }
    });
    
    // Set iframe source with tracking
    const baseUrl = 'https://booking.premierpartycruises.com/price-calculator';
    const separator = utmParams.toString() ? '?' : '';
    iframe.src = baseUrl + separator + utmParams.toString();
    
    // Show iframe and hide button
    wrapper.style.display = 'block';
    button.style.display = 'none';
    
    // Scroll to iframe
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Listen for messages from the iframe to adjust height
  window.addEventListener('message', function(event) {
    // Verify the origin is from your Lovable app
    if (event.origin === 'https://booking.premierpartycruises.com') {
      const iframe = document.getElementById('ppcPriceCalculatorIframe');
      const wrapper = document.getElementById('ppcPriceCalculatorWrapper');
      
      if (event.data.type === 'resize' && event.data.height) {
        iframe.style.height = event.data.height + 'px';
        wrapper.style.minHeight = event.data.height + 'px';
      }
    }
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Price Calculator Embed Code -->
<!-- Copy and paste this code where you want the price calculator widget -->

<style>
  .ppc-price-calculator-section {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
  }

  .ppc-price-calculator-container {
    position: relative;
    width: 100%;
  }

  .ppc-price-calculator-button {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    border: none;
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    width: 100%;
    max-width: 400px;
    display: block;
    margin: 0 auto;
  }

  .ppc-price-calculator-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .ppc-price-calculator-iframe-wrapper {
    display: none;
    position: relative;
    width: 100%;
    min-height: 800px;
    margin-top: 20px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ppc-price-calculator-iframe {
    width: 100%;
    height: 100%;
    min-height: 800px;
    border: none;
    display: block;
  }
</style>

<section class="ppc-price-calculator-section">
  <div class="ppc-price-calculator-container">
    <button class="ppc-price-calculator-button" onclick="showPPCPriceCalculator()">
      Get Your Custom Price Quote
    </button>
    <div class="ppc-price-calculator-iframe-wrapper" id="ppcPriceCalculatorWrapper">
      <iframe 
        id="ppcPriceCalculatorIframe"
        class="ppc-price-calculator-iframe"
        src=""
        allow="payment"
        loading="lazy"
      ></iframe>
    </div>
  </div>
</section>

<script>
  function showPPCPriceCalculator() {
    const wrapper = document.getElementById('ppcPriceCalculatorWrapper');
    const iframe = document.getElementById('ppcPriceCalculatorIframe');
    const button = document.querySelector('.ppc-price-calculator-button');
    
    // Get current URL parameters to track source
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = new URLSearchParams();
    
    // Preserve UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      if (urlParams.has(param)) {
        utmParams.set(param, urlParams.get(param));
      }
    });
    
    // Set iframe source with tracking
    const baseUrl = 'https://booking.premierpartycruises.com/price-calculator';
    const separator = utmParams.toString() ? '?' : '';
    iframe.src = baseUrl + separator + utmParams.toString();
    
    // Show iframe and hide button
    wrapper.style.display = 'block';
    button.style.display = 'none';
    
    // Scroll to iframe
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Listen for messages from the iframe to adjust height
  window.addEventListener('message', function(event) {
    // Verify the origin is from your Lovable app
    if (event.origin === 'https://booking.premierpartycruises.com') {
      const iframe = document.getElementById('ppcPriceCalculatorIframe');
      const wrapper = document.getElementById('ppcPriceCalculatorWrapper');
      
      if (event.data.type === 'resize' && event.data.height) {
        iframe.style.height = event.data.height + 'px';
        wrapper.style.minHeight = event.data.height + 'px';
      }
    }
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Price Calculator Widget code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Price Calculator Widget Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border border-[#F4C430] bg-gradient-to-br from-[#FEF3C7] to-white">
                <h2 className="text-2xl font-bold mb-4 text-[#6B3410]">🎉 Golden Ticket Page 🎉</h2>
                <p className="text-muted-foreground mb-4">
                  Use this to embed the Golden Ticket winner page with exclusive discount pricing. Features interactive pricing calculator with $300/$200 discount options for special promotions.
                </p>
                
                <div className="bg-white p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto border border-[#F4C430]">
                  <pre className="whitespace-pre-wrap">
{`<!-- Golden Ticket Page Embed Code -->
<!-- Copy and paste this code where you want the Golden Ticket page -->

<div id="golden-ticket-container" style="width: 100%; min-height: 1400px; position: relative; margin: 2rem 0;">
  <iframe 
    id="golden-ticket-iframe"
    src=""
    style="width: 100%; height: 1400px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Golden Ticket Winner - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('golden-ticket-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/golden-ticket';
    iframe.src = \\\`\\\${baseUrl}?sourceUrl=\\\${currentUrl}&sourceType=golden_ticket_embed\\\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'golden-ticket-resize') {
      const iframe = document.getElementById('golden-ticket-iframe');
      const container = document.getElementById('golden-ticket-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 1400);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('golden-ticket-iframe').addEventListener('load', function() {
    this.style.height = '1400px';
  });
</script>`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Golden Ticket Page Embed Code -->
<!-- Copy and paste this code where you want the Golden Ticket page -->

<div id="golden-ticket-container" style="width: 100%; min-height: 1400px; position: relative; margin: 2rem 0;">
  <iframe 
    id="golden-ticket-iframe"
    src=""
    style="width: 100%; height: 1400px; border: none; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    title="Golden Ticket Winner - Premier Party Cruises"
    allow="payment"
  ></iframe>
</div>

<script>
  // Set iframe src with source tracking on page load
  (function() {
    const iframe = document.getElementById('golden-ticket-iframe');
    const currentUrl = encodeURIComponent(window.location.href);
    const baseUrl = 'https://booking.premierpartycruises.com/golden-ticket';
    iframe.src = \`\${baseUrl}?sourceUrl=\${currentUrl}&sourceType=golden_ticket_embed\`;
  })();
  
  // Auto-resize iframe based on content height
  window.addEventListener('message', function(event) {
    if (event.origin !== 'https://booking.premierpartycruises.com') return;
    
    if (event.data.type === 'golden-ticket-resize') {
      const iframe = document.getElementById('golden-ticket-iframe');
      const container = document.getElementById('golden-ticket-container');
      if (iframe && event.data.height) {
        const newHeight = Math.max(event.data.height + 50, 1400);
        iframe.style.transition = 'height 0.3s ease-in-out';
        iframe.style.height = newHeight + 'px';
        container.style.minHeight = newHeight + 'px';
      }
    }
  });

  document.getElementById('golden-ticket-iframe').addEventListener('load', function() {
    this.style.height = '1400px';
  });
</script>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Golden Ticket embed code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-[#F4C430] text-black font-bold rounded-md hover:bg-[#eab308]"
                >
                  Copy Golden Ticket Embed Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Email Price Calculator</h2>
                <p className="text-muted-foreground mb-4">
                  Copy this email-safe HTML code to embed the pricing calculator in your emails. Email clients don't support JavaScript or iframes, so this displays static pricing with a link to the full interactive calculator.
                </p>
                
                <div className="bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto max-h-96">
                  <pre className="whitespace-pre-wrap text-xs">
{`<!-- START EMAIL EMBED CODE -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; max-width: 600px; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <tr>
    <td style="padding: 40px 20px; background: linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #2563eb 100%); text-align: center; border-radius: 16px;">
      
      <!-- Header -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; width: 100%;">
        <tr>
          <td style="padding-bottom: 30px;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px 0; line-height: 1.2;">
              🎉 Premier Party Cruises
            </h1>
            <p style="color: #ffffff; font-size: 18px; margin: 0; opacity: 0.95;">
              Calculate Your Perfect Party Package!
            </p>
          </td>
        </tr>
      </table>

      <!-- Pricing Options -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto; width: 100%; max-width: 500px; background: rgba(255, 255, 255, 0.95); border-radius: 12px; overflow: hidden;">
        
        <!-- Private Cruises -->
        <tr>
          <td style="padding: 30px 20px; border-bottom: 2px solid #e5e7eb;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">
              🚤 Private Cruises
            </h2>
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px 0; line-height: 1.6;">
              <strong>1-14 Guests:</strong> Starting at $650<br>
              <strong>15-30 Guests:</strong> Starting at $900<br>
              <strong>31-75 Guests:</strong> Starting at $1,400
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0; font-style: italic;">
              + Package upgrades available
            </p>
          </td>
        </tr>

        <!-- Disco Cruises -->
        <tr>
          <td style="padding: 30px 20px;">
            <h2 style="color: #9333ea; font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">
              🪩 Disco Cruises
            </h2>
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px 0; line-height: 1.6;">
              <strong>Basic Bach:</strong> $85/person<br>
              <strong>Disco Queen:</strong> $95/person<br>
              <strong>Super Sparkle Platinum:</strong> $105/person
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0; font-style: italic;">
              All packages include floats, DJ, photographer &amp; more!
            </p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto 0;">
        <tr>
          <td style="border-radius: 12px; background: #facc15; text-align: center;">
            <a href="https://booking.premierpartycruises.com/pricing-chart?source=email"
               target="_blank"
               style="display: inline-block; padding: 18px 40px; color: #000000; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 12px;">
              📊 Open Pricing Calculator →
            </a>
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto 0; width: 100%;">
        <tr>
          <td style="padding-top: 20px;">
            <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9;">
              Click above to use our interactive pricing calculator<br>
              and get your custom quote in seconds!
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
<!-- END EMAIL EMBED CODE -->`}
                  </pre>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- START EMAIL EMBED CODE -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; max-width: 600px; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <tr>
    <td style="padding: 40px 20px; background: linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #2563eb 100%); text-align: center; border-radius: 16px;">
      
      <!-- Header -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; width: 100%;">
        <tr>
          <td style="padding-bottom: 30px;">
            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px 0; line-height: 1.2;">
              🎉 Premier Party Cruises
            </h1>
            <p style="color: #ffffff; font-size: 18px; margin: 0; opacity: 0.95;">
              Calculate Your Perfect Party Package!
            </p>
          </td>
        </tr>
      </table>

      <!-- Pricing Options -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto; width: 100%; max-width: 500px; background: rgba(255, 255, 255, 0.95); border-radius: 12px; overflow: hidden;">
        
        <!-- Private Cruises -->
        <tr>
          <td style="padding: 30px 20px; border-bottom: 2px solid #e5e7eb;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">
              🚤 Private Cruises
            </h2>
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px 0; line-height: 1.6;">
              <strong>1-14 Guests:</strong> Starting at $650<br>
              <strong>15-30 Guests:</strong> Starting at $900<br>
              <strong>31-75 Guests:</strong> Starting at $1,400
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0; font-style: italic;">
              + Package upgrades available
            </p>
          </td>
        </tr>

        <!-- Disco Cruises -->
        <tr>
          <td style="padding: 30px 20px;">
            <h2 style="color: #9333ea; font-size: 24px; font-weight: bold; margin: 0 0 15px 0;">
              🪩 Disco Cruises
            </h2>
            <p style="color: #374151; font-size: 16px; margin: 0 0 10px 0; line-height: 1.6;">
              <strong>Basic Bach:</strong> $85/person<br>
              <strong>Disco Queen:</strong> $95/person<br>
              <strong>Super Sparkle Platinum:</strong> $105/person
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0; font-style: italic;">
              All packages include floats, DJ, photographer &amp; more!
            </p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto 0;">
        <tr>
          <td style="border-radius: 12px; background: #facc15; text-align: center;">
            <a href="https://booking.premierpartycruises.com/pricing-chart?source=email"
               target="_blank"
               style="display: inline-block; padding: 18px 40px; color: #000000; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 12px;">
              📊 Open Pricing Calculator →
            </a>
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto 0; width: 100%;">
        <tr>
          <td style="padding-top: 20px;">
            <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9;">
              Click above to use our interactive pricing calculator<br>
              and get your custom quote in seconds!
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>
<!-- END EMAIL EMBED CODE -->`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Email Price Calculator code copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Copy Email Price Calculator Code
                </button>
              </div>

              <div className="bg-card p-6 rounded-lg border">
                <h2 className="text-2xl font-bold mb-4">Static Price Charts (Website Embed)</h2>
                <p className="text-muted-foreground mb-4">
                  Embed static, non-interactive price charts for each boat capacity. All prices include 3% Xola booking fee. View them at the bottom of your Pricing Chart page.
                </p>
                
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">Up to 14 Guests (Day Tripper)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-1-14</code>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">15-25 Guests (Meeseeks/Irony)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-15-25</code>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">26-30 Guests (Meeseeks/Irony)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-26-30</code>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">31-50 Guests (Clever Girl)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-31-50</code>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">51-75 Guests (Clever Girl)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-51-75</code>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-semibold mb-2">Disco Cruise (All Packages)</p>
                    <code className="text-xs">https://booking.premierpartycruises.com/pricing-chart#static-disco</code>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Sample iframe embed code for 1-14 guests:</p>
                  <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
{`<iframe 
  src="https://booking.premierpartycruises.com/pricing-chart#static-1-14"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`}
                    </pre>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const embedCode = `<!-- Static Price Chart for 1-14 Guests -->
<iframe 
  src="https://booking.premierpartycruises.com/pricing-chart#static-1-14"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>

<!-- Static Price Chart for 15-30 Guests -->
<iframe 
  src="https://booking.premierpartycruises.com/pricing-chart#static-15-30"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>

<!-- Static Price Chart for 31-75 Guests -->
<iframe 
  src="https://booking.premierpartycruises.com/pricing-chart#static-31-75"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;
                    navigator.clipboard.writeText(embedCode);
                    toast({ title: "Copied!", description: "Static Price Chart embed codes copied to clipboard" });
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mt-4"
                >
                  Copy All Static Chart Embed Codes
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarView />
          </TabsContent>

          <TabsContent value="timeslots" className="space-y-4">
            <TimeSlotManager />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <BookingsManager />
          </TabsContent>

          <TabsContent value="boats" className="space-y-4">
            <BoatsManager />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <LeadsManager />
          </TabsContent>

          <TabsContent value="abandoned" className="space-y-4">
            <AbandonedBookingsManager />
          </TabsContent>

          <TabsContent value="promo-codes" className="space-y-4">
            <PromoCodesManager />
          </TabsContent>

          <TabsContent value="affiliates" className="space-y-4">
            <AffiliatesManager />
          </TabsContent>


          <TabsContent value="analytics" className="space-y-4">
            <QuoteAnalytics />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <EngagementAnalytics />
          </TabsContent>

          <TabsContent value="seed" className="space-y-4">
            <SeedDataButton />
            <BulkXolaImportButton />
            <XolaCsvSyncButton />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsManager />
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <DiscoCruisePhotoUploader />
          </TabsContent>

          <TabsContent value="live-chat" className="space-y-4">
            <LiveChatManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
