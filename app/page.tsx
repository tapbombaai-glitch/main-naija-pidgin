"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white font-sans antialiased">
      {/* Status bar simulation */}
      <div className="px-5 pt-3 pb-2 flex justify-between text-xs text-gray-400">
        <span>1:09 AM</span>
        <div className="flex gap-1 items-center">
          <span>LTE</span>
          <span>•••</span>
          <span>100</span>
        </div>
      </div>

      <div className="px-5 pb-10 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00C853]/20 flex items-center justify-center text-sm font-bold text-[#00C853]">
              NP
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">MAIN NAIJA PIDGIN</h1>
              <p className="text-[10px] text-gray-400">Today</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              LIVE
            </span>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">Welcome to Main Naija Pidgin</h2>
          <p className="text-sm text-gray-400">
            Build with pidgin. Deploy fast. Run Naija.
          </p>
        </div>

        {/* Two Main Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* Worker Panel */}
          <div className="bg-[#111811] border border-[#00C853]/20 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💼</span>
              <h3 className="font-semibold text-sm">Worker Panel</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Manage ops & tasks</p>
            <Link href="/worker-dashboard" className="mt-auto">
              <button className="w-full bg-[#00C853] text-black text-sm font-semibold py-2.5 rounded-xl">
                Enter Workspace
              </button>
            </Link>
          </div>

          {/* Chairman Dashboard */}
          <div className="bg-[#111811] border border-yellow-500/30 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👑</span>
              <h3 className="font-semibold text-sm">Chairman Dashboard</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Lead & analytics</p>
            <button className="mt-auto w-full border border-yellow-500/50 text-yellow-400 text-sm font-semibold py-2.5 rounded-xl">
              Open Dashboard
            </button>
          </div>
        </div>

        {/* API Marketplace Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#00C853]">🛡️</span>
            <h3 className="font-semibold">API Marketplace</h3>
          </div>

          <div className="bg-[#111811] border border-[#00C853]/15 rounded-2xl p-4 mb-4">
            <p className="text-xs text-gray-400 mb-2">API key</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/40 rounded-lg px-3 py-2.5 font-mono text-sm text-gray-300 truncate">
                mk_live_••••••••••••_naija
              </div>
              <button className="bg-[#00C853]/20 text-[#00C853] px-3 py-2.5 rounded-lg text-xs font-medium">
                Copy
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#111811] border border-[#00C853]/15 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 mb-1">FREE REQUESTS</div>
              <div className="text-sm font-bold text-[#00C853]">2,500/mo</div>
            </div>
            <div className="bg-[#111811] border border-[#00C853]/15 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 mb-1">DATASETS LIVE</div>
              <div className="text-sm font-bold text-[#00C853]">12</div>
            </div>
            <div className="bg-[#111811] border border-[#00C853]/15 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 mb-1">UPTIME</div>
              <div className="text-sm font-bold text-[#00C853]">99.9%</div>
            </div>
          </div>
        </div>

        {/* Preview Voices */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎧</span>
            <h3 className="font-semibold">Preview Voices</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Lagos Male", desc: "Natural • Young" },
              { name: "Abuja Female", desc: "Warm • Professional" },
              { name: "Pidgin Narrator", desc: "Story • Expressive" },
              { name: "GET /api/datasets", desc: "Fetch live local datasets" },
              { name: "Delta", desc: "Rugged • Local" },
              { name: "Yoruba Mix", desc: "Hybrid • Bilingual" },
            ].map((voice, i) => (
              <div
                key={i}
                className="bg-[#111811] border border-[#00C853]/15 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🇳🇬</span>
                  <div>
                    <div className="text-xs font-medium">{voice.name}</div>
                    <div className="text-[10px] text-gray-400">{voice.desc}</div>
                  </div>
                </div>
                <button className="w-8 h-8 rounded-full bg-[#00C853]/20 flex items-center justify-center text-[#00C853] text-sm">
                  ▶
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Available Endpoints */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#00C853]">↔</span>
            <h3 className="font-semibold">Available Endpoints</h3>
          </div>

          <div className="bg-[#111811] border border-[#00C853]/15 rounded-2xl p-4 space-y-3 text-sm">
            <div>
              <span className="text-[#00C853] font-mono text-xs">GET /api/voices</span>
              <p className="text-xs text-gray-400">List all available voices</p>
            </div>
            <div>
              <span className="text-yellow-400 font-mono text-xs">POST /api/synthesize</span>
              <p className="text-xs text-gray-400">Create speech from text (pidgin supported)</p>
            </div>
            <div>
              <span className="text-yellow-400 font-mono text-xs">POST /api/feedback</span>
              <p className="text-xs text-gray-400">Submit feedback & improve model</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-600 mt-8">
          Secured • Powered by Naija Cloud • v1.2.0
        </p>
      </div>
    </div>
  );
}