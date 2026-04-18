import { useState } from "react";
import { ADDON_DETAILS, type AddonDetail } from "@/quote-app/lib/addonDetails";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/quote-app/components/ui/tabs";
import { CheckCircle2, Package } from "lucide-react";

const GROUPS: { label: string; filter: (d: AddonDetail) => boolean }[] = [
  { label: "Essentials", filter: d => d.name.startsWith("Essentials") },
  { label: "Ultimate", filter: d => d.name.startsWith("Ultimate") },
  { label: "Sparkle / Bach", filter: d => ["Bride Sparkle Package", "Groom Manly Sparkle Package", "Sparkle Together Package", "Disco Sparkle Package"].includes(d.name) },
  { label: "Disco Packages", filter: d => ["Disco Queen Package", "Basic Bach Package", "Super Sparkle Platinum"].includes(d.name) },
  { label: "Add-Ons", filter: d => ["Mimosa Party Cooler", "$50 POD Voucher", "$100 POD Concierge Voucher"].includes(d.name) },
];

function PackageCard({ detail }: { detail: AddonDetail }) {
  return (
    <div className="bg-slate-700/40 border border-slate-600/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-4 w-4 text-pink-400" />
        <h4 className="font-semibold text-white text-sm">{detail.name}</h4>
      </div>
      <p className="text-xs text-slate-400 mb-3 italic">{detail.description}</p>
      <ul className="space-y-1.5">
        {detail.items.map((item, i) => {
          const isSub = item.startsWith("—");
          return (
            <li key={i} className={`flex items-start gap-2 text-sm ${isSub ? "ml-5 text-slate-400" : "text-slate-200"}`}>
              {!isSub && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-400 shrink-0" />}
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PackageGuideTab() {
  const [activeGroup, setActiveGroup] = useState("Essentials");

  const currentGroup = GROUPS.find(g => g.label === activeGroup);
  const packages = currentGroup ? ADDON_DETAILS.filter(currentGroup.filter) : [];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Full breakdown of every package and add-on we offer.</p>

      <Tabs value={activeGroup} onValueChange={setActiveGroup}>
        <TabsList className="bg-slate-700/50 border border-slate-600/50 flex-wrap h-auto gap-1 p-1">
          {GROUPS.map(g => (
            <TabsTrigger
              key={g.label}
              value={g.label}
              className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300 text-slate-400 text-xs px-3 py-1.5"
            >
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {GROUPS.map(g => (
          <TabsContent key={g.label} value={g.label}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
              {ADDON_DETAILS.filter(g.filter).map(d => (
                <PackageCard key={d.name} detail={d} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
