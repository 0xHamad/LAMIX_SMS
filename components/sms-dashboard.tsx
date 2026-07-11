"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Trash2, Wifi, WifiOff, MessageSquare, Globe, Radio, DollarSign } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawSmsRecord {
  dt: string
  num: string
  cli: string
  message: string
  payout: string
}

interface SmsRecord extends RawSmsRecord {
  id: string
  country: string
}

// ─── Country prefix map ───────────────────────────────────────────────────────

const PREFIX_MAP: { prefix: string; country: string }[] = [
  { prefix: "601", country: "Malaysia" },
  { prefix: "602", country: "Egypt" },
  { prefix: "603", country: "Malaysia" },
  { prefix: "6010", country: "Malaysia" },
  { prefix: "60", country: "Malaysia" },
  { prefix: "62", country: "Indonesia" },
  { prefix: "63", country: "Philippines" },
  { prefix: "64", country: "New Zealand" },
  { prefix: "65", country: "Singapore" },
  { prefix: "66", country: "Thailand" },
  { prefix: "84", country: "Vietnam" },
  { prefix: "880", country: "Bangladesh" },
  { prefix: "886", country: "Taiwan" },
  { prefix: "90", country: "Turkey" },
  { prefix: "91", country: "India" },
  { prefix: "92", country: "Pakistan" },
  { prefix: "93", country: "Afghanistan" },
  { prefix: "94", country: "Sri Lanka" },
  { prefix: "95", country: "Myanmar" },
  { prefix: "98", country: "Iran" },
  { prefix: "1", country: "USA/Canada" },
  { prefix: "20", country: "Egypt" },
  { prefix: "212", country: "Morocco" },
  { prefix: "213", country: "Algeria" },
  { prefix: "216", country: "Tunisia" },
  { prefix: "218", country: "Libya" },
  { prefix: "220", country: "Gambia" },
  { prefix: "221", country: "Senegal" },
  { prefix: "222", country: "Mauritania" },
  { prefix: "225", country: "Ivory Coast" },
  { prefix: "227", country: "Niger" },
  { prefix: "228", country: "Togo" },
  { prefix: "229", country: "Benin" },
  { prefix: "231", country: "Liberia" },
  { prefix: "233", country: "Ghana" },
  { prefix: "234", country: "Nigeria" },
  { prefix: "235", country: "Chad" },
  { prefix: "237", country: "Cameroon" },
  { prefix: "243", country: "DR Congo" },
  { prefix: "244", country: "Angola" },
  { prefix: "245", country: "Guinea-Bissau" },
  { prefix: "249", country: "Sudan" },
  { prefix: "251", country: "Ethiopia" },
  { prefix: "254", country: "Kenya" },
  { prefix: "255", country: "Tanzania" },
  { prefix: "256", country: "Uganda" },
  { prefix: "260", country: "Zambia" },
  { prefix: "261", country: "Madagascar" },
  { prefix: "263", country: "Zimbabwe" },
  { prefix: "264", country: "Namibia" },
  { prefix: "265", country: "Malawi" },
  { prefix: "266", country: "Lesotho" },
  { prefix: "267", country: "Botswana" },
  { prefix: "268", country: "Swaziland" },
  { prefix: "27", country: "South Africa" },
  { prefix: "30", country: "Greece" },
  { prefix: "31", country: "Netherlands" },
  { prefix: "32", country: "Belgium" },
  { prefix: "33", country: "France" },
  { prefix: "34", country: "Spain" },
  { prefix: "36", country: "Hungary" },
  { prefix: "39", country: "Italy" },
  { prefix: "40", country: "Romania" },
  { prefix: "41", country: "Switzerland" },
  { prefix: "43", country: "Austria" },
  { prefix: "44", country: "UK" },
  { prefix: "45", country: "Denmark" },
  { prefix: "46", country: "Sweden" },
  { prefix: "47", country: "Norway" },
  { prefix: "48", country: "Poland" },
  { prefix: "49", country: "Germany" },
  { prefix: "51", country: "Peru" },
  { prefix: "52", country: "Mexico" },
  { prefix: "53", country: "Cuba" },
  { prefix: "54", country: "Argentina" },
  { prefix: "55", country: "Brazil" },
  { prefix: "56", country: "Chile" },
  { prefix: "57", country: "Colombia" },
  { prefix: "58", country: "Venezuela" },
  { prefix: "7", country: "Russia" },
  { prefix: "81", country: "Japan" },
  { prefix: "82", country: "South Korea" },
  { prefix: "86", country: "China" },
]

