'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, Wifi, WifiOff } from 'lucide-react'

interface SMSMessage {
  time: string
  country: string
  phone: string
  cli: string
  message: string
  payout: number
}

interface DashboardMetrics {
  total_sms: number
  unique_countries: number
  active_cli: number
  total_payout: number
  data: SMSMessage[]
}

const COUNTRY_MAP: Record<string, string> = {
  '91': 'India',
  '92': 'Pakistan',
  '880': 'Bangladesh',
  '977': 'Nepal',
  '94': 'Sri Lanka',
  '886': 'Taiwan',
  '852': 'Hong Kong',
  '853': 'Macau',
  '60': 'Malaysia',
  '65': 'Singapore',
  '84': 'Vietnam',
  '66': 'Thailand',
  '62': 'Indonesia',
  '63': 'Philippines',
  '852': 'Hong Kong',
  '81': 'Japan',
  '82': 'South Korea',
  '86': 'China',
  '1': 'USA',
  '1': 'Canada',
  '44': 'UK',
  '33': 'France',
  '49': 'Germany',
  '39': 'Italy',
  '34': 'Spain',
  '31': 'Netherlands',
  '32': 'Belgium',
  '43': 'Austria',
  '41': 'Switzerland',
}

export function SMSDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sms')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setMetrics(data)
      setConnected(true)
    } catch (error) {
      console.error('Failed to fetch SMS data:', error)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (metrics?.data && metrics.data.length > 0) {
      const latestId = `${metrics.data[0].time}-${metrics.data[0].phone}`
      setHighlightedIds(new Set([latestId]))
      const timer = setTimeout(() => setHighlightedIds(new Set()), 3000)
      return () => clearTimeout(timer)
    }
  }, [metrics?.data?.length])

  const getCountryName = (phone: string): string => {
    for (const [prefix, country] of Object.entries(COUNTRY_MAP)) {
      if (phone.startsWith(prefix)) return country
    }
    return 'Unknown'
  }

  const filteredData = metrics?.data.filter(msg =>
    msg.phone.includes(search) ||
    msg.message.toLowerCase().includes(search.toLowerCase()) ||
    getCountryName(msg.phone).toLowerCase().includes(search.toLowerCase())
  ) || []

  const handleClearAll = () => {
    if (confirm('Clear all messages?')) {
      setMetrics(prev => prev ? { ...prev, data: [] } : null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">SMS Dashboard</h1>
              <div className="flex items-center gap-2">
                {connected ? (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-red-400">Disconnected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Total SMS</div>
              <div className="text-2xl font-bold text-cyan-400">
                {metrics?.total_sms || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Unique Countries</div>
              <div className="text-2xl font-bold text-purple-400">
                {metrics?.unique_countries || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Active CLIs</div>
              <div className="text-2xl font-bold text-pink-400">
                {metrics?.active_cli || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Total Payout</div>
              <div className="text-2xl font-bold text-green-400">
                ${metrics?.total_payout.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by phone, country, or message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No SMS messages found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Time</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Country</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">CLI</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-semibold">Message</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((msg, idx) => {
                  const msgId = `${msg.time}-${msg.phone}`
                  const isHighlighted = highlightedIds.has(msgId)
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-slate-700/30 transition-colors duration-300 ${
                        isHighlighted ? 'bg-cyan-500/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {msg.time}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {getCountryName(msg.phone)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {msg.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {msg.cli}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate hover:text-clip">
                        <div title={msg.message} className="truncate">
                          {msg.message}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-semibold">
                        ${msg.payout.toFixed(4)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
