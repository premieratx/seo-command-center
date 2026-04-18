import { Toaster } from "@/quote-app/components/ui/toaster";
import { Toaster as Sonner } from "@/quote-app/components/ui/sonner";
import { TooltipProvider } from "@/quote-app/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BookingSuccess from "./pages/BookingSuccess";
import AffiliatePortal from "./pages/AffiliatePortal";
import OnlineBooking from "./pages/OnlineBooking";
import NewQuote from "./pages/NewQuote";
import NewQuoteV2 from "./pages/NewQuoteV2";
import QuoteForm from "./pages/QuoteForm";
import EOYSaleQuote from "./pages/EOYSaleQuote";
import PricingChart from "./pages/PricingChart";
import StaticPricing from "./pages/StaticPricing";
import OnePager from "./pages/OnePager";
import GoldenTicket from "./pages/GoldenTicket";
import SummarySheet from "./pages/SummarySheet";
import EmbedPricingCalculatorV2 from "./pages/EmbedPricingCalculatorV2";
import JanuaryPriceCalculator from "./pages/JanuaryPriceCalculator";
import EmbedPrivateCruisePricing from "./pages/EmbedPrivateCruisePricing";
import JanuaryPrivateCruisePricing from "./pages/JanuaryPrivateCruisePricing";
import DiscoVsPrivate from "./pages/DiscoVsPrivate";
import EOYSaleBannerEmbed from "./pages/EOYSaleBannerEmbed";
import EOYSaleBannerCompact from "./pages/EOYSaleBannerCompact";
import EOYSaleBannerStacked from "./pages/EOYSaleBannerStacked";
import CustomerDashboard from "./pages/CustomerDashboard";
import NotFound from "./pages/NotFound";
import Waiver from "./pages/Waiver";
import LeadDashboard from "./pages/LeadDashboard";
import InnCahootsDashboard from "./pages/InnCahootsDashboard";
import DashboardCreator from "./pages/DashboardCreator";
import DynamicDashboard from "./pages/DynamicDashboard";
import ChatTestApp from "./pages/ChatTestApp";
import { ChatWidget } from "./components/ChatWidget";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NewQuoteV2 />} />
          <Route path="/old-index" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/affiliate" element={<AffiliatePortal />} />
          <Route path="/online-booking" element={<OnlineBooking />} />
          <Route path="/new-quote" element={<NewQuote />} />
          <Route path="/quote-v2" element={<NewQuoteV2 />} />
          <Route path="/quote-form" element={<QuoteForm />} />
          <Route path="/eoy-sale-quote" element={<EOYSaleQuote />} />
          <Route path="/pricing-chart" element={<PricingChart />} />
          <Route path="/static-pricing" element={<StaticPricing />} />
          <Route path="/one-pager" element={<OnePager />} />
          <Route path="/golden-ticket" element={<GoldenTicket />} />
          <Route path="/summary-sheet" element={<SummarySheet />} />
          <Route path="/embed-pricing-v2" element={<EmbedPricingCalculatorV2 />} />
          <Route path="/january-price-calculator" element={<JanuaryPriceCalculator />} />
          <Route path="/embed-private-pricing" element={<EmbedPrivateCruisePricing />} />
          <Route path="/january-private-pricing" element={<JanuaryPrivateCruisePricing />} />
          <Route path="/disco-vs-private" element={<DiscoVsPrivate />} />
          <Route path="/eoy-sale-banner-embed" element={<EOYSaleBannerEmbed />} />
          <Route path="/eoy-sale-banner-compact" element={<EOYSaleBannerCompact />} />
          <Route path="/eoy-sale-banner-stacked" element={<EOYSaleBannerStacked />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/waiver" element={<Waiver />} />
          <Route path="/lead-dashboard" element={<LeadDashboard />} />
          <Route path="/inn-cahoots-dashboard" element={<InnCahootsDashboard />} />
          <Route path="/dashboard-creator" element={<DashboardCreator />} />
          <Route path="/d/:slug" element={<DynamicDashboard />} />
          <Route path="/chat-app" element={<ChatTestApp />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
