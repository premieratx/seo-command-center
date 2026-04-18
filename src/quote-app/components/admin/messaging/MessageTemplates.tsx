import { useState, useEffect } from "react";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { BookmarkPlus, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/quote-app/components/ui/popover";

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface MessageTemplatesProps {
  subject: string;
  content: string;
  onLoadTemplate: (subject: string, content: string) => void;
}

export const MessageTemplates = ({ subject, content, onLoadTemplate }: MessageTemplatesProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("message_templates" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as any);
  };

  const handleSave = async () => {
    if (!saveName.trim() || !subject.trim() || !content.trim()) {
      toast.error("Enter a template name, subject, and content first");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("message_templates" as any)
      .insert({ name: saveName.trim(), subject: subject.trim(), content: content.trim() } as any);
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved!");
      setSaveName("");
      setShowSave(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("message_templates" as any).delete().eq("id", id);
    fetchTemplates();
    toast.success("Template deleted");
  };

  return (
    <div className="flex gap-2">
      {/* Load Template */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Templates {templates.length > 0 && `(${templates.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 bg-slate-800 border-slate-600 p-2" align="start">
          {templates.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">No saved templates yet</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-1 group">
                  <button
                    onClick={() => onLoadTemplate(t.subject, t.content)}
                    className="flex-1 text-left px-2 py-1.5 rounded text-xs text-slate-200 hover:bg-slate-700 truncate"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-slate-500 ml-1.5">— {t.subject}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Save as Template */}
      {showSave ? (
        <div className="flex gap-1.5 items-center">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Template name..."
            className="h-8 text-xs bg-slate-800/50 border-slate-600 text-white w-36 placeholder:text-slate-500"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSave(false)} className="h-8 text-xs text-slate-400 px-1">
            ✕
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSave(true)}
          disabled={!subject.trim() || !content.trim()}
          className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
        >
          <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
          Save as Template
        </Button>
      )}
    </div>
  );
};
