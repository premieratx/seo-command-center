"use client";

import { Toaster } from "@/quote-app/components/ui/toaster";
import { Toaster as Sonner } from "@/quote-app/components/ui/sonner";
import { TooltipProvider } from "@/quote-app/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LeadDashboard from "@/quote-app/pages/LeadDashboard";
import NotFound from "@/quote-app/pages/NotFound";

const queryClient = new QueryClient();

export default function LeadDashboardMount() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/lead-dashboard">
            <Routes>
              <Route path="/" element={<LeadDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
