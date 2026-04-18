import { Button } from "@/quote-app/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/quote-app/hooks/use-toast";

export const ClearCacheButton = () => {
  const { toast } = useToast();

  const handleClearCache = () => {
    // Clear all localStorage items related to auto-functions
    localStorage.removeItem('autoSeedOnce_v3');
    localStorage.removeItem('ghlTestSentOnce_v2');
    
    toast({
      title: "Cache cleared",
      description: "Auto-run functions have been reset. Refresh the page.",
    });
  };

  return (
    <Button
      onClick={handleClearCache}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Trash2 className="h-4 w-4" />
      Clear Auto-Run Cache
    </Button>
  );
};
