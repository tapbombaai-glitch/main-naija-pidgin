'use client';

import Link from 'next/link';

const links = [
  {
    icon: '🎙️',
    title: 'Worker Panel',
    description: 'Record Pidgin sentences and submit your recordings.',
    href: '/worker',
    button: 'Enter Worker Panel',
  },
  {
    icon: '👑',
    title: 'Chairman Panel',
    description: 'Sign in to access authorized Chairman functions.',
    href: '/login',
    button: 'Chairman Login',
  },
  {
    icon: '🔑',
    title: 'API Customer Panel',
    description: 'Access your API key and manage your API credits.',
    href: '/api-keys',
    button: 'Enter API Panel',
  },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#07110b',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: '35px 18px',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header
          style={{
            textAlign: 'center',
            padding: '35px 10px',
            marginBottom: 25,
          }}
        >
          <div style={{ fontSize: 48 }}>🎙️</div>

          <h1
            style={{
              color: '#d4af37',
              fontSize: 'clamp(28px, 5vw, 42px)',
              margin: '15px 0',
            }}
          >
            Main Naija Pidgin
          </h1>

          <p
            style={{
              color: '#d1d5db',
              fontSize: 17,
              lineHeight: 1.8,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            Welcome! Choose your dashboard below to continue.
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 20,
          }}
        >
          {links.map((item) => (
            <article
              key={item.title}
              style={{
                background: '#102017',
                border: '1px solid #806b2a',
                borderRadius: 16,
                padding: '28px 22px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 250,
              }}
            >
              <div style={{ fontSize: 38 }}>{item.icon}</div>

              <h2
                style={{
                  color: '#f5d76e',
                  fontSize: 22,
                  margin: '18px 0 10px',
                }}
              >
                {item.title}
              </h2>

              <p
                style={{
                  color: '#d1d5db',
                  fontSize: 15,
                  lineHeight: 1.8,
                  flexGrow: 1,
                }}
              >
                {item.description}
              </p>

              <Link
                href={item.href}
                style={{
                  display: 'block',
                  background: '#176b39',
                  color: '#ffffff',
                  textDecoration: 'none',
                  textAlign: 'center',
                  padding: '14px 12px',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  marginTop: 20,
                }}
              >
                {item.button}
              </Link>
            </article>
          ))}
        </section>

        <footer
          style={{
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
            marginTop: 40,
            paddingBottom: 20,
          }}
        >
          Main Naija Pidgin · Voice Recording & API Platform
        </footer>
      </div>
    </main>
  );
}