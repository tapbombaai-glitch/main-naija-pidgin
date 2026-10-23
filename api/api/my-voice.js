async function loadSignedVoice(fileName, audioId) {
  try {
    const audio = document.getElementById(audioId);
    if (!audio || !fileName) return;

    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('Audio authentication required');
      return;
    }

    const response = await fetch(
      '/api/my-voice?file=' + encodeURIComponent(fileName),
      {
        headers: {
          Authorization: 'Bearer ' + session.access_token
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.signedUrl) {
      console.error('Audio loading failed:', data);
      return;
    }

    audio.src = data.signedUrl;
    audio.load();
  } catch (error) {
    console.error('Audio loading error:', error);
  }
}