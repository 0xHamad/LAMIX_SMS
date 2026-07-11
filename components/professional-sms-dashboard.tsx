'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertCircle, Phone, Globe2, Radio, MessageSquare } from 'lucide-react';

interface SMSData {
  stats: {
    total_sms: number;
    unique_countries: number;
    active_clis: number;
    total_payout: number;
  };
  data: Array<{
    time: string;
    country: string;
    phone: string;
    cli: string;
    message: string;
    payout: number;
  }>;
  new_clis: Array<{
    cli: string;
    count: number;
    country: string;
    first_seen: string;
  }>;
  numbers: Array<{
    number: string;
    count: number;
    country: string;
  }>;
  countries: Array<{
    country: string;
    count: number;
    revenue: number;
  }>;
}

const endpoints = [
  '/crapi/lamix/viewstats',
  '/crapi/lamix/stats',
  '/crapi/lamix/dashboard',
  '/crapi/lamix/sms',
  '/crapi/lamix/reports'
];

export default function ProfessionalSMSDashboard() {
  const [data, setData] = useState<SMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sms-pro');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
        setConnected(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-lime-400 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-cyan-400 font-mono text-sm">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredSMS = data?.data?.filter(item =>
    item.phone.includes(searchTerm) ||
    item.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.message.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-lime-400 rounded-lg flex items-center justify-center">
                  <Radio className="w-6 h-6 text-slate-950" />
                </div>
                <h1 className="text-3xl font-black tracking-tighter">SMS MONITOR</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${connected ? 'bg-lime-400' : 'bg-red-500'}`}></div>
                <span className="text-sm font-mono">{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

          {/* Top Metrics */}
          <section>
            <h2 className="text-lg font-mono text-cyan-400 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              SYSTEM METRICS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total SMS', value: data?.stats.total_sms || 0, icon: MessageSquare, color: 'cyan' },
                { label: 'Countries', value: data?.stats.unique_countries || 0, icon: Globe2, color: 'lime' },
                { label: 'Active CLIs', value: data?.stats.active_clis || 0, icon: Radio, color: 'cyan' },
                { label: 'Total Revenue', value: `$${(data?.stats.total_payout || 0).toFixed(2)}`, icon: TrendingUp, color: 'lime' },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className="group relative bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-slate-700/50 transition-all overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-${metric.color}-500/0 to-${metric.color}-500/5 group-hover:from-${metric.color}-500/5 group-hover:to-${metric.color}-500/10 transition-all`}></div>
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm font-mono uppercase tracking-wider">{metric.label}</span>
                      <metric.icon className={`w-5 h-5 text-${metric.color}-400`} />
                    </div>
                    <div className={`text-4xl font-black tracking-tighter text-${metric.color}-300`}>
                      {metric.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* New CLIs Section */}
          {data?.new_clis && data.new_clis.length > 0 && (
            <section>
              <h2 className="text-lg font-mono text-lime-400 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 animate-pulse" />
                NEW CLIs DETECTED
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.new_clis.slice(0, 6).map((cli, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-lime-500/20 to-lime-500/5 border border-lime-500/50 rounded-xl p-6 hover:border-lime-400/70 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lime-300 text-lg font-bold">{cli.cli}</span>
                        <span className="bg-lime-500/20 text-lime-300 px-3 py-1 rounded-full text-sm font-mono">{cli.count} SMS</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-sm">
                        <span>{cli.country}</span>
                        <span className="font-mono text-slate-500">{new Date(cli.first_seen).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Phone Numbers Section */}
          {data?.numbers && data.numbers.length > 0 && (
            <section>
              <h2 className="text-lg font-mono text-cyan-400 mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                PHONE NUMBERS ({data.numbers.length})
              </h2>
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/50">
                        <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Number</th>
                        <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Country</th>
                        <th className="px-6 py-4 text-right text-xs font-mono text-cyan-400 uppercase tracking-widest">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.numbers.slice(0, 10).map((num, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-800/30 hover:bg-cyan-500/5 transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-slate-300">{num.number}</td>
                          <td className="px-6 py-4 text-slate-400">{num.country}</td>
                          <td className="px-6 py-4 text-right font-mono text-lime-400">{num.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Countries Section */}
          {data?.countries && data.countries.length > 0 && (
            <section>
              <h2 className="text-lg font-mono text-cyan-400 mb-6 flex items-center gap-2">
                <Globe2 className="w-5 h-5" />
                COUNTRIES ({data.countries.length})
              </h2>
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/50">
                        <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Country</th>
                        <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">SMS Count</th>
                        <th className="px-6 py-4 text-right text-xs font-mono text-cyan-400 uppercase tracking-widest">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.countries.slice(0, 10).map((country, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-800/30 hover:bg-cyan-500/5 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-300">{country.country}</td>
                          <td className="px-6 py-4 font-mono text-lime-400">{country.count}</td>
                          <td className="px-6 py-4 text-right text-slate-400">${country.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* SMS Messages Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-mono text-cyan-400 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS LOG ({filteredSMS.length})
              </h2>
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Country</th>
                      <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">CLI</th>
                      <th className="px-6 py-4 text-left text-xs font-mono text-cyan-400 uppercase tracking-widest">Message</th>
                      <th className="px-6 py-4 text-right text-xs font-mono text-cyan-400 uppercase tracking-widest">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSMS.slice(0, 20).map((sms, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-800/30 hover:bg-cyan-500/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-slate-400 text-sm">{new Date(sms.time).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 text-slate-300">{sms.country}</td>
                        <td className="px-6 py-4 font-mono text-slate-300">{sms.phone}</td>
                        <td className="px-6 py-4 text-lime-400 font-mono font-bold">{sms.cli}</td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={sms.message}>{sms.message}</td>
                        <td className="px-6 py-4 text-right text-lime-300 font-mono font-bold">${sms.payout.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-red-300 font-mono text-sm">
              Error: {error}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
