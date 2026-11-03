export async function DELETE(req: Request) {
  const { voiceId } = await req.json();
  const key = process.env.ELEVENLABS_API_KEY;
  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": key! }
  });
  const data = await res.json();
  return Response.json(data);
}