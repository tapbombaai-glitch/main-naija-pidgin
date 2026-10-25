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

        <footer className="mt-8 text-center text-sm text-gray-500">
          Main Naija Pidgin · Worker Workspace
        </footer>
      </div>
    </main>
  );
}