async function loadSignedVoice(fileName, audioId) {
  try {
    const audio = document.getElementById(audioId);
    if (!audio || !fileName) return;

    const { data: { session }, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError || !session?.access_token) {
      console.error('Audio authentication required - Login as tapbomba.ai@gmail.com');
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
      console.error('Audio loading failed:', data, 'File:', fileName);
      return;
    }

    console.log('Audio loaded:', fileName);
    audio.src = data.signedUrl;
    audio.load();
  } catch (error) {
    console.error('Audio loading error:', error, 'File:', fileName);
  }
}