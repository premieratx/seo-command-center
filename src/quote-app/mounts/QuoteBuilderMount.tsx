"use client";

import { Toaster } from "@/quote-app/components/ui/toaster";
import { Toaster as Sonner } from "@/quote-app/components/ui/sonner";
import { TooltipProvider } from "@/quote-app/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NewQuoteV2 from "@/quote-app/pages/NewQuoteV2";
import BookingSuccess from "@/quote-app/pages/BookingSuccess";
import Waiver from "@/quote-app/pages/Waiver";
import NotFound from "@/quote-app/pages/NotFound";

const queryClient = new QueryClient();

export default function QuoteBuilderMount() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/quote-builder">
            <Routes>
              <Route path="/" element={<NewQuoteV2 />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/waiver" element={<Waiver />} />
              <Route path="/quote-v2" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