function getCountry(num: string): string {
  const digits = num.replace(/^\+/, "")
  // Sort by longest prefix first for most specific match
  const sorted = [...PREFIX_MAP].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const { prefix, country } of sorted) {
    if (digits.startsWith(prefix)) return country
  }
  return "Unknown"
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl border p-5 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
          {label}
        </span>
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${color}18`, color }}
        >
          <Icon size={16} />
        </span>
      </div>
      <div className="text-3xl font-mono font-bold tabular-nums" style={{ color: "#fff" }}>
        {value}
      </div>
    </div>
  )
}

// ─── Table Row ───────────────────────────────────────────────────────────────

function SmsRow({ record, isNew }: { record: SmsRecord; isNew: boolean }) {
  const [hover, setHover] = useState(false)

  const date = new Date(record.dt.replace(" ", "T"))
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })

  const short = record.message.length > 100 ? record.message.slice(0, 97) + "…" : record.message

  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        transition: "background 0.15s",
        background: isNew
          ? "rgba(0,210,255,0.07)"
          : hover
          ? "rgba(255,255,255,0.03)"
          : "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Time */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-xs font-mono" style={{ color: "#00d2ff" }}>
          {timeStr}
        </div>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {dateStr}
        </div>
      </td>
      {/* Country */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
          style={{
            background: "rgba(0,210,255,0.12)",
            color: "#00d2ff",
            border: "1px solid rgba(0,210,255,0.2)",
          }}
        >
          {record.country}
        </span>
      </td>
      {/* Phone */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
          +{record.num}
        </span>
      </td>
      {/* CLI */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-bold"
          style={{
            background: "rgba(120,80,255,0.15)",
            color: "#a78bfa",
            border: "1px solid rgba(120,80,255,0.25)",
          }}
        >
          {record.cli}
        </span>
      </td>
      {/* Message */}
      <td className="px-4 py-3 max-w-xs">
        <span
          title={record.message}
          className="block text-sm leading-relaxed cursor-default"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {short}
        </span>
      </td>
      {/* Payout */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="font-mono text-sm font-semibold" style={{ color: "#4ade80" }}>
          ${parseFloat(record.payout).toFixed(4)}
        </span>
      </td>
    </tr>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const API_URL = "/api/sms"

export default function SmsDashboard() {
  const [messages, setMessages] = useState<SmsRecord[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [connected, setConnected] = useState<boolean | null>(null)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buildId = (r: RawSmsRecord) => `${r.dt}|${r.num}|${r.cli}|${r.message.slice(0, 20)}`

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { cache: "no-store" })
      if (!res.ok) throw new Error("Non-OK response")
      const json = await res.json()
      const raw: RawSmsRecord[] = json?.data ?? []

      const freshIds: string[] = []
      const fresh: SmsRecord[] = []

      for (const r of raw) {
        const id = buildId(r)
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id)
          freshIds.push(id)
          fresh.push({ ...r, id, country: getCountry(r.num) })
        }
      }

      if (fresh.length > 0) {
        setMessages((prev) => [...fresh.reverse(), ...prev])
        setNewIds((prev) => {
          const next = new Set(prev)
          freshIds.forEach((id) => next.add(id))
          return next
        })
        // Remove "new" highlight after 3s
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev)
            freshIds.forEach((id) => next.delete(id))
            return next
          })
        }, 3000)
      }

      setConnected(true)
      setLastPoll(new Date())
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    intervalRef.current = setInterval(fetchMessages, 500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMessages])

  const clearAll = () => {
    setMessages([])
    seenRef.current.clear()
    setNewIds(new Set())
  }

  // ── Derived metrics ───────────────────────────────────────────────────────

  const filtered = messages.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.cli.toLowerCase().includes(q) ||
      m.country.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q) ||
      m.num.includes(q)
    )
  })

  const totalSms = messages.length
  const uniqueCountries = new Set(messages.map((m) => m.country)).size
  const activeClis = new Set(messages.map((m) => m.cli)).size
  const totalPayout = messages.reduce((acc, m) => acc + parseFloat(m.payout || "0"), 0)

  return (
    <div
      className="min-h-screen font-mono"
      style={{
        background: "linear-gradient(135deg, #050d1a 0%, #06101f 50%, #070d1c 100%)",
        color: "#fff",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(5,13,26,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,210,255,0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "rgba(0,210,255,0.12)", border: "1px solid rgba(0,210,255,0.25)" }}
          >
            <MessageSquare size={18} style={{ color: "#00d2ff" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#fff" }}>
              Live SMS Dashboard
            </h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Real-time message monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastPoll && (
            <span className="hidden sm:block text-xs font-sans" style={{ color: "rgba(255,255,255,0.35)" }}>
              Last poll: {lastPoll.toLocaleTimeString()}
            </span>
          )}
          {/* Connection indicator */}
          <div className="flex items-center gap-2">
            {connected === null ? (
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: "#facc15", boxShadow: "0 0 8px #facc15" }}
              />
            ) : connected ? (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}
                />
                <Wifi size={14} style={{ color: "#4ade80" }} />
                <span className="text-xs font-sans" style={{ color: "#4ade80" }}>
                  Connected
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: "#f87171", boxShadow: "0 0 8px #f87171" }}
                />
                <WifiOff size={14} style={{ color: "#f87171" }} />
                <span className="text-xs font-sans" style={{ color: "#f87171" }}>
                  Disconnected
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* ── Metric cards ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4">
          <MetricCard icon={MessageSquare} label="Total SMS" value={totalSms.toLocaleString()} color="#00d2ff" />
          <MetricCard icon={Globe} label="Unique Countries" value={uniqueCountries} color="#a78bfa" />
          <MetricCard icon={Radio} label="Active CLIs" value={activeClis} color="#fb923c" />
          <MetricCard icon={DollarSign} label="Total Payout" value={`$${totalPayout.toFixed(4)}`} color="#4ade80" />
        </div>

        {/* ── Controls ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-2 flex-1 min-w-48 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Search size={15} style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              placeholder="Search by CLI, country, message or number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm font-sans placeholder:text-white/30"
              style={{ color: "#fff" }}
            />
          </div>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-semibold transition-all"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171",
            }}
          >
            <Trash2 size={14} />
            Clear All
          </button>
          <span className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.35)" }}>
            {filtered.length} of {messages.length} rows
          </span>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div
          ref={tableRef}
          className="rounded-xl overflow-auto"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            maxHeight: "calc(100vh - 340px)",
            minHeight: "300px",
          }}
        >
          <table className="w-full border-collapse text-sm">
            <thead
              className="sticky top-0 z-10"
              style={{
                background: "rgba(5,13,26,0.95)",
                backdropFilter: "blur(8px)",
                borderBottom: "1px solid rgba(0,210,255,0.15)",
              }}
            >
              <tr>
                {["Time", "Country", "Phone Number", "CLI", "Message", "Payout"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "rgba(0,210,255,0.7)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center font-sans" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {messages.length === 0 ? "Waiting for messages…" : "No results match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => <SmsRow key={m.id} record={m} isNew={newIds.has(m.id)} />)
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
