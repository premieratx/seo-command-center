import { useState } from "react";
import { Button } from "@/quote-app/components/ui/button";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { useToast } from "@/quote-app/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

export const QuickImportButton = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        contactId: values[0]?.trim(),
        firstName: values[1]?.trim(),
        lastName: values[2]?.trim(),
        name: values[3]?.trim(),
        phone: values[4]?.trim(),
        email: values[5]?.trim(),
        discountCode: values[6]?.trim(),
        discountType: values[7]?.trim(),
        discountAmount: values[8]?.trim(),
        affiliateCommissionType: values[9]?.trim(),
        affiliateCommissionAmount: values[10]?.trim(),
        expirationDate: values[11]?.trim(),
        minPurchase: values[12]?.trim(),
      };
    });
  };

  const handleImport = async () => {
    setLoading(true);

    try {
      // Fetch the CSV file from public folder
      const response = await fetch('/golden-ticket-affiliates.csv');
      const csvText = await response.text();
      const csvData = parseCSV(csvText);
      
      console.log(`Processing ${csvData.length} affiliates...`);
      
      const { data, error } = await supabase.functions.invoke('import-golden-ticket-affiliates', {
        body: { csvData }
      });
      
      if (error) throw error;
      
      toast({
        title: "Import Complete! 🎉",
        description: `Successfully created ${data.results.success} affiliates with discount codes!`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import affiliates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleImport}
      disabled={loading}
      size="lg"
      className="w-full"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing 797 Affiliates...
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4" />
          Import All Golden Ticket Affiliates NOW
        </>
      )}
    </Button>
  );
};
