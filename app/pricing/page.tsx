'use client';

import { useState } from 'react';

const plans = [
{ name: 'Free', price: 0, credits: 100, description: '100 free API credits' },
{ name: 'Starter', price: 5000, credits: 1000, description: '1,000 API credits' },
{ name: '2K', price: 10000, credits: 2000, description: '2,000 API credits' },
{ name: 'Popular', price: 25000, credits: 5000, description: '5,000 API credits' },
{ name: '10K', price: 50000, credits: 10000, description: '10,000 API credits' },
];

export default function Pricing() {
const [loading, setLoading] = useState('');
const [error, setError] = useState('');

async function buy(plan: (typeof plans)[number]) {
setError('');

if (plan.price === 0) {
  window.location.href = '/api-keys';
  return;
}

try {
  setLoading(plan.name);

  const response = await fetch('/api/paystack/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan: plan.name,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Unable to start payment. Please try again.');
  }

  window.location.href = data.url;
} catch (err) {
  setError(
    err instanceof Error
      ? err.message
      : 'Something went wrong. Please try again.',
  );
  setLoading('');
}

}

return (
<main className="min-h-screen bg-black px-5 py-10 text-white">
<div className="mx-auto max-w-6xl">
<h1 className="mb-3 text-center text-3xl font-bold text-yellow-400 sm:text-4xl">
Main Naija Pidgin API
</h1>

    <p className="mb-10 text-center text-gray-300">
      Choose your API credit package.
    </p>

    {error && (
      <p
        role="alert"
        className="mx-auto mb-6 max-w-xl rounded-lg border border-red-500 p-3 text-center text-red-300"
      >
        {error}
      </p>
    )}

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <section
          key={plan.name}
          className="rounded-2xl border border-yellow-500/40 bg-gray-950 p-6 text-center"
        >
          <h2 className="mb-3 text-2xl font-bold">{plan.name}</h2>

          <p className="mb-2 text-3xl font-bold text-yellow-400">
            {plan.price === 0
              ? 'FREE'
              : `₦${plan.price.toLocaleString('en-NG')}`}
          </p>

          <p className="mb-6 text-gray-300">{plan.description}</p>

          <button
            type="button"
            onClick={() => buy(plan)}
            disabled={loading !== ''}
            className="w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === plan.name
              ? 'Please wait...'
              : plan.price === 0
                ? 'Get Started'
                : 'Buy Now'}
          </button>
        </section>
      ))}
    </div>
  </div>
</main>

);
}