import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Calendar } from "@/quote-app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/quote-app/components/ui/popover";
import { CheckCircle, Loader2, AlertTriangle, Copy, Users, CalendarIcon, ExternalLink, Square, CheckSquare } from "lucide-react";
import { cn } from "@/quote-app/lib/utils";
import { SEOHead } from "@/quote-app/components/SEOHead";
import ppcLogo from "@/quote-app/assets/ppc-logo-round.png";

/* ─── tiny helper: initials input box used 7 times ─── */
const InitialsBox = ({
  value,
  onChange,
  label = "Please type your name initials:",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => (
  <div className="flex items-center justify-between gap-4 my-6">
    <p className="text-sm text-slate-300">{label}</p>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 4).toUpperCase())}
      maxLength={4}
      placeholder=""
      className="w-20 text-center uppercase tracking-widest font-bold text-base bg-white text-black border border-slate-400 h-10"
    />
  </div>
);

const Waiver = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking");
  const previewSubmitted = searchParams.get("submitted") === "1";

  /* ─── form state ─── */
  const [initials, setInitials] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [cruiseDate, setCruiseDate] = useState<Date | undefined>();
  const [discoCruise, setDiscoCruise] = useState("");
  const [fullName, setFullName] = useState(previewSubmitted ? "Jane Doe" : "");
  const [address, setAddress] = useState("");
  const [cityStateZip, setCityStateZip] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState<Date | undefined>();

  /* ─── signature canvas ─── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ─── submission state ─── */
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(previewSubmitted);
  const [error, setError] = useState<string | null>(null);
  const [signatureCount, setSignatureCount] = useState(0);
  const [headcount, setHeadcount] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  
  /* ─── booking metadata for post-sign screen ─── */
  const [bookingMeta, setBookingMeta] = useState<{
    cruiseDate?: string;
    startTime?: string;
    endTime?: string;
    experienceTitle?: string;
    boatName?: string;
    experienceType?: string;
    alcoholDeliveryUrl?: string;
  }>({});

  /* ─── fetch counts ─── */
  useEffect(() => {
    if (!bookingId) return;
    // In demo mode after submission, don't re-fetch (would reset the incremented count)
    if (bookingId === "demo-preview" && submitted) return;
    const fetchData = async () => {
      const { count } = await supabase
        .from("waiver_signatures")
        .select("*", { count: "exact", head: true })
        .eq("booking_id", bookingId);
      setSignatureCount(count || 0);
      if (bookingId !== "demo-preview") {
        const { data } = await supabase
          .from("bookings")
          .select("headcount, alcohol_delivery_url, time_slot:time_slots(start_at, end_at, boat:boats(name), experience:experiences(title, type))")
          .eq("id", bookingId)
          .maybeSingle();
        if (data) {
          setHeadcount(data.headcount);
          const ts = (data as any).time_slot;
          if (ts?.start_at && !cruiseDate) {
            setCruiseDate(new Date(ts.start_at));
          }
          // Store booking metadata for post-sign screen
            if (ts) {
              const startDate = ts.start_at ? new Date(ts.start_at) : null;
              const endDate = ts.end_at ? new Date(ts.end_at) : null;
              const expType = ts.experience?.type || "";
              setBookingMeta({
                cruiseDate: startDate ? startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" }) : undefined,
                startTime: startDate ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) : undefined,
                endTime: endDate ? endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) : undefined,
                experienceTitle: ts.experience?.title || "Cruise",
                boatName: ts.boat?.name || "TBD",
                experienceType: expType,
                alcoholDeliveryUrl: (data as any).alcohol_delivery_url || undefined,
              });
          }
        }
      } else {
        setHeadcount(12);
        setBookingMeta({
          cruiseDate: "Saturday, April 18, 2026",
          startTime: "2:00 PM",
          endTime: "6:00 PM",
          experienceTitle: "Bachelorette Disco Cruise",
          boatName: "Clever Girl",
          experienceType: "disco_cruise",
        });
      }
    };
    fetchData();
  }, [bookingId, submitted]);

  /* ─── canvas setup ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasSignature(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };
  const endDraw = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const isDemo = bookingId === "demo-preview";
  const isDisco = bookingMeta.experienceType === "disco_cruise" || bookingMeta.experienceType === "disco";
  const canSubmit = initials.trim() && fullName.trim() && hasSignature;

  const handleSubmit = async () => {
    if (!bookingId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 800));
        setSignatureCount((prev) => prev + 1);
        setSubmitted(true);
        return;
      }
      const canvas = canvasRef.current;
      const signatureData = canvas?.toDataURL("image/png") || "";
      const fullAddress = [address.trim(), cityStateZip.trim()].filter(Boolean).join(", ");
      const { error: insertError } = await supabase.from("waiver_signatures").insert({
        booking_id: bookingId,
        signer_name: fullName.trim(),
        signer_email: email.trim() || null,
        initials: initials.trim().toUpperCase(),
        signature_data: signatureData,
        user_agent: navigator.userAgent,
        date_of_birth: dob ? format(dob, "yyyy-MM-dd") : null,
        cruise_date: cruiseDate ? format(cruiseDate, "yyyy-MM-dd") : null,
        disco_cruise_slot: discoCruise || null,
        organizer_name: organizerName.trim() || null,
        address: fullAddress || null,
        phone: phone.trim() || null,
      } as any);
      if (insertError) throw insertError;
      
      // Send confirmation email (fire-and-forget)
      if (email.trim()) {
        supabase.functions.invoke("send-waiver-confirmation", {
          body: {
            signerName: fullName.trim(),
            signerEmail: email.trim(),
            bookingId,
            cruiseDate: bookingMeta.cruiseDate || (cruiseDate ? format(cruiseDate, "MMMM d, yyyy") : "TBD"),
            cruiseTime: bookingMeta.startTime && bookingMeta.endTime ? `${bookingMeta.startTime} – ${bookingMeta.endTime}` : "TBD",
            experienceTitle: bookingMeta.experienceTitle || (isDisco ? "Disco Cruise" : "Private Cruise"),
            discoCruiseSlot: isDisco ? (discoCruise || null) : null,
            alcoholDeliveryUrl: bookingMeta.alcoholDeliveryUrl || "https://partyondelivery.com/partners/premier",
          },
        }).catch(() => {}); // non-blocking
      }

      // Log waiver signature to Google Sheets (fire-and-forget)
      supabase.functions.invoke("log-waiver-to-sheets", {
        body: {
          signerName: fullName.trim(),
          signerEmail: email.trim() || "",
          phone: phone.trim() || "",
          cruiseDate: cruiseDate ? format(cruiseDate, "MM/dd/yyyy") : (bookingMeta.cruiseDate || ""),
          dob: dob ? format(dob, "MM/dd/yyyy") : "",
          dateSigned: format(new Date(), "MM/dd/yyyy h:mm a"),
          discoCruiseSlot: isDisco ? (discoCruise || "") : "",
          organizerName: organizerName.trim() || "",
          address: [address.trim(), cityStateZip.trim()].filter(Boolean).join(", "),
        },
      }).catch(() => {}); // non-blocking
      
      setSubmitted(true);
    } catch (err: any) {
      console.error("Waiver submission failed:", err);
      setError("Failed to submit waiver. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── no booking id ─── */
  if (!bookingId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-red-300 rounded-lg p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 text-lg">Invalid waiver link. Please use the link provided by your booking organizer.</p>
        </div>
      </div>
    );
  }

  /* ─── success screen with checklist ─── */
  if (submitted) {
    const waiverLink = `${window.location.origin}/waiver?booking=${bookingId}`;
    
    
    const alcoholUrl = bookingMeta.alcoholDeliveryUrl || "https://partyondelivery.com/partners/premier";
    
    const checklistItems = [
      { label: "Sign your waiver", done: true },
      { label: "Order your drinks for the boat", done: false, link: alcoholUrl },
      { label: "Read through the cruise rules", done: false, link: "https://docs.google.com/document/d/1DS9cdYgi4tIEog8U0G1Xg7t13ukX2MnFDyy79__p81k/edit?usp=sharing" },
      { label: "Get the transportation discount code", done: false, link: "https://fetii.com" },
    ];
    
    return (
      <>
        <SEOHead title="Waiver Signed — Premier Party Cruises" description="Your waiver has been submitted." />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/80 border border-emerald-500/30 rounded-lg">
            <div className="pt-8 pb-8 px-6 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Thank You for Signing!</h2>
              <p className="text-slate-300">Your waiver has been recorded, <strong className="text-sky-300">{fullName}</strong>.</p>
              
              {/* Cruise Details */}
              {(bookingMeta.cruiseDate || cruiseDate) && (
                <div className="bg-slate-700/50 border border-sky-500/20 rounded-lg p-4 text-left space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Your Cruise</p>
                  <p className="text-white font-semibold">{bookingMeta.cruiseDate || (cruiseDate ? format(cruiseDate, "EEEE, MMMM d, yyyy") : "")}</p>
                  {bookingMeta.startTime && bookingMeta.endTime && (
                    <p className="text-sky-300 text-sm">{bookingMeta.startTime} – {bookingMeta.endTime}</p>
                  )}
                  {bookingMeta.experienceTitle && (
                    <p className="text-slate-300 text-sm">{bookingMeta.experienceTitle}</p>
                  )}
                  {discoCruise && (
                    <p className="text-purple-300 text-sm">Slot: {discoCruise}</p>
                  )}
                </div>
              )}
              
              {/* Big Yellow Alcohol Delivery Button */}
              <a
                href={alcoholUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-center py-4 rounded-lg text-lg transition-colors"
              >
                🍹 Order Your Drinks & Concierge Services
              </a>
              <p className="text-slate-400 text-xs text-center -mt-2">Delivered directly to your boat by Party On Delivery</p>

              {/* Next Steps Checklist */}
              <div className="bg-slate-700/50 border border-amber-500/20 rounded-lg p-4 text-left">
                <p className="text-xs text-amber-300 uppercase tracking-wider font-semibold mb-3">Next Steps</p>
                <div className="space-y-3">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {item.done ? (
                        <CheckSquare className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className={`text-sm ${item.done ? "text-emerald-300 line-through" : "text-white"}`}>
                          {item.label}
                        </span>
                        {item.link && !item.done && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waiver Progress */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-sky-400" />
                  <span className="text-slate-300">
                    <strong className="text-white">{signatureCount}</strong> guest{signatureCount !== 1 ? 's' : ''} signed
                    {headcount !== null && <> (group size: {headcount})</>}
                  </span>
                </div>
                {headcount !== null && (
                  <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${signatureCount >= headcount ? "bg-emerald-500" : "bg-sky-500"}`}
                      style={{ width: `${Math.min((signatureCount / headcount) * 100, 100)}%` }}
                    />
                  </div>
                )}
                {headcount !== null && signatureCount < headcount && (
                  <p className="text-amber-400 text-sm font-medium">{headcount - signatureCount} more guest{headcount - signatureCount !== 1 ? 's' : ''} still need to sign</p>
                )}
                {headcount !== null && signatureCount >= headcount && (
                  <p className="text-emerald-400 text-sm font-medium">✅ All {headcount} group members have signed!</p>
                )}
              </div>
              <div className="pt-2 space-y-3">
                <p className="text-slate-400 text-xs">Share this link with your group so everyone can sign:</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-xs text-sky-300 truncate font-mono text-left">
                    {waiverLink}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(waiverLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                  >
                    {linkCopied ? <><CheckCircle className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════
     MAIN WAIVER FORM — matches uploaded PDF template
     ═══════════════════════════════════════════════════ */
  return (
    <>
      <SEOHead title="Sign Waiver — Premier Party Cruises" description="Sign the liability waiver for your Premier Party Cruises experience." />

      <div className="min-h-screen bg-white text-black">
        {/* ─── Header with logo ─── */}
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-4 text-center">
          <img src={ppcLogo.src} alt="Premier Party Cruises" className="h-16 w-16 rounded-full mx-auto mb-4" />
          <h1 className="text-3xl font-bold">PREMIER PARTY CRUISES 2026</h1>
          <h2 className="text-2xl font-bold mt-1">{isDisco ? "Disco Cruise Waiver" : "Private Cruise Waiver"}</h2>
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-12 space-y-0">
          {/* ═══ PAGE 1 ═══ */}
          <p className="text-center font-bold underline text-base mt-4 mb-2">EVERYONE MUST SIGN BEFORE ARRIVING AT THE MARINA</p>
          <p className="text-center font-bold underline text-base mb-6">LIABILITY WAIVER AND RELEASE OF ANY AND ALL CLAIMS</p>

          <p className="text-sm leading-relaxed mb-4">
            In consideration of being permitted to participate in the watercraft and boating activities (the "Event") with Brian Hill and B Hill Entertainment LLC dba Premier Party Cruises (collectively, "Company"), I, on behalf of myself (or on behalf of any minor for whom I am the parent or legal guardian) and my assigns, heirs, and next of kin hereby acknowledge and agree to the following terms and conditions:
          </p>

          <ol className="list-decimal list-outside pl-6 space-y-4 text-sm leading-relaxed">
            <li>
              I will inspect the facilities and equipment to be used before participating in the Event. If I believe that either the facilities or the equipment is unsafe, I will immediately advise a representative of the Company of such condition. My participation in the Event is purely voluntary, and I currently have no known physical or mental condition that would impair my capability to fully participate in the Event. I verify that I am not under the influence of any drugs or alcohol. I acknowledge and agree that if I am under the age of eighteen (18), I may only participate in the Event with the express permission of my parent or legal guardian, as evidenced by their signature below.
            </li>
            <li>
              <span className="font-bold underline">EXPRESS ASSUMPTION OF RISK AND RESPONSIBILITY</span>: I acknowledge and fully understand that the Event, as with all events and physical activities including those associated with motorized watercraft, swimming, and other activities on, in, and around the water, involves risks and dangers, including without limitation, serious bodily injury and/or death. I knowingly, freely, and voluntarily assume all risk of accident, injury and/or illness, including, without limitation, injuries, sprains, splinters, torn muscles and/or ligaments, fractures, eye damage, cuts, wounds, scrapes, abrasions and/or contusions, dehydration, drowning, exposure, head, neck and/or spinal injuries, bites, stings and/or allergic reactions, shock, paralysis, medical treatment, disability, death, and any economic losses which may result, not only from my actions, omissions, or negligence, but also from the actions, omissions, or negligence of others, the condition of the premises, or the condition of the equipment. I acknowledge and agree to accept any risk from ongoing pandemics and/or from contracting any and all communicable diseases, including without limitation SARS-CoV-2 and COVID-19. I acknowledge that there may be other risks not known to me or not reasonably foreseeable at this time. I agree to assume responsibility for the risks identified above and any risk not specifically identified.
            </li>

            {/* ═══ PAGE 2 ═══ */}
            <li>
              <span className="font-bold underline">LIABILITY WAIVER AND RELEASE:</span>{" "}
              <span className="font-bold uppercase text-sm">
                I, INDIVIDUALLY (OR ON BEHALF OF ANY MINOR FOR WHOM I AM THE PARENT OR LEGAL GUARDIAN) HEREBY RELEASE COMPANY AND ANY OF ITS OFFICERS, OWNERS, MEMBERS, AGENTS, SERVANTS, ADMINISTRATORS, DIRECTORS, EMPLOYEES, CONTRACTORS, AGENTS, REPRESENTATIVES, AND INSURERS OF COMPANY (EACH A "RELEASEE" AND COLLECTIVELY THE "RELEASEES") IN CONNECTION WITH MY PARTICIPATION IN THE EVENT FROM ANY AND ALL CLAIMS, LIABILITIES, DAMAGES, AND/OR LOSSES TO PERSON OR PROPERTY (COLLECTIVELY, "CLAIMS") CAUSED OR ALLEGED TO BE CAUSED, IN WHOLE OR IN PART, BY THE ACTS OMISSIONS OR NEGLIGENCE OF ME (OR THE MINOR NAMED BELOW) OR ANY OTHER INDIVIDUAL, ENTITY, OR PARTY, <span className="underline">EVEN IF CAUSED BY THE NEGLIGENCE OF RELEASEES</span>. I FURTHER AGREE THAT IF, DESPITE THIS LIABILITY WAIVER AND RELEASE OF ANY AND ALL CLAIMS, I OR ANYONE ON MY BEHALF (OR ON BEHALF OF THE MINOR NAMED BELOW) MAKES A CLAIM AGAINST ANY OF RELEASEES, I WILL INDEMNIFY, DEFEND, SAVE, AND HOLD HARMLESS EACH OF RELEASEES FROM ANY CLAIMS, LIABILITY, DAMAGES, COSTS, FEES, AND/OR EXPENSES WHICH MAY BE INCURRED AS A RESULT OF SUCH CLAIM INCLUDING, WITHOUT LIMITATION, LITIGATION EXPENSES, COURT COSTS, AND REASONABLE ATTORNEYS' FEES, <span className="underline">EVEN IF SUCH CLAIMS ARE CAUSED BY THE NEGLIGENCE OF RELEASEES</span>.
              </span>
            </li>

            <li>
              <span className="font-bold underline">ALCOHOL AND DRUG POLICY:</span> I acknowledge that Releasees do not condone underage drinking, using illegal drugs, or driving under the influence of drugs or alcohol. I acknowledge that Releasees advise drivers, minors, and all attendees and individuals to stay sober and abstain from any dangerous and/or illegal activity.
            </li>

            <li>
              <span className="font-bold underline">PHOTO/VIDEO RELEASE:</span> I hereby grant permission to Company and hired staff to take photographs, audio, and/or video of me and my participation in the Event ("Content"), and to perpetually use and/or sublicense to third-parties such content which may include, without limitation, my image, name, voice, and/or likeness, for any purpose, including, without limitation, commercial purposes, without compensation or credit to me, in any and all media, worldwide, now known or hereafter devised.
            </li>

            <li>
              GUEST BEHAVIOR: If a guest or customer is rude, disrespectful, or unruly, the party will end immediately, and the individual will be removed by the governing law enforcement body, and the organizer of the group the person belongs to will be fined $500. No guests are allowed to swim to other boats and/or board other vessels nearby, and I acknowledge that clients and guests of Premier Party Cruises (B Hill Entertainment, LLC) are forbidden from bringing a 3rd party boat to the cove where the boats tie up for swimming. I understand that it is irresponsible and dangerous to do so, and if I ignore or disregard these rules, I will be subject to arrest by law enforcement, and the cruise will end immediately with no refund. I understand the Company reserves the right to refuse service to anyone for any reason, regardless of the opinion of the individual or other guests. Captain and crew have sole discretion to enforce rules and ensure the safety of guests during the entire cruise, and at all times that guests are on marina property. Littering, deliberately damaging the boat or causing excessive mess, or any other illegal behavior that causes extra cleanup for the crew will result in early termination of the cruise to allow extra cleaning time, and a fee will be imposed at the captain's discretion, aligned with the value of the item and/or time to return to original condition.
            </li>

            {/* ═══ PAGE 3 ═══ */}
            <li>
              SAFETY PRECAUTIONS: If any guest or attendee refuses or ignores the instructions of the captain or crew, they will be removed by law enforcement and the event will end promptly with no refund. I acknowledge that everyone, including myself, must stay within 50ft of the boat at all times, and must have a PFD orange life jacket with them at all times, regardless of swimming ability. Furthermore, I acknowledge that there is no lifeguard on duty and I am solely responsible for the safety of myself and my guests. I also agree to stay out of the water if I cannot swim, and will ensure that my intoxication does not create an environment that is unsafe for myself or others. For guests with health issues or risks being outdoors, I acknowledge that it is solely my responsibility to ensure that I have everything necessary to remain safe during the event. I understand that the staff cannot provide medication or epipens in case of allergic reaction, and agree to hold harmless any member of the staff, crew, or party who assists with first aid or CPR of any kind. Company is also not responsible for the actions or behavior of other people on the lake or on other boats.
            </li>

            <li>
              FINANCIAL RESPONSIBILITIES: I acknowledge that I am financially responsible for any damage caused to boat, equipment, dock, marina, parking lot, driveways, gates, and all other items existing on the marina property. Company (B Hill Entertainment, LLC) is not responsible for lost, broken, or stolen items that may be compromised during the guests' time at the marina, including vehicle damage, tire damage, personal injury, any other personal property or equipment. Company is not responsible for compensating the client for lost time due to the client showing up late, and the Company is not responsible for accommodating for late guests and delaying the departure of the cruise.
            </li>

            <li>
              By signing this waiver, you acknowledge you're aware that there is no lifeguard on duty, and you have reviewed and understand the safety procedures listed here:{" "}
              <a
                href="https://docs.google.com/document/d/1DS9cdYgi4tIEog8U0G1Xg7t13ukX2MnFDyy79__p81k/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Safety Procedures
              </a>
            </li>
          </ol>

          <p className="text-sm leading-relaxed mt-4">
            I, on behalf of myself or any minor for whom I am the parent or legal guardian, represent that I am over the age of 18, I have read and have had an opportunity to ask any questions about the above Liability Waiver & Release of Any and All Claims, and I voluntarily agree to the terms contained herein.
          </p>

          <p className="text-sm leading-relaxed mt-4">
            I hereby agree to hold harmless B Hill Entertainment, LLC, Marine Quest, LLC, and all other employees and staff members from any issues that may arise in any way, regardless of negligence, and give my assurance that I am fully aware of my surroundings and capable of any issue that may arise, regardless of fault.
          </p>

          {/* INITIALS #1 */}
          <InitialsBox value={initials} onChange={setInitials} />

          {/* ═══ DIVIDER ═══ */}
          <div className="my-8 text-center">
            <p className="text-xl font-bold">**The Above Is Our Specific Rules** - The Following is our insurance-required waiver information.</p>
            <p className="text-base font-bold mt-4">
              ** We will NEVER share any of your information, but the insurance company requires it. Please do not be alarmed, but it is absolutely required for you to board any of our boats.{" "}
              <span className="underline">FOCUS</span>: you cannot board our boats without signing this waiver.
            </p>
          </div>

          <hr className="border-black my-6" />

          {/* ═══ PAGE 4 — INSURANCE WAIVER ═══ */}
          <h3 className="text-center font-bold underline text-base mt-8 mb-6">
            CONTRACTUAL ASSUMPTION ACKNOWLEDGEMENT OF RISKS AND LIABILITY WAIVER AND RELEASE AGREEMENT
          </h3>

          <p className="text-sm leading-relaxed mb-4">
            IN CONSIDERATION of being permitted to participate in the charter/rental provided by Insured name (i) for myself and/or any minor children for whom I am the legal parent/guardian or otherwise responsible, and for my/our heirs, personal representatives, or assigns:
          </p>

          <h4 className="text-center underline font-normal text-base mb-4">ACKNOWLEDGEMENT OF RISKS</h4>

          <p className="text-sm leading-relaxed mb-2">
            I fully acknowledge that some, but not all of the risks of participating in the charter in which I am about to engage may include:
          </p>

          <ol className="list-decimal list-outside pl-6 space-y-1 text-sm leading-relaxed mb-4">
            <li>windshear, inclement weather, lightning, variances and extremes of wind, weather and temperature;</li>
            <li>any sense of balance, physical condition, ability to operate equipment, swim and/or follow directions;</li>
            <li>collision, capsizing, sinking or other hazard which result in wetness, injury, exposure to the elements, hypothermia, impact of the body upon the water, injection of water into my body orifices, and/or drowning;</li>
            <li>the presence of and/or injury, illness or death resulting from insects, animals and marine life forms;</li>
            <li>equipment failure, operator error, transportation accidents;</li>
            <li>heat or sun related injuries or illness, including sunburn, sunstroke or dehydration;</li>
            <li>fatigue, chill, and/or dizziness which may diminish my/our reaction time and increase the risk of an accident;</li>
            <li>slippery decks and/or steps when wet;</li>
            <li>specific activities to be listed that are not mentioned above.</li>
          </ol>

          {/* INITIALS #2 */}
          <InitialsBox value={initials} onChange={setInitials} />

          <p className="text-sm leading-relaxed text-center mb-4">
            I specifically acknowledge that I have been given instructions/training in the safe use of the type of equipment used during this charter to my complete satisfaction, I understand them fully and I am physically/mentally able to participate in the charter which I am about to engage.
          </p>

          {/* INITIALS #3 */}
          <InitialsBox value={initials} onChange={setInitials} />

          <p className="text-sm leading-relaxed mb-4">
            I understand that past or present medical conditions may be contraindicative to my participation in the charter/rental. I affirm that I am not currently suffering from a cold or congestion or have an ear infection. I affirm that I do not have any infectious disease or illness (e.g., COVID or similar variants). I affirm that I do not have a history of seizures, dizziness, or fainting, nor a history of heart conditions (e.g., cardiovascular disease, angina, heart attack). I further affirm that I do not have a history of respiratory problems (e.g., emphysema or tuberculosis). I affirm that I am not currently suffering from back, spine and/or neck injuries. I affirm that I am not currently taking medication that carries a warning about any impairment of my physical or mental abilities.
          </p>

          {/* INITIALS #4 */}
          <InitialsBox value={initials} onChange={setInitials} />

          {/* ═══ PAGE 5 ═══ */}
          <h4 className="text-center underline font-normal text-base mt-6 mb-4">CONTRACTUAL/EXPRESS ASSUMPTION OF RISK AND RESPONSIBILITY</h4>

          <p className="text-sm leading-relaxed mb-2">
            I fully agree to assume all responsibility for all the risks of the Premier Party Cruises Event (iv) to which I am about to engage, whether identified above or not (I FULLY UNDERSTAND THAT I UNDERTAKE EVEN THOSE RISKS ARISING OUT OF THE NEGLIGENCE OF THE RELEASEES NAMED BELOW). My/Our participation in the charter is completely voluntary. I assume full responsibility for myself and any of my minor children for whom I am responsible. This responsibility that I assume on my behalf and that of my minor children, or those children for whom I am legally responsible, extends to any bodily injury, accidents, illnesses, paralysis, death, loss of personal property and expenses thereof as a result of any accident which may occur while we participate in the activity. I COMPLETELY UNDERSTAND AND AGREE TO ACCEPT ALL RESPONSIBILITY ON BEHALF OF MYSELF AND MY MINOR CHILDREN, OR THOSE CHILDREN FOR WHOM I AM LEGALLY RESPONSIBLE, EVEN IF THESE INJURIES, DEATH, OR LOSS OF PERSONAL PROPERTY ARE CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF THE RELEASEES NAMED BELOW.
          </p>

          <div className="text-sm leading-relaxed space-y-1 my-4 text-slate-600">
            <p>i. Insured's name will be the name as detailed on the policy including any DBA names. I.e. Fred Smith DBA Freddie's Fishing Trips.</p>
            <p>ii. Include any risks specific to your business that are not included above in 1-8.</p>
            <p>iii. Participants must initial each section throughout the document.</p>
            <p>iv. This will include the name of the Charter/Rental if it has one. i.e. B Hill Entertainment, LLC (dba Premier Party Cruises) if there is no name Charter/Rental can remain.</p>
          </div>

          {/* INITIALS #5 */}
          <InitialsBox value={initials} onChange={setInitials} />

          <p className="text-sm leading-relaxed mb-4">
            This Agreement shall be governed by the laws of the United States of America. (v) Any legal action relating to or arising out of this agreement against or with respect to [Insured Name] (vi) shall be commenced exclusively in the United States of America (vii). Any legal action relating to or arising out of this Agreement against or with respect to any of it [B Hill Entertainment, LLC] (viii) affiliated or related companies shall be commenced exclusively in the Travis County Court, USA (ix). I agree that I will reimburse in full any attorney fees incurred by the assured or their Insurers to defend any legal action under this agreement.
          </p>

          {/* INITIALS #6 */}
          <InitialsBox value={initials} onChange={setInitials} />

          {/* ═══ PAGE 6 ═══ */}
          <h4 className="font-bold text-sm uppercase mt-6 mb-4">
            I HEREBY RELEASE [B Hill Entertainment, LLC] (x) THEIR AFFILIATED AND RELATED COMPANIES, THEIR PRINCIPALS, DIRECTORS, OFFICERS, AGENTS, EMPLOYEES, AND VOLUNTEERS, THEIR INSURERS, AND EACH AND EVERY LANDOWNER, MUNICIPAL AND/OR GOVERNMENTAL AGENCY UPON WHOSE PROPERTY AND ACTIVITY IS CONDUCTED, AS WELL AS THEIR INSURERS, IF ANY, EACH AND EVERY CRUISE LINE OR COMPANY WHO FACILITATED PARTICIPATION AND/OR PURCHASE OF TICKETS, OR FROM ANY AND ALL LIABILITY OF ANY NATURE FOR ANY AND ALL INJURY, PROPERTY LOSS OR DAMAGE (INCLUDING DEATH) TO ME OR MY MINOR CHILDREN AS WELL AS OTHER PERSONS AS A RESULT OF MY/OUR PARTICIPATION IN THE ACTIVITY, EVEN IF CAUSED BY MY NEGLIGENCE OR BY THE NEGLIGENCE OF ANY OF THE RELEASEES NAMED ABOVE, OR ANY OTHER PERSON (INCLUDING MYSELF).
          </h4>

          {/* INITIALS #7 */}
          <InitialsBox value={initials} onChange={setInitials} />

          <p className="text-sm leading-relaxed mb-6">
            I have read this assumption and acknowledgement of risks and release of liability agreement I understand fully that it is contractual in nature and binding upon me personally. I further understand that by signing this document I am waiving valuable legal rights including any and all rights I may have against the owner, the renter/charterer, the operator named above, or their employees, agents, servants or assigns. I FULLY AGREE IN CONSIDERATION FOR BEING ALLOWED TO PARTICIPATE IN THE CHARTER TO HOLD HARMLESS AND INDEMNIFY THE OWNER, THE OPERATOR NAMED ABOVE OR THEIR EMPLOYEES, AGENTS, SERVANTS OR ASSIGNS FOR ANY INJURY WHICH MAY BEFALL ME, MY MINOR CHILDREN OR THOSE CHILDREN FOR WHOM I AM LEGALLY RESPONSIBLE (INCLUDING DEATH).
          </p>

          <hr className="border-slate-300 my-8" />

          {/* ═══ FORM FIELDS — PAGE 6 & 7 ═══ */}
          <div className="space-y-6">
            {/* Organizer Name */}
            <div>
              <Label className="font-bold text-sm text-black">Name of Person Who Made the Reservation:</Label>
              <p className="text-xs text-slate-500 mb-1">(probably whoever sent you this link)</p>
              <Input
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder=""
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Date of Cruise */}
            <div>
              <Label className="font-bold text-sm text-black">DATE OF YOUR CRUISE - NOT YOUR BIRTHDAY:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 border border-black rounded-md bg-transparent text-black text-sm px-2 hover:bg-slate-50",
                      !cruiseDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {cruiseDate ? format(cruiseDate, "MM/dd/yyyy") : "Select cruise date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cruiseDate}
                    onSelect={setCruiseDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ═══ PAGE 7 ═══ */}
            {/* Disco Cruise Selection */}
            {isDisco && (
              <div>
                <Label className="font-bold text-sm text-black">Which Disco Cruise are You Attending?</Label>
                <p className="text-xs font-bold text-slate-600 mb-2">Make sure this is correct! We'll send you photos a few weeks after the cruise!</p>
                <div className="space-y-2 border border-black rounded-md p-3">
                  {["Friday 12-4", "Saturday 11-3", "Saturday 330-730"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="discoCruise"
                        value={option}
                        checked={discoCruise === option}
                        onChange={() => setDiscoCruise(option)}
                        className="w-4 h-4"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <Label className="font-bold text-sm text-black">Please fill in your name:</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder=""
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1"
              />
            </div>

            {/* Address */}
            <div>
              <Label className="font-bold text-sm text-black">Please fill in your address:</Label>
              <p className="text-xs font-bold text-slate-600 mb-1">Required by Insurance</p>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0 mb-2"
              />
              <Input
                value={cityStateZip}
                onChange={(e) => setCityStateZip(e.target.value)}
                placeholder="City, State ZIP"
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="font-bold text-sm text-black">Email:</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1"
              />
            </div>

            {/* Cell Phone */}
            <div>
              <Label className="font-bold text-sm text-black">Cell Phone:</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder=""
                className="border border-black rounded-md bg-transparent text-black text-sm px-2 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <Label className="font-bold text-sm text-black">Date of Birth:</Label>
              <p className="text-xs font-bold text-slate-600">Adults 18+: Enter DOB</p>
              <p className="text-xs font-bold text-slate-600 mb-1">If Humans &lt;18 Attending: Parents must complete a waiver for each child and sign for their child.</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1 border border-black rounded-md bg-transparent text-black text-sm px-2 hover:bg-slate-50",
                      !dob && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dob ? format(dob, "MM/dd/yyyy") : "Select date of birth"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dob}
                    onSelect={setDob}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    defaultMonth={dob || new Date(2000, 0)}
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Signature */}
            <div>
              <Label className="font-bold text-sm text-black">Your signature:</Label>
              <div className="flex items-center justify-between mb-1">
                <span />
                {hasSignature && (
                  <button onClick={clearSignature} className="text-xs text-blue-600 hover:text-blue-800 underline">Clear</button>
                )}
              </div>
              <div className="border-2 border-black rounded-md bg-white relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-400 text-sm">Draw your signature here</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="w-full h-12 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Submitting...</>
              ) : (
                "I Agree & Sign Waiver"
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center pb-4">
              By clicking "I Agree & Sign Waiver," you confirm that you have read, understood, and agree to the terms above.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-3xl mx-auto px-6 pb-8 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Premier Party Cruises • Austin, TX</p>
        </div>
      </div>
    </>
  );
};

export default Waiver;
