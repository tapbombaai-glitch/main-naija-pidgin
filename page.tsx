'use client';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 20px',
        fontFamily: 'Arial, sans-serif',
        background: '#07110b',
        color: '#ffffff',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '60px auto',
          padding: '35px 25px',
          background: '#102017',
          border: '1px solid #d4af37',
          borderRadius: '16px',
          boxShadow: '0 10px 35px rgba(0,0,0,0.35)',
        }}
      >
        <h1
          style={{
            color: '#d4af37',
            fontSize: 'clamp(26px, 5vw, 38px)',
            marginBottom: '20px',
          }}
        >
          Main Naija Pidgin dey LIVE! ✅
        </h1>

        <p style={{ fontSize: '18px', lineHeight: 1.7 }}>
          Chairman, welcome to Main Naija Pidgin!
        </p>

        <p style={{ color: '#cbd5ce', lineHeight: 1.8 }}>
          Your application recovery page don load successfully.
        </p>

        <p style={{ color: '#cbd5ce', lineHeight: 1.8 }}>
          Your existing Supabase users and recordings remain in your database
          unless they have been deleted. This page does not modify your data.
        </p>

        <a
          href="/worker"
          style={{
            display: 'inline-block',
            marginTop: '25px',
            padding: '14px 26px',
            background: '#16803c',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 'bold',
            borderRadius: '8px',
          }}
        >
          Go to Worker Panel
        </a>

        <p
          style={{
            marginTop: '30px',
            color: '#9ca3af',
            fontSize: '13px',
          }}
        >
          Main Naija Pidgin · Application Status
        </p>
      </div>
    </main>
  );
}