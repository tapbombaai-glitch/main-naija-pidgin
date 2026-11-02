return NextResponse.json(
  {
    success: true,
    message: requiresVerification
      ? "Voice created. Verification is required before activation."
      : "Your real voice clone was created successfully!",

    // Fields expected by the frontend
    voice_id: savedVoice.elevenlabs_voice_id,
    requiresVerification,

    // Keep the complete voice record too
    voice: {
      id: savedVoice.id,
      name: savedVoice.name,
      voice_id: savedVoice.elevenlabs_voice_id,
      gender: savedVoice.gender,
      accent: savedVoice.accent,
      is_public: savedVoice.is_public,
      is_active: savedVoice.is_active,
      requires_verification: requiresVerification,
    },
  },
  {
    headers: {
      "Cache-Control": "no-store",
    },
  }
);