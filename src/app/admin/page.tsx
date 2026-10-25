export default function AdminPage() {
return (
<main className="min-h-screen bg-black p-6 text-white">
<div className="mx-auto max-w-3xl">
<header className="mb-8 border-b border-yellow-600 pb-5">
<p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
Main Naija Pidgin
</p>
<h1 className="mt-3 text-3xl font-bold">Chairman Dashboard</h1>
<p className="mt-2 text-gray-400">
Recording approvals and API key administration.
</p>
</header>

    <section className="rounded-xl border border-yellow-700 bg-yellow-950/20 p-5">
      <h2 className="text-xl font-semibold text-yellow-300">
        Chairman Access Required
      </h2>

      <p className="mt-4 leading-7 text-gray-300">
        This dashboard is reserved for the authorized Chairman account.
      </p>

      <p className="mt-3 break-all font-semibold text-white">
        tapbomba.ai@gmail.com
      </p>

      <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900 p-4">
        <p className="font-semibold">Administrative functions</p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-gray-300">
          <li>Review and approve worker recordings.</li>
          <li>Reject recordings that do not meet requirements.</li>
          <li>Review API key requests and payment status.</li>
          <li>Manage customer credit balances.</li>
        </ul>
      </div>

      <div className="mt-5 rounded-lg border border-red-800 bg-red-950/30 p-4">
        <p className="font-semibold text-red-300">
          Administrative actions are not enabled on this page yet.
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          Access must be verified against the authenticated Supabase user
          on the server before any administrative data or actions are
          enabled. Do not use a browser-only email check as security.
        </p>
      </div>

      <a
        href="/login"
        className="mt-6 inline-block rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-black hover:bg-yellow-500"
      >
        Go to Login
      </a>
    </section>

    <footer className="mt-8 text-center text-sm text-gray-500">
      Main Naija Pidgin · Chairman Administration
    </footer>
  </div>
</main>

);
}