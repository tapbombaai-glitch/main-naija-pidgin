"use client";

import Link from "next/link";

export default function WorkerPage() {
return (
<main className="min-h-screen bg-black p-6 text-white">
<div className="mx-auto max-w-3xl">
<header className="mb-8 border-b border-yellow-600 pb-5">
<p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
Main Naija Pidgin
</p>
<h1 className="mt-3 text-3xl font-bold">Worker Panel</h1>
<p className="mt-2 text-gray-400">
Welcome to your recording workspace.
</p>
</header>

<section className="rounded-xl border border-gray-800 bg-gray-900 p-5">  
      <h2 className="text-xl font-semibold">Recording Workspace</h2>  
      <p className="mt-3 leading-7 text-gray-300">  
        Use your authorized worker account to access recording features.  
        Submitted recordings should be reviewed by the Chairman before  
        they become available through the customer API.  
      </p>  

      <div className="mt-5 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">  
        <p className="font-semibold text-yellow-300">Recording status</p>  
        <p className="mt-2 text-sm text-gray-300">  
          Your existing recordings remain in Supabase. This page does not  
          create, delete, approve, or modify recordings.  
        </p>  
      </div>  

      <nav className="mt-6 flex flex-wrap gap-3">  
        <Link  
          href="/login"  
          className="rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600"  
        >  
          Go to Login  
        </Link>  
        <Link  
          href="/"  
          className="rounded-lg border border-gray-600 px-5 py-3 hover:bg-gray-800"  
        >  
          Home  
        </Link>  
        <Link  
          href="/pricing"  
          className="rounded-lg border border-gray-600 px-5 py-3 hover:bg-gray-800"  
        >  
          View Pricing  
        </Link>  
      </nav>  
    </section>  

    {/* === NEW: MANY PLAY AUDIOS - SAFE ADD === */}  
    <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-5">  
      <h2 className="text-xl font-semibold text-yellow-400">Assigned Audios to Play</h2>  
      <p className="mt-2 text-sm text-gray-400">Play, listen, and record your version.</p>  
        
      <div className="mt-5 space-y-4">  
        {/* AUDIO 1 */}  
        <div className="rounded-lg border border-gray-700 p-4">  
          <p className="font-semibold">1. How you dey?</p>  
          <audio controls className="mt-2 w-full"><source src="/audio1.mp3" /></audio>  
          <button className="mt-2 rounded bg-yellow-600 px-4 py-2 text-sm">Record My Version</button>  
        </div>  

        {/* AUDIO 2 */}  
        <div className="rounded-lg border border-gray-700 p-4">  
          <p className="font-semibold">2. I dey come now now</p>  
          <audio controls className="mt-2 w-full"><source src="/audio2.mp3" /></audio>  
          <button className="mt-2 rounded bg-yellow-600 px-4 py-2 text-sm">Record My Version</button>  
        </div>  

        {/* AUDIO 3 */}  
        <div className="rounded-lg border border-gray-700 p-4">  
          <p className="font-semibold">3. Wetin dey sup?</p>  
          <audio controls className="mt-2 w-full"><source src="/audio3.mp3" /></audio>  
          <button className="mt-2 rounded bg-yellow-600 px-4 py-2 text-sm">Record My Version</button>  
        </div>  

        {/* AUDIO 4 - Add as many as you want */}  
        <div className="rounded-lg border border-gray-700 p-4">  
          <p className="font-semibold">4. Abeg shift small</p>  
          <audio controls className="mt-2 w-full"><source src="/audio4.mp3" /></audio>  
          <button className="mt-2 rounded bg-yellow-600 px-4 py-2 text-sm">Record My Version</button>  
        </div>  
      </div>  
    </section>  
    {/* === END NEW ADD === */}  

    <footer className="mt-8 text-center text-sm text-gray-500">  
      Main Naija Pidgin · Worker Workspace  
    </footer>  
  </div>  
</main>

);
}