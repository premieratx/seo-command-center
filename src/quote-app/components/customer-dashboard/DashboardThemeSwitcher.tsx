import { RadioGroup, RadioGroupItem } from "@/quote-app/components/ui/radio-group";
import { Label } from "@/quote-app/components/ui/label";

export type DashboardTheme = 
  | "classic-navy"
  | "ivory-gold"
  | "charcoal-copper"
  | "pearl-sapphire"
  | "slate-emerald"
  | "cream-burgundy"
  | "midnight-champagne"
  | "white-obsidian"
  | "sandstone-teal"
  | "frost-rose";

interface ThemeOption {
  id: DashboardTheme;
  name: string;
  description: string;
  preview: { bg: string; accent: string; text: string; tab: string };
}

const THEMES: ThemeOption[] = [
  {
    id: "classic-navy",
    name: "Classic Navy",
    description: "Current dark theme",
    preview: { bg: "#0f172a", accent: "#0ea5e9", text: "#e2e8f0", tab: "#eab308" },
  },
  {
    id: "ivory-gold",
    name: "Ivory & Gold",
    description: "Warm cream with gold accents",
    preview: { bg: "#faf7f2", accent: "#b8860b", text: "#2c2418", tab: "#b8860b" },
  },
  {
    id: "charcoal-copper",
    name: "Charcoal & Copper",
    description: "Dark charcoal with copper highlights",
    preview: { bg: "#1c1c1e", accent: "#c67d4a", text: "#e8e0d8", tab: "#c67d4a" },
  },
  {
    id: "pearl-sapphire",
    name: "Pearl & Sapphire",
    description: "Light pearl with deep sapphire",
    preview: { bg: "#f8f9fc", accent: "#1e40af", text: "#1e293b", tab: "#1e40af" },
  },
  {
    id: "slate-emerald",
    name: "Slate & Emerald",
    description: "Cool slate with emerald accents",
    preview: { bg: "#f1f5f9", accent: "#059669", text: "#1e293b", tab: "#059669" },
  },
  {
    id: "cream-burgundy",
    name: "Cream & Burgundy",
    description: "Elegant cream with burgundy",
    preview: { bg: "#fdf8f4", accent: "#7f1d1d", text: "#2d1b1b", tab: "#7f1d1d" },
  },
  {
    id: "midnight-champagne",
    name: "Midnight Champagne",
    description: "Deep midnight with champagne gold",
    preview: { bg: "#0a0a14", accent: "#d4af37", text: "#f0ead6", tab: "#d4af37" },
  },
  {
    id: "white-obsidian",
    name: "White & Obsidian",
    description: "Clean white with black type",
    preview: { bg: "#ffffff", accent: "#18181b", text: "#18181b", tab: "#18181b" },
  },
  {
    id: "sandstone-teal",
    name: "Sandstone & Teal",
    description: "Warm sandstone with teal accents",
    preview: { bg: "#f5f0e8", accent: "#0d7377", text: "#2c2a25", tab: "#0d7377" },
  },
  {
    id: "frost-rose",
    name: "Frost & Rosé",
    description: "Icy white with blush rosé accents",
    preview: { bg: "#fafafa", accent: "#be185d", text: "#1f1f1f", tab: "#be185d" },
  },
];

interface DashboardThemeSwitcherProps {
  value: DashboardTheme;
  onChange: (theme: DashboardTheme) => void;
}

