"use client";

import Link from "next/link";
import { useState } from "react";

export default function ChairmanOverview() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      <header className="sticky top-0 z-50 bg-[#0a0f0a]/95 backdrop-blur-md border-b border-[#1e2a1e] px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg bg-[#111811] border border-[#1e2a1e] hover:bg-[#162016] transition text-sm">
              {menuOpen ? "✕" : "☰"}
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-lg">👑</span>
              <div>
                <h1 className="text-sm font-bold leading-tight">MAIN NAIJA</h1>
                <p className="text-[10px] text-green-500 font-semibold tracking-wide">PIDGIN • CHAIRMAN PANEL</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">Chairman</span>
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold">C</div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        <aside className={`fixed top-[57px] left-0 z-40 w-56 h-[calc(100vh-57px)] bg-[#0d140d] border-r border-[#1e2a1e] p-4 flex flex-col transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:h-auto`}>
          <nav className="flex flex-col gap-1.5 flex-1">
            <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-600/15 text-green-500 border-l-2 border-green-500 text-sm font-semibold"><span>📊</span> Overview</Link>
            <Link href="/admin/recordings" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#111811] hover:text-white text-sm transition"><span>🎙️</span> Recording Review</Link>
            <Link href="/admin/workers" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#111811] hover:text-white text-sm transition"><span>👷</span> Workers</Link>
            <Link href="/admin/announcements" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#111811] hover:text-white text-sm transition"><span>📢</span> Announcements</Link>
          </nav>
          <div className="mt-auto pt-4 border-t border-[#1e2a1e]">
            <Link href="/" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-500 transition"><span>→</span> Logout</Link>
            <p className="text-[10px] text-gray-600 text-center mt-3">tapbomba.ai@gmail.com</p>
          </div>
        </aside>

        {menuOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMenuOpen(false)} />}

        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">Good Morning, Chairman <span>👑</span></h2>
            <p className="text-sm text-gray-400 mt-1">Here’s what’s happening on your platform today.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4"><div className="text-gray-400 text-xs mb-1">👷 Total Workers</div><p className="text-2xl font-bold">24</p><p className="text-xs text-green-500 mt-1">↑ Active</p></div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4"><div className="text-gray-400 text-xs mb-1">⏳ Pending</div><p className="text-2xl font-bold text-yellow-400">7</p><p className="text-xs text-yellow-500 mt-1">Needs review</p></div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4"><div className="text-gray-400 text-xs mb-1">✅ Approved</div><p className="text-2xl font-bold text-green-400">15</p><p className="text-xs text-green-500 mt-1">Live</p></div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4"><div className="text-gray-400 text-xs mb-1">❌ Rejected</div><p className="text-2xl font-bold text-red-400">2</p><p className="text-xs text-red-500 mt-1">Removed</p></div>
          </div>

          <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">📈 Recording Activity</h3>
              <div className="flex gap-2"><span className="bg-green-600 text-white px-2.5 py-1 rounded-full text-[10px] font-semibold">This Year</span><span className="bg-[#1e2a1e] text-gray-500 px-2.5 py-1 rounded-full text-[10px]">Month</span></div>
            </div>
            <div className="flex items-end gap-2 h-28 overflow-x-auto pb-2">
              {[
                { m: "Jan", h: 50 }, { m: "Feb", h: 30 }, { m: "Mar", h: 80 }, { m: "Apr", h: 45 },
                { m: "May", h: 85 }, { m: "Jun", h: 25 }, { m: "Jul", h: 70 }, { m: "Aug", h: 65 },
                { m: "Sep", h: 55 }, { m: "Oct", h: 75 }, { m: "Nov", h: 60 }, { m: "Dec", h: 90 },
              ].map((b) => (
                <div key={b.m} className="flex-shrink-0 w-6 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-green-500 rounded-t-md" style={{ height: `${b.h}%` }} />
                  <span className="text-[9px] text-gray-500">{b.m}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Submissions</h3>
              <Link href="/admin/recordings" className="text-xs text-green-500 font-medium hover:underline">View All →</Link>
            </div>
            <div className="space-y-3">
              {[
                { id: "Worker-024", lang: "Pidgin", status: "Pending" },
                { id: "Worker-023", lang: "Hausa", status: "Approved" },
                { id: "Worker-022", lang: "Igbo", status: "Approved" },
                { id: "Worker-021", lang: "Yoruba", status: "Pending" },
              ].map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-[#0a0f0a] border border-[#1e2a1e] rounded-xl px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold">{w.id}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{w.lang}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${w.status === "Pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}