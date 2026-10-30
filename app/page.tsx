"use client";
import Link from "next/link";
import { useState } from "react";

export default function ChairmanOverview() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f0a]/95 backdrop-blur-md border-b border-[#1e2a1e] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="p-2 rounded-lg bg-[#111811] border border-[#1e2a1e] text-sm"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">👑</span>
            <div>
              <h1 className="text-sm font-bold leading-none">MAIN NAIJA</h1>
              <p className="text-[9px] text-[#00E676] font-bold tracking-widest mt-1">PIDGIN • CHAIRMAN PANEL</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">Chairman</span>
          <div className="w-8 h-8 rounded-full bg-[#00C853] flex items-center justify-center font-bold text-xs">C</div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed md:static top-[57px] left-0 z-40 w-64 h-[calc(100vh-57px)] md:h-auto bg-[#0d140d] border-r border-[#1e2a1e] p-4 flex flex-col transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <nav className="flex flex-col gap-1.5">
            <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${activeTab === "overview" ? "bg-[#00C853]/15 text-[#00E676] border-l-2 border-[#00C853]" : "text-gray-400 hover:bg-[#111811] hover:text-white"}`}>
              <span>📊</span> Overview
            </button>
            <Link href="/admin/recordings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#111811] hover:text-white">
              <span>🎙️</span> Recording Review
            </Link>
            <Link href="/admin/workers" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#111811] hover:text-white">
              <span>👷</span> Workers
            </Link>
            <Link href="/admin/announcements" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#111811] hover:text-white">
              <span>📢</span> Announcements
            </Link>
            <Link href="/admin/api" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#111811] hover:text-white">
              <span>🔑</span> API Management
            </Link>
          </nav>
          <div className="mt-auto pt-4 border-t border-[#1e2a1e]">
            <Link href="/" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#00C853] text-white text-sm font-bold">
              Logout →
            </Link>
            <p className="text-[10px] text-gray-600 text-center mt-3">tapbomba.ai@gmail.com</p>
          </div>
        </aside>

        {menuOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMenuOpen(false)} />}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Good Morning, Chairman 👑</h2>
            <p className="text-sm text-gray-400 mt-1">Here’s what’s happening on your platform today.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
              <p className="text-xs text-gray-400">👷 Total Workers</p>
              <p className="text-2xl font-bold mt-2">24</p>
              <p className="text-[11px] text-[#00E676] mt-2">↑ Active today</p>
            </div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
              <p className="text-xs text-gray-400">⏳ Pending Review</p>
              <p className="text-2xl font-bold mt-2 text-yellow-400">7</p>
              <p className="text-[11px] text-yellow-500 mt-2">Needs action</p>
            </div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
              <p className="text-xs text-gray-400">✅ Approved</p>
              <p className="text-2xl font-bold mt-2 text-[#00E676]">15</p>
              <p className="text-[11px] text-[#00E676] mt-2">Live now</p>
            </div>
            <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
              <p className="text-xs text-gray-400">❌ Rejected</p>
              <p className="text-2xl font-bold mt-2 text-red-400">2</p>
              <p className="text-[11px] text-red-400 mt-2">Removed</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">📈 Recording Activity</h3>
              <span className="bg-[#00C853] text-white text-[10px] px-3 py-1 rounded-full font-bold">This Year</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {[50,30,80,45,85,25,70,65,55,75,60,90].map((h,i) => (
                <div key={i} className="flex-1 bg-[#00E676] rounded-t-md" style={{height: `${h}%`}} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-gray-600">
              <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span>
            </div>
          </div>

          {/* Recent */}
          <div className="bg-[#111811] border border-[#1e2a1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Recent Submissions</h3>
              <span className="text-xs text-[#00E676]">View All →</span>
            </div>
            <div className="space-y-2">
              {[
                { id: "Worker-024", lang: "Pidgin", s: "Pending" },
                { id: "Worker-023", lang: "Hausa", s: "Approved" },
                { id: "Worker-022", lang: "Igbo", s: "Approved" },
              ].map(w => (
                <div key={w.id} className="flex items-center justify-between bg-[#0a0f0a] border border-[#1e2a1e] rounded-xl px-4 py-3">
                  <div><p className="text-sm font-bold">{w.id}</p><p className="text-xs text-gray-500">{w.lang}</p></div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${w.s === "Pending" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>{w.s}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}