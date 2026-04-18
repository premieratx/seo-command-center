import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { Card, CardContent } from "@/quote-app/components/ui/card";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const EmbedCodeDisplay = () => {
  const [copied, setCopied] = useState(false);
  
  // Get the current domain
  const embedUrl = `${window.location.origin}/disco-vs-private`;
  
  const embedCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="900" 
  frameborder="0" 
  style="border: none; max-width: 1200px; margin: 0 auto; display: block;"
  title="ATX Disco Cruise Pricing Calculator">
</iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-[95vw] mx-auto mt-4">
      <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold">Embed This Calculator</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Copy the code below and paste it into any website to embed this pricing calculator.
          </p>
          <div className="relative">
            <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-[10px] sm:text-xs">
              <code>{embedCode}</code>
            </pre>
            <Button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 text-xs sm:text-sm"
              size="sm"
              variant="secondary"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Copied!</span>
                  <span className="sm:hidden">✓</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Copy Embed Code</span>
                  <span className="sm:hidden">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
