'use client';

import { useEffect, useState } from 'react';
import { Bell, Settings, Copy, Check, AlertCircle, Send } from 'lucide-react';

interface SMSData {
  time: string;
  range: string;
  number: string;
  myPayout: string;
  agentPayout: string;
  client: string;
  cli: string;
  content: string;
}

interface NewCLI {
  cli: string;
  firstDetected: string;
  count: number;
}

interface TelegramConfig {
  botToken: string;
  userId: string;
}

export default function SMSMonitorDashboard() {
  const [smsData, setSmsData] = useState<SMSData[]>([]);
  const [newCLIs, setNewCLIs] = useState<NewCLI[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({ botToken: '', userId: '' });
  const [savedConfig, setSavedConfig] = useState<TelegramConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load Telegram config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('telegramConfig');
    if (stored) {
      const config = JSON.parse(stored);
      setSavedConfig(config);
      setTelegramConfig(config);
    }
  }, []);

  // Fetch SMS data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sms-monitor');
        if (response.ok) {
          const data = await response.json();
          setSmsData(data.sms || []);
          setNewCLIs(data.newCLIs || []);
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch (error) {
        console.error('Error fetching SMS data:', error);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Save Telegram config
  const saveTelegramConfig = () => {
    if (telegramConfig.botToken && telegramConfig.userId) {
      localStorage.setItem('telegramConfig', JSON.stringify(telegramConfig));
      setSavedConfig(telegramConfig);
      setShowSettings(false);
      alert('Telegram configuration saved!');
    } else {
      alert('Please fill in both Bot Token and User ID');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filter SMS data
  const filteredSMS = smsData.filter(sms =>
    sms.number.includes(searchTerm) ||
    sms.range.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sms.cli.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sms.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-lime-400 to-cyan-400 bg-clip-text text-transparent">
            SMS Monitor
          </h1>
          <p className="text-slate-400 mt-1">Real-time SMS and CLI Tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            connected ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
          }`}>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-sm font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Telegram Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Telegram Settings Panel */}
      {showSettings && (
        <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold">Telegram Notifications</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="password"
              placeholder="Bot Token (from @BotFather)"
              value={telegramConfig.botToken}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Chat ID (your Telegram user ID)"
              value={telegramConfig.userId}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, userId: e.target.value })}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            onClick={saveTelegramConfig}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-lime-400 to-cyan-400 text-slate-900 rounded-lg font-bold hover:shadow-lg hover:shadow-lime-400/50 transition-all"
          >
            Save Telegram Config
          </button>
          {savedConfig && (
            <p className="mt-3 text-sm text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Telegram notifications enabled
            </p>
          )}
        </div>
      )}

      {/* NEW CLIs Alert Section */}
      {newCLIs.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-400 animate-bounce" />
            <h2 className="text-2xl font-bold text-orange-400">NEW CLIs DETECTED!</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {newCLIs.map((newCLI, idx) => (
              <div key={idx} className="bg-slate-800/70 border border-orange-500/30 rounded-lg p-4 hover:border-orange-500 transition-colors">
                <p className="text-orange-400 font-bold text-lg">{newCLI.cli}</p>
                <p className="text-slate-400 text-sm mt-1">First detected: {newCLI.firstDetected}</p>
                <p className="text-lime-400 font-bold mt-2">{newCLI.count} SMS</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Search by number, range, CLI, or client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* SMS Data Table */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">TIME</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">RANGE</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">NUMBER</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">MY PAYOUT</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">AGENT PAYOUT</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">CLIENT</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">CLI</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-cyan-400">CONTENT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredSMS.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No SMS data available
                  </td>
                </tr>
              ) : (
                filteredSMS.map((sms, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3 text-sm text-slate-300">{sms.time}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{sms.range}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{sms.number}</span>
                        <button
                          onClick={() => copyToClipboard(sms.number, idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-lime-400">{sms.myPayout}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-300">{sms.agentPayout}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{sms.client}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 font-bold">
                        {sms.cli}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate hover:text-slate-300 transition-colors" title={sms.content}>
                      {sms.content}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total SMS</p>
          <p className="text-3xl font-bold text-lime-400 mt-1">{filteredSMS.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total My Payout</p>
          <p className="text-3xl font-bold text-lime-400 mt-1">
            €{filteredSMS.reduce((sum, sms) => sum + parseFloat(sms.myPayout), 0).toFixed(4)}
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">New CLIs</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{newCLIs.length}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Telegram Status</p>
          <p className={`text-lg font-bold mt-1 ${savedConfig ? 'text-green-400' : 'text-slate-400'}`}>
            {savedConfig ? 'Connected' : 'Not Configured'}
          </p>
        </div>
      </div>
    </div>
  );
}
