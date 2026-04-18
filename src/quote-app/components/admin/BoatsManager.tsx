import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/quote-app/components/ui/card";
import { Badge } from "@/quote-app/components/ui/badge";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const BoatsManager = () => {
  const [boats, setBoats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBoats();
  }, []);

  const fetchBoats = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("boats")
        .select("*")
        .order("name");

      setBoats(data || []);
    } catch (error) {
      console.error("Error fetching boats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Boats</CardTitle>
        <CardDescription>Manage your fleet</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {boats.map(boat => (
              <Card key={boat.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg">{boat.name}</h3>
                    <Badge variant={boat.status === "active" ? "default" : "secondary"}>
                      {boat.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Capacity: {boat.capacity} guests</p>
                    <p>Location: {boat.location}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
