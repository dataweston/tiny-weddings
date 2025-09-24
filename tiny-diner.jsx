import React from 'react';

const DEV_FALLBACK = 'http://localhost:5410';

export default function TinyDinerProxy() {
  const configuredUrl = import.meta.env.VITE_TINY_DINER_URL;
  const targetUrl = configuredUrl || (import.meta.env.DEV ? DEV_FALLBACK : '');

  if (!targetUrl) {
    return (
      <div className="max-w-3xl space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-semibold">Tiny Diner Weddings</h2>
        <p>
          The Tiny Diner onboarding app runs as a standalone Next.js microservice located at
          <code className="ml-2 rounded bg-neutral-100 px-2 py-1">partner-tools/tiny-diner-app</code>.
        </p>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-neutral-700">
          <li>Start the service with <code>npm run dev</code> inside that folder.</li>
          <li>
            Set <code>VITE_TINY_DINER_URL</code> to the deployed URL (or use the dev port{' '}
            <code>{DEV_FALLBACK}</code>).
          </li>
          <li>Reload this page to embed the booking dashboard.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="flex h-[80vh] flex-col gap-4">
      <iframe
        title="Tiny Diner Wedding Onboarding"
        src={targetUrl}
        className="flex-1 rounded-xl border border-neutral-200 bg-white shadow-sm"
        allow="payment"
      />
      <p className="text-sm text-neutral-500">
        Embedded from <code>{targetUrl}</code>. Update <code>VITE_TINY_DINER_URL</code> to point to the deployed instance.
      </p>
    </div>
  );
}