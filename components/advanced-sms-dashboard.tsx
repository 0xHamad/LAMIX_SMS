'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, AlertCircle, TrendingUp, Globe, Phone, MessageSquare, Zap } from 'lucide-react';

interface SMSData {
  totalSms: number;
  countries: Record<string, number>;
  clis: Record<string, number>;
  numbers: Record<string, number>;
  messages: Array<{
    time: string;
    country: string;
    phone: string;
    cli: string;
    message: string;
    payout: number;
  }>;
  newClis: string[];
}

export default function AdvancedSMSDashboard() {
  const [data, setData] = useState<SMSData>({
    totalSms: 0,
    countries: {},
    clis: {},
    numbers: {},
    messages: [],
    newClis: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const newCliNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sms-monitor', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          const result = await response.json();
          
          // Detect new CLIs
          const previousClis = new Set(Object.keys(data.clis));
          const newDetectedClis = Object.keys(result.clis || {}).filter(
            (cli) => !previousClis.has(cli)
          );

          if (newDetectedClis.length > 0) {
            newDetectedClis.forEach((cli) => {
              if (!newCliNotifiedRef.current.has(cli)) {
                newCliNotifiedRef.current.add(cli);
                // Send Telegram notification
                fetch('/api/telegram-notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: `🆕 NEW CLI DETECTED!\nCLI: ${cli}\nTime: ${new Date().toLocaleString()}`,
                  }),
                }).catch(console.error);
              }
            });
          }

          setData({
            ...result,
            newClis: newDetectedClis,
          });
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

  const filteredMessages = data.messages.filter(
    (msg) =>
      msg.phone.includes(searchTerm) ||
      msg.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countryArray = Object.entries(data.countries)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const cliArray = Object.entries(data.clis)
    .map(([cli, count]) => ({ cli, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const numbersArray = Object.entries(data.numbers)
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const totalPayout = data.messages.reduce((sum, msg) => sum + msg.payout, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-800/50 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-lime-500 animate-pulse"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-lime-400 to-green-500 bg-clip-text text-transparent">
                SMS Monitor
              </h1>
              <span className={`text-xs px-3 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={MessageSquare}
            label="Total SMS"
            value={data.totalSms.toLocaleString()}
            gradient="from-blue-500 to-cyan-500"
          />
          <MetricCard
            icon={Globe}
            label="Countries"
            value={Object.keys(data.countries).length}
            gradient="from-purple-500 to-pink-500"
          />
          <MetricCard
            icon={Zap}
            label="Active CLIs"
            value={Object.keys(data.clis).length}
            gradient="from-orange-500 to-red-500"
          />
          <MetricCard
            icon={TrendingUp}
            label="Total Payout"
            value={`$${totalPayout.toFixed(2)}`}
            gradient="from-lime-500 to-green-500"
          />
        </div>

        {/* NEW CLIs Alert Section */}
        {data.newClis.length > 0 && (
          <div className="mb-8 p-4 rounded-lg bg-gradient-to-r from-lime-500/20 to-green-500/20 border border-lime-500/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lime-400 mb-2">New CLIs Detected!</h3>
                <div className="flex flex-wrap gap-2">
                  {data.newClis.map((cli) => (
                    <span key={cli} className="px-3 py-1 bg-lime-500/30 text-lime-200 rounded-full text-sm font-mono animate-pulse">
                      {cli}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone, country, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 text-white placeholder-slate-400 transition"
            />
          </div>
        </div>

        {/* Data Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Numbers Section */}
          <DataSection title="Top Phone Numbers" icon={Phone} data={numbersArray} type="numbers" />

          {/* Countries Section */}
          <DataSection title="Countries" icon={Globe} data={countryArray} type="countries" />

          {/* CLIs Section */}
          <div className="lg:col-span-2">
            <DataSection title="Active CLIs" icon={Zap} data={cliArray} type="clis" />
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              SMS Messages ({filteredMessages.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/30 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-slate-400 font-semibold">Time</th>
                  <th className="px-6 py-3 text-left text-slate-400 font-semibold">Country</th>
                  <th className="px-6 py-3 text-left text-slate-400 font-semibold">Phone</th>
                  <th className="px-6 py-3 text-left text-slate-400 font-semibold">CLI</th>
                  <th className="px-6 py-3 text-left text-slate-400 font-semibold">Message</th>
                  <th className="px-6 py-3 text-right text-slate-400 font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredMessages.length > 0 ? (
                  filteredMessages.map((msg, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-3 text-slate-300 font-mono text-xs">{msg.time}</td>
                      <td className="px-6 py-3 text-slate-300">{msg.country}</td>
                      <td className="px-6 py-3 font-mono text-cyan-400">{msg.phone}</td>
                      <td className="px-6 py-3 font-mono text-lime-400">{msg.cli}</td>
                      <td className="px-6 py-3 text-slate-400 truncate max-w-xs" title={msg.message}>
                        {msg.message.substring(0, 50)}...
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-green-400">${msg.payout.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No messages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: any;
  label: string;
  value: string | number;
  gradient: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} p-px rounded-lg`}>
      <div className="bg-slate-900/80 backdrop-blur px-6 py-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-400 font-medium">{label}</span>
        </div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

function DataSection({
  title,
  icon: Icon,
  data,
  type,
}: {
  title: string;
  icon: any;
  data: any[];
  type: string;
}) {
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <h3 className="font-bold flex items-center gap-2">
          <Icon className="w-5 h-5 text-lime-400" />
          {title}
        </h3>
      </div>
      <div className="divide-y divide-slate-700">
        {data.length > 0 ? (
          data.map((item, idx) => (
            <div key={idx} className="px-6 py-3 hover:bg-slate-800/30 transition flex items-center justify-between">
              <span className="font-mono text-sm text-slate-300">
                {type === 'countries' ? item.name : type === 'clis' ? item.cli : item.number}
              </span>
              <span className="text-lime-400 font-bold">{item.count}</span>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-slate-400">No data available</div>
        )}
      </div>
    </div>
  );
}
