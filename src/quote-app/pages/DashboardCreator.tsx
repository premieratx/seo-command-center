import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/quote-app/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/quote-app/components/ui/card";
import { Button } from "@/quote-app/components/ui/button";
import { Input } from "@/quote-app/components/ui/input";
import { Label } from "@/quote-app/components/ui/label";
import { Badge } from "@/quote-app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/quote-app/components/ui/select";
import { SEOHead } from "@/quote-app/components/SEOHead";
import {
  Plus, Settings, Trash2, GripVertical, ArrowLeft,
  Loader2, CheckCircle, Copy, Eye, ChevronUp, ChevronDown, X, ExternalLink
} from "lucide-react";
import { AVAILABLE_TABS, DASHBOARD_TYPES } from "@/quote-app/lib/dashboardTabs";
import { toast } from "sonner";
import { DashboardLogoUploader } from "@/quote-app/components/admin/DashboardLogoUploader";
import { WebsiteMediaPuller } from "@/quote-app/components/admin/WebsiteMediaPuller";

interface DashboardConfig {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  dashboard_type: string;
  tabs: string[];
  settings: Record<string, any>;
  status: string;
  created_at: string;
}

const DashboardCreator = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  // Form state — initialize from localStorage to survive reloads
  const stored = typeof window !== 'undefined' ? localStorage.getItem('dashboard_creator_draft') : null;
  const draft = stored ? JSON.parse(stored) : null;
  const [name, setName] = useState(draft?.name || '');
  const [companyName, setCompanyName] = useState(draft?.companyName || '');
  const [slug, setSlug] = useState(draft?.slug || '');
  const [dashboardType, setDashboardType] = useState(draft?.dashboardType || 'general');
  const [selectedTabs, setSelectedTabs] = useState<string[]>(draft?.selectedTabs || []);

  // Settings state
  const [alcoholDeliveryUrl, setAlcoholDeliveryUrl] = useState(draft?.alcoholDeliveryUrl || 'https://partyondelivery.com/dashboard/CRHAE2');
  const [dateDisplayType, setDateDisplayType] = useState<string>(draft?.dateDisplayType || 'date_range');
  const [arrivalDate, setArrivalDate] = useState(draft?.arrivalDate || '');
  const [departureDate, setDepartureDate] = useState(draft?.departureDate || '');
  const [startTime, setStartTime] = useState(draft?.startTime || '');
  const [endTime, setEndTime] = useState(draft?.endTime || '');
  const [template, setTemplate] = useState<string>(draft?.template || 'inn_cahoots');
  const [partnerWebsiteUrl, setPartnerWebsiteUrl] = useState(draft?.partnerWebsiteUrl || '');
  const [customLogoUrl, setCustomLogoUrl] = useState(draft?.customLogoUrl || '');
  const [customHeaderImage, setCustomHeaderImage] = useState(draft?.customHeaderImage || '');
  const [customImages, setCustomImages] = useState<string[]>(draft?.customImages || []);
  const [pickupLocation, setPickupLocation] = useState(draft?.pickupLocation || '');
  const [dropoffLocation, setDropoffLocation] = useState(draft?.dropoffLocation || '');

  // Auto-open form if there's a saved draft
  const [formOpenInit] = useState(() => !!(draft && (draft.name || draft.companyName || draft.selectedTabs?.length)));
  useEffect(() => { if (formOpenInit) setFormOpen(true); }, [formOpenInit]);

  // Persist form state to localStorage on every change
  useEffect(() => {
    const data = { name, companyName, slug, dashboardType, selectedTabs, editId, alcoholDeliveryUrl, dateDisplayType, arrivalDate, departureDate, startTime, endTime, template, partnerWebsiteUrl, customLogoUrl, customHeaderImage, customImages, pickupLocation, dropoffLocation };
    localStorage.setItem('dashboard_creator_draft', JSON.stringify(data));
  }, [name, companyName, slug, dashboardType, selectedTabs, editId, alcoholDeliveryUrl, dateDisplayType, arrivalDate, departureDate, startTime, endTime, template, partnerWebsiteUrl, customLogoUrl, customHeaderImage, customImages, pickupLocation, dropoffLocation]);

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dashboard_configs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setConfigs(data.map(d => ({
        ...d,
        tabs: (d.tabs as any) || [],
        settings: (d.settings as any) || {},
      })));
    }
    setLoading(false);
  };

  const generateSlug = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    if (!editId) setSlug(generateSlug(val));
  };

  const toggleTab = (tabId: string) => {
    setSelectedTabs(prev =>
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const removeTab = (tabId: string) => {
    setSelectedTabs(prev => prev.filter(t => t !== tabId));
  };

  const moveTab = (tabId: string, direction: 'up' | 'down') => {
    setSelectedTabs(prev => {
      const idx = prev.indexOf(tabId);
      if (idx < 0) return prev;
      const newArr = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newArr.length) return prev;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
  };

  const resetForm = () => {
    setName(''); setCompanyName(''); setSlug('');
    setDashboardType('general'); setSelectedTabs([]); setEditId(null);
    setAlcoholDeliveryUrl('https://partyondelivery.com/dashboard/CRHAE2');
    setDateDisplayType('date_range'); setArrivalDate(''); setDepartureDate('');
    setStartTime(''); setEndTime(''); setTemplate(''); setPartnerWebsiteUrl('');
    setCustomLogoUrl(''); setCustomHeaderImage(''); setCustomImages([]);
    setPickupLocation(''); setDropoffLocation('');
    localStorage.removeItem('dashboard_creator_draft');
  };

  const applyInnCahootsTemplate = () => {
    setDashboardType('combo');
    setSelectedTabs(['ic_alcohol', 'ic_boats', 'ic_concierge']);
    setTemplate('inn_cahoots');
    setFormOpen(true);
    toast.success("Inn Cahoots template applied! Fill in the name and slug.");
  };

  const handleSave = async () => {
    if (!name.trim() || !companyName.trim() || !slug.trim()) {
      toast.error("Please fill in all required fields"); return;
    }
    if (selectedTabs.length === 0) {
      toast.error("Please select at least one tab"); return;
    }
    setSaving(true);
    const settingsPayload: Record<string, any> = {
      alcohol_delivery_url: alcoholDeliveryUrl.trim() || 'https://partyondelivery.com/dashboard/CRHAE2',
      date_display_type: dateDisplayType,
      template: template || undefined,
      partner_website_url: partnerWebsiteUrl.trim() || undefined,
      custom_logo_url: customLogoUrl.trim() || undefined,
      custom_header_image: customHeaderImage.trim() || undefined,
      custom_images: customImages.length > 0 ? customImages : undefined,
      pickup_location: pickupLocation.trim() || undefined,
      dropoff_location: dropoffLocation.trim() || undefined,
    };
    if (dateDisplayType === 'date_range') {
      settingsPayload.arrival_date = arrivalDate;
      settingsPayload.departure_date = departureDate;
    } else {
      settingsPayload.start_time = startTime;
      settingsPayload.end_time = endTime;
    }
    const payload = {
      name: name.trim(), company_name: companyName.trim(), slug: slug.trim(),
      dashboard_type: dashboardType, tabs: selectedTabs, settings: settingsPayload,
    };
    let error;
    if (editId) {
      ({ error } = await supabase.from('dashboard_configs').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('dashboard_configs').insert(payload));
    }
    if (error) {
      toast.error(error.message.includes('unique') ? "That slug is already taken" : error.message);
    } else {
      toast.success(editId ? "Dashboard updated!" : "Dashboard created!");
      resetForm(); setFormOpen(false); fetchConfigs();
    }
    setSaving(false);
  };

  const handleEdit = (config: DashboardConfig) => {
    setEditId(config.id); setName(config.name); setCompanyName(config.company_name);
    setSlug(config.slug); setDashboardType(config.dashboard_type);
    setSelectedTabs(config.tabs);
    // Load settings
    const s = config.settings || {};
    setAlcoholDeliveryUrl(s.alcohol_delivery_url || 'https://partyondelivery.com/dashboard/CRHAE2');
    setTemplate(s.template || '');
    setPartnerWebsiteUrl(s.partner_website_url || '');
    setCustomLogoUrl(s.custom_logo_url || '');
    setCustomHeaderImage(s.custom_header_image || '');
    setCustomImages(s.custom_images || []);
    setPickupLocation(s.pickup_location || '');
    setDropoffLocation(s.dropoff_location || '');
    setDateDisplayType(s.date_display_type || 'date_range');
    setArrivalDate(s.arrival_date || '');
    setDepartureDate(s.departure_date || '');
    setStartTime(s.start_time || '');
    setEndTime(s.end_time || '');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('dashboard_configs').delete().eq('id', id);
    if (!error) { toast.success("Dashboard deleted"); fetchConfigs(); }
  };

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`https://booking.premierpartycruises.com/d/${slug}`);
    toast.success("URL copied!");
  };

  const tabsBySource = {
    inn_cahoots: AVAILABLE_TABS.filter(t => t.source === 'inn_cahoots'),
    customer: AVAILABLE_TABS.filter(t => t.source === 'customer'),
    lead: AVAILABLE_TABS.filter(t => t.source === 'lead'),
  };
  const sourceLabels: Record<string, string> = {
    inn_cahoots: 'Inn Cahoots Dashboard', customer: 'Customer Dashboard', lead: 'Lead Dashboard',
  };

  return (
    <>
      <SEOHead title="Dashboard Creator" description="Create and manage custom dashboards" />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
        {/* Header */}
        <div className="bg-slate-800/60 border-b border-yellow-500/30 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard Creator</h1>
              <p className="text-yellow-300 text-sm">Create custom dashboards for any client</p>
            </div>
            <div className="flex gap-2">
              <a
                href="https://booking.premierpartycruises.com/dashboard-creator"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-500">
                  <ExternalLink className="h-4 w-4 mr-2" /> Open Live
                </Button>
              </a>
              <Button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-500" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Admin
              </Button>
              <Button
                onClick={() => { if (formOpen && !editId) { setFormOpen(false); } else { resetForm(); setFormOpen(true); } }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              >
                {formOpen && !editId ? <ChevronUp className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {formOpen && !editId ? 'Close Form' : 'New Dashboard'}
              </Button>
              <Button
                onClick={applyInnCahootsTemplate}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                🏠 Inn Cahoots Template
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Creator / Editor Form */}
          {formOpen && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">
                {editId ? 'Edit Dashboard' : 'Create New Dashboard'}
              </h2>

              {/* Basic Info */}
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader><CardTitle className="text-lg text-sky-300">Basic Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Dashboard Name *</Label>
                      <Input placeholder="e.g. Jamie's Bachelor Party" value={name} onChange={e => setName(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Company / Partner Name *</Label>
                      <Input placeholder="e.g. Inn Cahoots" value={companyName} onChange={e => handleCompanyNameChange(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-300">URL Slug *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">/d/</span>
                        <Input placeholder="inn-cahoots" value={slug} onChange={e => setSlug(generateSlug(e.target.value))} className="bg-slate-700/50 border-slate-600 text-white" />
                      </div>
                      <p className="text-xs text-slate-500">URL: {window.location.origin}/d/{slug || '...'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Dashboard Type</Label>
                      <Select value={dashboardType} onValueChange={setDashboardType}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DASHBOARD_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">🌐 Partner Website URL (for logo)</Label>
                    <Input
                      placeholder="https://www.inncahoots.com"
                      value={partnerWebsiteUrl}
                      onChange={e => setPartnerWebsiteUrl(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500">We'll automatically pull the logo from this website and display it at the top of the dashboard</p>
                    {partnerWebsiteUrl.trim() && (() => {
                      try {
                        const domain = new URL(partnerWebsiteUrl.startsWith('http') ? partnerWebsiteUrl : `https://${partnerWebsiteUrl}`).hostname;
                        return (
                          <div className="flex items-center gap-3 mt-2 p-3 bg-slate-700/30 rounded-lg border border-slate-600/40">
                            <img
                              src={`https://logo.clearbit.com/${domain}`}
                              alt="Logo preview"
                              className="h-12 object-contain bg-white rounded p-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                              }}
                            />
                            <span className="text-xs text-slate-400">Logo preview from <span className="text-sky-300">{domain}</span></span>
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>

                  {/* Logo Uploader */}
                  <DashboardLogoUploader
                    slug={slug}
                    currentLogoUrl={customLogoUrl}
                    onLogoUploaded={(url) => setCustomLogoUrl(url)}
                  />
                </CardContent>
              </Card>

              {/* Website Media Puller */}
              {partnerWebsiteUrl.trim() && (
                <WebsiteMediaPuller
                  websiteUrl={partnerWebsiteUrl}
                  currentLogo={customLogoUrl}
                  dashboardId={editId}
                  onMediaSelected={(selections) => {
                    if (selections.logo) setCustomLogoUrl(selections.logo);
                    if (selections.headerImage) setCustomHeaderImage(selections.headerImage);
                    if (selections.images) setCustomImages(prev => [...prev, ...selections.images!]);
                    toast.success("Media selections saved to dashboard settings");
                  }}
                />
              )}

              {/* Tab Selector */}
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-300">Choose Tabs</CardTitle>
                  <CardDescription className="text-slate-400">Click to add/remove tabs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(tabsBySource).map(([source, tabs]) => (
                    <div key={source}>
                      <h3 className="text-sm font-semibold text-amber-300 mb-3 uppercase tracking-wider">{sourceLabels[source]}</h3>
                      <div className="flex flex-wrap gap-2">
                        {tabs.map(tab => {
                          const isSelected = selectedTabs.includes(tab.id);
                          return (
                            <button key={tab.id} onClick={() => toggleTab(tab.id)}
                              className={`px-3 py-2 rounded-lg text-sm border transition-all ${isSelected ? 'bg-sky-600/30 border-sky-500/50 text-sky-200' : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:border-slate-500'}`}>
                              {isSelected && <CheckCircle className="h-3.5 w-3.5 inline mr-1.5" />}{tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Selected Tabs Order */}
              {selectedTabs.length > 0 && (
                <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                  <CardHeader><CardTitle className="text-lg text-sky-300">Tab Order ({selectedTabs.length} selected)</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedTabs.map((tabId, idx) => {
                      const tab = AVAILABLE_TABS.find(t => t.id === tabId);
                      if (!tab) return null;
                      return (
                        <div key={tabId} className="flex items-center gap-3 bg-slate-700/40 border border-slate-600/40 rounded-lg px-4 py-3">
                          <GripVertical className="h-4 w-4 text-slate-500" />
                          <span className="text-xs text-slate-500 font-mono w-6">{idx + 1}</span>
                          <span className="flex-1 text-sm text-white">{tab.label}</span>
                          <Badge className="text-xs bg-slate-600/50 text-slate-300 border-slate-500/30">{sourceLabels[tab.source]?.split(' ')[0]}</Badge>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => moveTab(tabId, 'up')} disabled={idx === 0}>↑</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => moveTab(tabId, 'down')} disabled={idx === selectedTabs.length - 1}>↓</Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => removeTab(tabId)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Dashboard Settings */}
              <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                <CardHeader>
                  <CardTitle className="text-lg text-sky-300">Dashboard Settings</CardTitle>
                  <CardDescription className="text-slate-400">Configure tab-specific settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Alcohol Delivery URL */}
                  {(selectedTabs.some(t => t.includes('alcohol'))) && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">🍹 Alcohol Delivery Store URL</Label>
                      <Input
                        placeholder="https://partyondelivery.com/dashboard/CRHAE2"
                        value={alcoholDeliveryUrl}
                        onChange={e => setAlcoholDeliveryUrl(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                      <p className="text-xs text-slate-500">The "Open Party On Delivery Store" button will link to this URL</p>
                    </div>
                  )}

                  {/* Pickup / Dropoff Locations */}
                  {selectedTabs.includes('ic_reservation') && (
                    <div className="space-y-4">
                      <Label className="text-slate-300 font-semibold">🚐 Pickup & Dropoff Locations</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Pickup Location</Label>
                          <Input
                            placeholder="e.g. Inn Cahoots, 123 Main St"
                            value={pickupLocation}
                            onChange={e => setPickupLocation(e.target.value)}
                            className="bg-slate-700/50 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Dropoff Location</Label>
                          <Input
                            placeholder="e.g. Anderson Mill Marina"
                            value={dropoffLocation}
                            onChange={e => setDropoffLocation(e.target.value)}
                            className="bg-slate-700/50 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">These locations will appear in the Reservation tab for transport partner dashboards</p>
                    </div>
                  )}

                  {(selectedTabs.includes('ic_reservation')) && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">📅 Reservation Date Display</Label>
                        <Select value={dateDisplayType} onValueChange={setDateDisplayType}>
                          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date_range">Arrival & Departure Dates</SelectItem>
                            <SelectItem value="time_range">Start & End Times</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {dateDisplayType === 'date_range' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-slate-300">Arrival Date</Label>
                            <Input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">Departure Date</Label>
                            <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-slate-300">Start Time</Label>
                            <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">End Time</Label>
                            <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-slate-700/50 border-slate-600 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedTabs.some(t => t.includes('alcohol')) && !selectedTabs.includes('ic_reservation') && (
                    <p className="text-sm text-slate-500 text-center py-4">Add Alcohol & Concierge or Reservation tabs to unlock settings</p>
                  )}

                  {/* Template Selector */}
                  <div className="space-y-2 border-t border-slate-700/50 pt-4">
                    <Label className="text-slate-300">🎨 Visual Template</Label>
                    <Select value={template || 'default'} onValueChange={v => setTemplate(v === 'default' ? '' : v)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (Standard Tabs)</SelectItem>
                        <SelectItem value="inn_cahoots">Inn Cahoots (Image Tab Cards + Amber Theme)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Controls the visual layout of the rendered dashboard</p>
                  </div>
                </CardContent>
              </Card>

              {/* Save */}
              <div className="flex gap-3 justify-end">
                <Button className="bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-500" onClick={() => { resetForm(); setFormOpen(false); }}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editId ? 'Update Dashboard' : 'Create Dashboard'}
                </Button>
              </div>
            </div>
          )}

          {/* Quick Links */}
          {!loading && configs.length > 0 && (
            <Card className="bg-slate-800/70 border-yellow-500/20">
              <CardContent className="py-4">
                <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider">🔗 Quick Links — Live Dashboards</h3>
                <div className="flex flex-wrap gap-2">
                  {configs.map(config => (
                    <a
                      key={config.id}
                      href={`https://booking.premierpartycruises.com/d/${config.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 text-sm font-semibold hover:bg-yellow-500/25 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {config.name}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collapsible Dashboard List */}
          <div>
            <button
              onClick={() => setListOpen(prev => !prev)}
              className="w-full flex items-center justify-between py-3 px-1 text-left group"
            >
              <h2 className="text-lg font-semibold text-white">
                Created Dashboards {!loading && `(${configs.length})`}
              </h2>
              {listOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              )}
            </button>

            {listOpen && (
              <div className="space-y-4 mt-2">
                {loading && (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-400 mx-auto" />
                    <p className="text-slate-400 mt-3">Loading dashboards...</p>
                  </div>
                )}

                {!loading && configs.length === 0 && (
                  <Card className="bg-slate-800/70 border-sky-500/20 text-white">
                    <CardContent className="py-12 text-center">
                      <Settings className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">No dashboards created yet.</p>
                      {!formOpen && (
                        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                          <Plus className="h-4 w-4 mr-2" /> Create Your First Dashboard
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!loading && configs.map(config => (
                  <Card key={config.id} className={`bg-slate-800/70 text-white transition-all ${previewSlug === config.slug ? 'border-sky-400/60 ring-1 ring-sky-400/30' : 'border-sky-500/20'}`}>
                    <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-white text-lg">{config.name}</h3>
                          <Badge className="text-xs bg-sky-500/20 text-sky-300 border-sky-500/30">
                            {DASHBOARD_TYPES.find(t => t.value === config.dashboard_type)?.label || config.dashboard_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{config.company_name} • {config.tabs.length} tabs</p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">/d/{config.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <a
                          href={`https://booking.premierpartycruises.com/d/${config.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Live
                          </Button>
                        </a>
                        <Button size="sm" className="bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold" onClick={() => copyUrl(config.slug)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy URL
                        </Button>
                        <Button
                          size="sm"
                          className={previewSlug === config.slug ? 'bg-sky-600 text-white border border-sky-400 font-semibold' : 'bg-slate-700 text-white border border-slate-500 hover:bg-slate-600 font-semibold'}
                          onClick={() => setPreviewSlug(prev => prev === config.slug ? null : config.slug)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> {previewSlug === config.slug ? 'Hide Preview' : 'Preview'}
                        </Button>
                        <Button size="sm" className="bg-amber-600 text-white border border-amber-500 hover:bg-amber-500 font-semibold" onClick={() => handleEdit(config)}>
                          <Settings className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button size="sm" className="bg-red-700 text-white border border-red-500 hover:bg-red-600 font-semibold" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Inline Preview */}
          {previewSlug && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-sky-400" />
                  Preview: <span className="text-sky-300 font-mono text-base">/d/{previewSlug}</span>
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-500" onClick={() => window.open(`/d/${previewSlug}`, '_blank')}>
                    Open in New Tab
                  </Button>
                  <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-white font-semibold" onClick={() => setPreviewSlug(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-sky-500/30 overflow-hidden bg-slate-900">
                <iframe
                  key={previewSlug}
                  src={`/d/${previewSlug}`}
                  title={`Dashboard preview: ${previewSlug}`}
                  className="w-full border-none"
                  style={{ minHeight: '700px', height: '80vh' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardCreator;
