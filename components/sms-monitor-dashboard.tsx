'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  Copy,
  Globe,
  Hash,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Settings,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface SMSRecord {
  id: string;
  time: string;
  range: string;
  number: string;
  myPayout: string;
  agentPayout: string;
  client: string;
  cli: string;
  content: string;
}

interface CLIStat {
  cli: string;
  firstDetected: string;
  count: number;
  todayCount: number;
}

interface TelegramCfg {
  botToken: string;
  chatId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTelegramNewCLI(cli: string, firstTime: string, count: number): string {
  return (
    `🚨 <b>New CLI Detected!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷️ <b>CLI :</b> <b>${cli}</b>\n` +
    `🕒 <b>First Seen :</b> ${firstTime}\n` +
    `📊 <b>SMS Count :</b> ${count}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SMSMonitorDashboard() {
  const [smsData, setSmsData]       = useState<SMSRecord[]>([]);
  const [cliStats, setCliStats]     = useState<CLIStat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(false);
  const [endpoint, setEndpoint]     = useState('');
  const [searchTerm, setSearch]     = useState('');
  const [activeTab, setActiveTab]   = useState<'sms' | 'clis' | 'new'>('sms');
  const [showSettings, setShowSettings] = useState(false);
  const [tgCfg, setTgCfg]           = useState<TelegramCfg>({ botToken: '', chatId: '' });
  const [tgSaved, setTgSaved]       = useState(false);
  const [tgStatus, setTgStatus]     = useState('');
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [newCLIAlert, setNewCLIAlert] = useState<CLIStat[]>([]);

  // Track CLIs seen in previous poll to detect NEW ones
  const knownCLIsRef   = useRef<Set<string>>(new Set());
  const firstPollRef   = useRef(true);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Telegram config from localStorage once
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tgCfg');
      if (stored) {
        const cfg = JSON.parse(stored) as TelegramCfg;
        setTgCfg(cfg);
        setTgSaved(!!(cfg.botToken && cfg.chatId));
      }
    } catch {}
  }, []);

  // ── Send Telegram notification ─────────────────────────────────────────────
  const sendTelegram = useCallback(async (text: string) => {
    if (!tgCfg.botToken || !tgCfg.chatId) return;
    try {
      await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: tgCfg.botToken, chatId: tgCfg.chatId, text }),
      });
    } catch {}
  }, [tgCfg]);

  // ── Polling ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms-monitor?t=${Date.now()}`);
      if (!res.ok) { setConnected(false); return; }

      const data = await res.json();
      if (!data.success) { setConnected(false); return; }

      setConnected(true);
      setEndpoint(data.endpoint || '');
      setSmsData(data.sms || []);
      setCliStats(data.cliStats || []);

      // Detect brand-new CLIs (not seen in previous polls)
      if (!firstPollRef.current) {
        const brandNew: CLIStat[] = (data.cliStats || []).filter(
          (c: CLIStat) => !knownCLIsRef.current.has(c.cli)
        );
        if (brandNew.length > 0) {
          setNewCLIAlert(prev => {
            const existing = new Set(prev.map(p => p.cli));
            const toAdd = brandNew.filter(n => !existing.has(n.cli));
            return toAdd.length ? [...toAdd, ...prev] : prev;
          });
          // Send Telegram notification for each new CLI
          for (const nc of brandNew) {
            sendTelegram(formatTelegramNewCLI(nc.cli, nc.firstDetected, nc.count));
          }
        }
      }

      // Update known CLIs set
      (data.cliStats || []).forEach((c: CLIStat) => knownCLIsRef.current.add(c.cli));
      firstPollRef.current = false;
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [sendTelegram]);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveTgCfg = () => {
    if (!tgCfg.botToken || !tgCfg.chatId) {
      setTgStatus('error:Please fill in both fields');
      return;
    }
    localStorage.setItem('tgCfg', JSON.stringify(tgCfg));
    setTgSaved(true);
    setTgStatus('saved');
    setShowSettings(false);
  };