export default function DashboardThemeSwitcher({ value, onChange }: DashboardThemeSwitcherProps) {
  return (
    <div className="mb-6">
      <p className="text-xs text-amber-300/70 uppercase tracking-widest font-semibold mb-3">Dashboard Theme Preview</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as DashboardTheme)}
        className="grid grid-cols-2 sm:grid-cols-5 gap-2"
      >
        {THEMES.map((t) => (
          <Label
            key={t.id}
            htmlFor={`theme-${t.id}`}
            className={`relative flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${
              value === t.id
                ? "border-amber-400 bg-amber-500/10 shadow-md shadow-amber-500/20"
                : "border-slate-600/50 bg-slate-700/30 hover:border-slate-500"
            }`}
          >
            <RadioGroupItem value={t.id} id={`theme-${t.id}`} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Color preview dots */}
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ background: t.preview.bg }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ background: t.preview.accent }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{ background: t.preview.text }}
                />
              </div>
              <p className="text-xs font-bold text-white leading-tight truncate">{t.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{t.description}</p>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

/** Returns CSS class names for the selected theme applied to the customer-facing dashboard */
export function getThemeClasses(theme: DashboardTheme) {
  switch (theme) {
    case "classic-navy":
      return {
        page: "bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900",
        header: "bg-slate-800/60 border-b border-sky-500/20 backdrop-blur-sm",
        headerTitle: "text-white",
        headerSubtitle: "text-sky-300",
        card: "bg-slate-800/70 border-sky-500/20 text-white",
        cardTitle: "text-sky-300",
        tabList: "bg-slate-800/80 border border-sky-500/20",
        tabActive: "bg-yellow-500 text-black data-[state=active]:bg-yellow-500 data-[state=active]:text-black",
        tabInactive: "text-sky-300 data-[state=active]:bg-yellow-500 data-[state=active]:text-black hover:bg-slate-700/60",
        text: "text-white",
        textMuted: "text-slate-400",
        textAccent: "text-sky-400",
        separator: "bg-slate-700",
        summaryBg: "bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-500/20",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        logoSize: "h-8 w-8 sm:h-12 sm:w-12",
        font: "",
      };
    case "ivory-gold":
      return {
        page: "bg-[#faf7f2]",
        header: "bg-[#f3ede3] border-b border-[#d4c5a9]/40 shadow-sm",
        headerTitle: "text-[#2c2418]",
        headerSubtitle: "text-[#8b7355]",
        card: "bg-white border-[#d4c5a9]/30 text-[#2c2418] shadow-sm",
        cardTitle: "text-[#8b6914]",
        tabList: "bg-[#f3ede3] border border-[#d4c5a9]/40",
        tabActive: "bg-[#b8860b] text-white data-[state=active]:bg-[#b8860b] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#6b5b3e] data-[state=active]:bg-[#b8860b] data-[state=active]:text-white hover:bg-[#ece3d0]",
        text: "text-[#2c2418]",
        textMuted: "text-[#8b7355]",
        textAccent: "text-[#8b6914]",
        separator: "bg-[#e8dcc8]",
        summaryBg: "bg-[#f7f1e6] border border-[#d4c5a9]/30",
        badge: "bg-[#d4af37]/15 text-[#8b6914] border-[#d4af37]/30",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "font-serif",
      };
    case "charcoal-copper":
      return {
        page: "bg-[#1c1c1e]",
        header: "bg-[#252527] border-b border-[#c67d4a]/20 shadow-lg",
        headerTitle: "text-[#e8e0d8]",
        headerSubtitle: "text-[#c67d4a]",
        card: "bg-[#252527] border-[#3a3a3c] text-[#e8e0d8] shadow-md",
        cardTitle: "text-[#c67d4a]",
        tabList: "bg-[#2c2c2e] border border-[#c67d4a]/20",
        tabActive: "bg-[#c67d4a] text-white data-[state=active]:bg-[#c67d4a] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#a89888] data-[state=active]:bg-[#c67d4a] data-[state=active]:text-white hover:bg-[#3a3a3c]",
        text: "text-[#e8e0d8]",
        textMuted: "text-[#8a8078]",
        textAccent: "text-[#c67d4a]",
        separator: "bg-[#3a3a3c]",
        summaryBg: "bg-[#252527] border border-[#c67d4a]/20",
        badge: "bg-[#c67d4a]/15 text-[#c67d4a] border-[#c67d4a]/30",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
    case "pearl-sapphire":
      return {
        page: "bg-[#f8f9fc]",
        header: "bg-white border-b border-[#1e40af]/10 shadow-sm",
        headerTitle: "text-[#1e293b]",
        headerSubtitle: "text-[#1e40af]",
        card: "bg-white border-[#c7d2fe]/40 text-[#1e293b] shadow-sm",
        cardTitle: "text-[#1e40af]",
        tabList: "bg-[#eef2ff] border border-[#c7d2fe]/50",
        tabActive: "bg-[#1e40af] text-white data-[state=active]:bg-[#1e40af] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#3b5998] data-[state=active]:bg-[#1e40af] data-[state=active]:text-white hover:bg-[#dbeafe]",
        text: "text-[#1e293b]",
        textMuted: "text-[#64748b]",
        textAccent: "text-[#1e40af]",
        separator: "bg-[#e2e8f0]",
        summaryBg: "bg-[#eef2ff] border border-[#c7d2fe]/40",
        badge: "bg-[#1e40af]/10 text-[#1e40af] border-[#1e40af]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
    case "slate-emerald":
      return {
        page: "bg-[#f1f5f9]",
        header: "bg-white border-b border-[#059669]/10 shadow-sm",
        headerTitle: "text-[#1e293b]",
        headerSubtitle: "text-[#059669]",
        card: "bg-white border-[#a7f3d0]/40 text-[#1e293b] shadow-sm",
        cardTitle: "text-[#059669]",
        tabList: "bg-[#ecfdf5] border border-[#a7f3d0]/50",
        tabActive: "bg-[#059669] text-white data-[state=active]:bg-[#059669] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#047857] data-[state=active]:bg-[#059669] data-[state=active]:text-white hover:bg-[#d1fae5]",
        text: "text-[#1e293b]",
        textMuted: "text-[#64748b]",
        textAccent: "text-[#059669]",
        separator: "bg-[#e2e8f0]",
        summaryBg: "bg-[#ecfdf5] border border-[#a7f3d0]/30",
        badge: "bg-[#059669]/10 text-[#059669] border-[#059669]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
    case "cream-burgundy":
      return {
        page: "bg-[#fdf8f4]",
        header: "bg-[#faf2ec] border-b border-[#7f1d1d]/10 shadow-sm",
        headerTitle: "text-[#2d1b1b]",
        headerSubtitle: "text-[#7f1d1d]",
        card: "bg-white border-[#e5c7b8]/40 text-[#2d1b1b] shadow-sm",
        cardTitle: "text-[#7f1d1d]",
        tabList: "bg-[#fef2f2] border border-[#e5c7b8]/50",
        tabActive: "bg-[#7f1d1d] text-white data-[state=active]:bg-[#7f1d1d] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#991b1b] data-[state=active]:bg-[#7f1d1d] data-[state=active]:text-white hover:bg-[#fde8e8]",
        text: "text-[#2d1b1b]",
        textMuted: "text-[#8b6b6b]",
        textAccent: "text-[#7f1d1d]",
        separator: "bg-[#e8d5cc]",
        summaryBg: "bg-[#fef7f4] border border-[#e5c7b8]/30",
        badge: "bg-[#7f1d1d]/10 text-[#7f1d1d] border-[#7f1d1d]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "font-serif",
      };
    case "midnight-champagne":
      return {
        page: "bg-[#0a0a14]",
        header: "bg-[#12121e] border-b border-[#d4af37]/20 shadow-lg",
        headerTitle: "text-[#f0ead6]",
        headerSubtitle: "text-[#d4af37]",
        card: "bg-[#14142a] border-[#d4af37]/15 text-[#f0ead6] shadow-md",
        cardTitle: "text-[#d4af37]",
        tabList: "bg-[#12121e] border border-[#d4af37]/20",
        tabActive: "bg-[#d4af37] text-[#0a0a14] data-[state=active]:bg-[#d4af37] data-[state=active]:text-[#0a0a14] shadow-md font-bold",
        tabInactive: "text-[#d4af37]/70 data-[state=active]:bg-[#d4af37] data-[state=active]:text-[#0a0a14] hover:bg-[#1e1e32]",
        text: "text-[#f0ead6]",
        textMuted: "text-[#a09880]",
        textAccent: "text-[#d4af37]",
        separator: "bg-[#2a2a3e]",
        summaryBg: "bg-[#14142a] border border-[#d4af37]/15",
        badge: "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/30",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "font-serif",
      };
    case "white-obsidian":
      return {
        page: "bg-white",
        header: "bg-white border-b border-[#e4e4e7] shadow-sm",
        headerTitle: "text-[#18181b]",
        headerSubtitle: "text-[#52525b]",
        card: "bg-white border-[#e4e4e7] text-[#18181b] shadow-sm",
        cardTitle: "text-[#18181b]",
        tabList: "bg-[#f4f4f5] border border-[#e4e4e7]",
        tabActive: "bg-[#18181b] text-white data-[state=active]:bg-[#18181b] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#52525b] data-[state=active]:bg-[#18181b] data-[state=active]:text-white hover:bg-[#e4e4e7]",
        text: "text-[#18181b]",
        textMuted: "text-[#71717a]",
        textAccent: "text-[#18181b]",
        separator: "bg-[#e4e4e7]",
        summaryBg: "bg-[#fafafa] border border-[#e4e4e7]",
        badge: "bg-[#18181b]/10 text-[#18181b] border-[#18181b]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
    case "sandstone-teal":
      return {
        page: "bg-[#f5f0e8]",
        header: "bg-[#ede6da] border-b border-[#0d7377]/15 shadow-sm",
        headerTitle: "text-[#2c2a25]",
        headerSubtitle: "text-[#0d7377]",
        card: "bg-white border-[#c8bfaf]/40 text-[#2c2a25] shadow-sm",
        cardTitle: "text-[#0d7377]",
        tabList: "bg-[#e8e2d6] border border-[#0d7377]/15",
        tabActive: "bg-[#0d7377] text-white data-[state=active]:bg-[#0d7377] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#0d7377]/80 data-[state=active]:bg-[#0d7377] data-[state=active]:text-white hover:bg-[#ddd6c6]",
        text: "text-[#2c2a25]",
        textMuted: "text-[#7a7568]",
        textAccent: "text-[#0d7377]",
        separator: "bg-[#d4cbbf]",
        summaryBg: "bg-[#ede6da] border border-[#c8bfaf]/30",
        badge: "bg-[#0d7377]/10 text-[#0d7377] border-[#0d7377]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
    case "frost-rose":
      return {
        page: "bg-[#fafafa]",
        header: "bg-white border-b border-[#be185d]/10 shadow-sm",
        headerTitle: "text-[#1f1f1f]",
        headerSubtitle: "text-[#be185d]",
        card: "bg-white border-[#fce7f3]/60 text-[#1f1f1f] shadow-sm",
        cardTitle: "text-[#be185d]",
        tabList: "bg-[#fff1f2] border border-[#fce7f3]/70",
        tabActive: "bg-[#be185d] text-white data-[state=active]:bg-[#be185d] data-[state=active]:text-white shadow-md",
        tabInactive: "text-[#be185d]/70 data-[state=active]:bg-[#be185d] data-[state=active]:text-white hover:bg-[#fce7f3]",
        text: "text-[#1f1f1f]",
        textMuted: "text-[#6b7280]",
        textAccent: "text-[#be185d]",
        separator: "bg-[#f3e8ee]",
        summaryBg: "bg-[#fff5f7] border border-[#fce7f3]/50",
        badge: "bg-[#be185d]/10 text-[#be185d] border-[#be185d]/20",
        logoSize: "h-10 w-10 sm:h-16 sm:w-16",
        font: "",
      };
  }
}

export { THEMES };
