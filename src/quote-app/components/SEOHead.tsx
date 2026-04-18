import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  quoteNumber?: string; // For dynamic OG image generation
}

const BASE_URL = "https://premierpartycruises.com";
const DEFAULT_IMAGE = `${BASE_URL}/og-images/instant-quote.png`;
const SUPABASE_URL = "https://tgambsdjfwgoohkqopns.supabase.co";

export const SEOHead = ({
  title = "Premier Party Cruises - Austin Lake Boat Rentals & Disco Cruises",
  description = "Book private boat cruises and disco party experiences on Lake Travis. Bachelor parties, corporate events, birthdays. Up to 75 guests. Get your instant quote today.",
  image = DEFAULT_IMAGE,
  url,
  quoteNumber,
}: SEOHeadProps) => {
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  
  // Use dynamic OG image if quote number is provided
  let fullImage: string;
  if (quoteNumber) {
    fullImage = `${SUPABASE_URL}/functions/v1/generate-quote-og?q=${quoteNumber}`;
  } else {
    fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  );
};
