import { Card, CardContent, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/quote-app/components/ui/tabs";
import { useState, useEffect } from "react";
import { useEngagementTracking } from "@/quote-app/hooks/useEngagementTracking";

interface XolaBookingWidgetProps {
  leadId?: string;
  quoteNumber?: string;
}

export const XolaBookingWidget = ({ leadId, quoteNumber }: XolaBookingWidgetProps) => {
  const [activeTab, setActiveTab] = useState('private_cruise');
  const [privateSize, setPrivateSize] = useState<'14' | '25' | '50'>('14');
  const [hasTrackedTabOpen, setHasTrackedTabOpen] = useState(false);
  const engagement = useEngagementTracking(leadId, quoteNumber);

  // Helper: robustly initialize Xola widgets
  const initXolaSafe = () => {
    const tryInit = (delay: number) => {
      setTimeout(() => {
        const w = window as any;
        try {
          if (w.Xola && typeof w.Xola.init === 'function') w.Xola.init();
          if (w.XolaCheckout && typeof w.XolaCheckout.refresh === 'function') w.XolaCheckout.refresh();
        } catch (e) { console.error('Xola init error', e); }
      }, delay);
    };

    const ensureEmbeds = (delay: number) => {
      setTimeout(() => {
        try {
          const containers = document.querySelectorAll<HTMLDivElement>('.xola-embedded-checkout');
          containers.forEach((el) => {
            const hasIframe = el.querySelector('iframe');
            const seller = el.getAttribute('data-seller');
            const experience = el.getAttribute('data-experience');
            if (!hasIframe && seller && experience) {
              const iframe = document.createElement('iframe');
              iframe.src = `https://checkout.xola.app/index.html#seller/${seller}/experiences/${experience}`;
              iframe.style.width = '100%';
              iframe.style.height = '2600px';
              iframe.style.minHeight = '2600px';
              iframe.style.border = '0';
              iframe.style.overflow = 'auto';
              iframe.setAttribute('title', 'Xola booking checkout');
              iframe.setAttribute('scrolling', 'yes');
              el.appendChild(iframe);
            } else if (hasIframe) {
              const iframe = hasIframe as HTMLIFrameElement;
              iframe.style.height = '2600px';
              iframe.style.minHeight = '2600px';
            }
          });
        } catch (e) { console.error('Xola ensureEmbeds error', e); }
      }, delay);
    };

    tryInit(0); tryInit(250); tryInit(1000);
    ensureEmbeds(1500); ensureEmbeds(3000);
  };

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://xola.com/checkout.js"]');
    if (existingScript) { initXolaSafe(); return; }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://xola.com/checkout.js';
    script.onload = () => { console.log('Xola script loaded'); initXolaSafe(); };
    script.onerror = () => { console.error('Failed to load Xola script'); };
    document.body.appendChild(script);
  }, []);

  useEffect(() => { initXolaSafe(); }, [activeTab, privateSize]);

  useEffect(() => {
    if (!hasTrackedTabOpen) {
      engagement.trackXolaTabOpened();
      setHasTrackedTabOpen(true);
    }
  }, [hasTrackedTabOpen, engagement]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as any);
    engagement.trackQuoteBuilderInteraction('xola_tab_switched', { tab: value });
  };

  return (
    <Card className="w-full border-4 border-[#3b82f6] rounded-none sm:rounded-xl overflow-hidden shadow-xl bg-white">
      <CardHeader className="bg-[#3b82f6] text-white px-[10px] py-3">
        <CardTitle className="text-2xl md:text-3xl text-center">Book Now!</CardTitle>
      </CardHeader>
      <CardContent className="px-[10px] py-3">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="disco_cruise" className="text-lg">ATX Disco Cruise</TabsTrigger>
            <TabsTrigger value="private_cruise" className="text-lg">Private Cruise</TabsTrigger>
          </TabsList>

          <TabsContent value="private_cruise" forceMount>
            <div className={activeTab === 'private_cruise' ? 'block' : 'absolute -left-[9999px] w-[1px] h-[1px] overflow-hidden'}>
              <Tabs value={privateSize} onValueChange={(v) => setPrivateSize(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="14">14 Person</TabsTrigger>
                  <TabsTrigger value="25">25 Person</TabsTrigger>
                  <TabsTrigger value="50">50 Person</TabsTrigger>
                </TabsList>
                <TabsContent value="14" forceMount>
                  <div className={`mt-4 ${privateSize === '14' ? 'block' : 'absolute -left-[9999px] w-[1px] h-[1px] overflow-hidden'}`}>
                    <div className="min-h-[2600px]">
                      <div className="xola-embedded-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d0012c2afc7d8d70e285"></div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="25" forceMount>
                  <div className={`mt-4 ${privateSize === '25' ? 'block' : 'absolute -left-[9999px] w-[1px] h-[1px] overflow-hidden'}`}>
                    <div className="min-h-[2600px]">
                      <div className="xola-embedded-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d2b74e1de53cee29395e"></div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="50" forceMount>
                  <div className={`mt-4 ${privateSize === '50' ? 'block' : 'absolute -left-[9999px] w-[1px] h-[1px] overflow-hidden'}`}>
                    <div className="min-h-[2600px]">
                      <div className="xola-embedded-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="64c7d4f01be574411500cf62"></div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="disco_cruise" forceMount>
            <div className={activeTab === 'disco_cruise' ? 'block' : 'absolute -left-[9999px] w-[1px] h-[1px] overflow-hidden'}>
              <div className="mt-4">
                <div className="min-h-[2600px]">
                  <div className="xola-embedded-checkout" data-seller="64c43a70daa3e618b7229ddf" data-version="2" data-experience="69027506f94186c4150ead25"></div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