  const testTelegram = async () => {
    setTgStatus('sending');
    try {
      const res = await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tgCfg.botToken,
          chatId: tgCfg.chatId,
          text: '✅ <b>SMS Monitor</b> — Telegram notifications are working!',
        }),
      });
      const j = await res.json();
      setTgStatus(j.success ? 'ok' : `error:${j.error}`);
    } catch (e) {
      setTgStatus(`error:${e}`);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const dismissNewCLI = (cli: string) =>
    setNewCLIAlert(prev => prev.filter(c => c.cli !== cli));

  // ── Filtered SMS ───────────────────────────────────────────────────────────
  const filtered = smsData.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.number.includes(q) ||
      s.range.toLowerCase().includes(q) ||
      s.cli.toLowerCase().includes(q) ||
      s.client.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalPayout = smsData.reduce((sum, s) => sum + parseFloat(s.myPayout.replace('€', '') || '0'), 0);
  const uniqueCountries = new Set(smsData.map(s => s.range)).size;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0d12] text-white font-sans">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0d12]/90 backdrop-blur px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lime-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-lime-400/20">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">SMS Monitor</h1>
              <p className="text-[11px] text-white/30 mt-0.5">Real-time CLI tracking</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-white/30 text-[11px] uppercase tracking-widest">SMS</p>
              <p className="font-bold text-lime-400 tabular-nums">{smsData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-[11px] uppercase tracking-widest">CLIs</p>
              <p className="font-bold text-cyan-400 tabular-nums">{cliStats.length}</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-[11px] uppercase tracking-widest">Countries</p>
              <p className="font-bold text-purple-400 tabular-nums">{uniqueCountries}</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-[11px] uppercase tracking-widest">Payout</p>
              <p className="font-bold text-emerald-400 tabular-nums">€{totalPayout.toFixed(4)}</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              connected
                ? 'border-lime-500/40 bg-lime-500/10 text-lime-400'
                : 'border-red-500/40 bg-red-500/10 text-red-400'
            }`}>
              {connected
                ? <><Wifi className="w-3.5 h-3.5" /><span className="hidden sm:inline">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Offline</span></>
              }
            </div>

            {/* New CLI badge */}
            {newCLIAlert.length > 0 && (
              <button
                onClick={() => setActiveTab('new')}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 text-xs font-semibold animate-pulse"
              >
                <Zap className="w-3.5 h-3.5" />
                {newCLIAlert.length} New CLI{newCLIAlert.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchData}
              className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>

            {/* Telegram settings */}
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`p-2 rounded-lg border transition-colors ${
                tgSaved
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/10 hover:bg-white/5 text-white/50'
              }`}
              title="Telegram settings"
            >
              {tgSaved ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Telegram Settings Panel ── */}
      {showSettings && (
        <div className="border-b border-white/5 bg-[#0f1318] px-6 py-5">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-sm text-white/80">Telegram Notifications</h2>
              <span className="text-[11px] text-white/30 ml-2">
                New CLIs will be sent to your bot/channel instantly
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="password"
                placeholder="Bot Token  (from @BotFather)"
                value={tgCfg.botToken}
                onChange={e => setTgCfg(c => ({ ...c, botToken: e.target.value }))}
                className="col-span-1 lg:col-span-2 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 placeholder-white/20"
              />
              <input
                type="text"
                placeholder="Chat ID / Channel ID  (e.g. -1004283237367)"
                value={tgCfg.chatId}
                onChange={e => setTgCfg(c => ({ ...c, chatId: e.target.value }))}
                className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 placeholder-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveTgCfg}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-lime-400 to-cyan-400 text-black hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
                <button
                  onClick={testTelegram}
                  disabled={!tgCfg.botToken || !tgCfg.chatId}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-30"
                >
                  Test
                </button>
              </div>
            </div>
            {tgStatus && (
              <p className={`mt-2 text-xs ${tgStatus.startsWith('error') ? 'text-red-400' : tgStatus === 'ok' ? 'text-lime-400' : 'text-white/40'}`}>
                {tgStatus === 'ok' && '✓ Test message sent!'}
                {tgStatus === 'saved' && '✓ Saved — notifications active.'}
                {tgStatus === 'sending' && 'Sending test…'}
                {tgStatus.startsWith('error:') && `✗ ${tgStatus.slice(6)}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── NEW CLI Alert Banners ── */}
      {newCLIAlert.length > 0 && (
        <div className="bg-orange-500/8 border-b border-orange-500/20 px-6 py-3">
          <div className="max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-bold text-sm">New CLIs Detected in this session</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {newCLIAlert.map(nc => (
                <div
                  key={nc.cli}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-sm"
                >
                  <span className="text-orange-300 font-bold">{nc.cli}</span>
                  <span className="text-white/40 text-xs">{nc.firstDetected}</span>
                  <span className="text-lime-400 text-xs font-bold">{nc.count} SMS</span>
                  <button onClick={() => dismissNewCLI(nc.cli)} className="text-white/20 hover:text-white/60 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-white/5 pb-0">
          {([
            { key: 'sms',  label: 'SMS Log',   icon: MessageSquare, count: smsData.length },
            { key: 'clis', label: 'All CLIs',   icon: Hash,          count: cliStats.length },
            { key: 'new',  label: 'New CLIs',   icon: Zap,           count: newCLIAlert.length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-lime-400 text-lime-400'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-lime-400/20 text-lime-400'
                    : tab.key === 'new'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-white/5 text-white/30'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Search (right side) */}
          <div className="ml-auto">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearch(e.target.value)}
              className="w-56 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-lime-500 placeholder-white/20"
            />
          </div>
        </div>

        {/* ── TAB: SMS LOG ── */}
        {activeTab === 'sms' && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/3 border-b border-white/5">
                    {['TIME', 'RANGE', 'NUMBER', 'MY PAYOUT', 'AGENT PAYOUT', 'CLIENT', 'CLI', 'CONTENT'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-white/30 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-white/10 border-t-lime-400 rounded-full animate-spin" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-white/20 text-sm">
                        {connected ? 'No SMS data yet' : 'Not connected — check BASE_URL / TOKEN in .env.local'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((sms, idx) => (
                      <tr
                        key={sms.id || idx}
                        className="border-b border-white/4 hover:bg-white/3 transition-colors group"
                      >
                        <td className="px-4 py-2.5 text-white/40 whitespace-nowrap text-xs">{sms.time}</td>
                        <td className="px-4 py-2.5 font-semibold text-white/80 whitespace-nowrap">{sms.range}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/70 font-mono text-xs">{sms.number}</span>
                            <button
                              onClick={() => copyText(sms.number, sms.id + 'num')}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedId === sms.id + 'num'
                                ? <Check className="w-3.5 h-3.5 text-lime-400" />
                                : <Copy className="w-3.5 h-3.5 text-white/25" />
                              }
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-lime-400 whitespace-nowrap">{sms.myPayout}</td>
                        <td className="px-4 py-2.5 text-white/50 whitespace-nowrap">{sms.agentPayout}</td>
                        <td className="px-4 py-2.5 text-white/60 whitespace-nowrap">{sms.client}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold">
                            {sms.cli}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 max-w-lg">
                          <p className="text-white/60 text-xs leading-relaxed break-words whitespace-pre-wrap">
                            {sms.content}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-xs text-white/25">
              <span>{filtered.length} records {searchTerm && `(filtered from ${smsData.length})`}</span>
              {endpoint && <span>via <code className="text-white/40">{endpoint}</code></span>}
            </div>
          </div>
        )}

        {/* ── TAB: ALL CLIs ── */}
        {activeTab === 'clis' && (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/3 border-b border-white/5">
                    {['#', 'CLI NAME', 'FIRST DETECTED', 'TODAY SMS', 'TOTAL SMS'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-white/30 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-16 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-white/10 border-t-lime-400 rounded-full animate-spin" />
                    </td></tr>
                  ) : cliStats.length === 0 ? (
                    <tr><td colSpan={5} className="py-16 text-center text-white/20">No CLI data yet</td></tr>
                  ) : (
                    cliStats
                      .filter(c => !searchTerm || c.cli.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((c, i) => (
                        <tr key={c.cli} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 text-white/20 text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-2.5 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-bold">
                                {c.cli}
                              </span>
                              {newCLIAlert.some(n => n.cli === c.cli) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 uppercase tracking-wider">
                                  New
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{c.firstDetected}</td>
                          <td className="px-4 py-3 font-bold text-lime-400">{c.todayCount}</td>
                          <td className="px-4 py-3 font-bold text-white/70">{c.count}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: NEW CLIs ── */}
        {activeTab === 'new' && (
          <div>
            {newCLIAlert.length === 0 ? (
              <div className="rounded-xl border border-white/5 py-20 text-center text-white/20">
                <Zap className="w-10 h-10 mx-auto mb-3 text-white/10" />
                <p>No new CLIs detected yet in this session</p>
                <p className="text-xs mt-1 text-white/10">New CLIs will appear here as soon as they are detected</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {newCLIAlert.map(nc => (
                  <div
                    key={nc.cli}
                    className="relative rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/8 to-transparent p-5"
                  >
                    <button
                      onClick={() => dismissNewCLI(nc.cli)}
                      className="absolute top-3 right-3 text-white/15 hover:text-white/50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">New CLI</span>
                    </div>
                    <p className="text-xl font-bold text-white mb-1 truncate">{nc.cli}</p>
                    <p className="text-xs text-white/30 mb-3">First detected: {nc.firstDetected}</p>
                    <div className="flex gap-3">
                      <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Today</p>
                        <p className="font-bold text-lime-400 text-lg tabular-nums">{nc.todayCount}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Total</p>
                        <p className="font-bold text-white/70 text-lg tabular-nums">{nc.count}</p>
                      </div>
                    </div>
                    {tgSaved && (
                      <p className="mt-3 text-[10px] text-cyan-400/60 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Notification sent to Telegram
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
