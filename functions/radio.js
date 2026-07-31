const STREAM_URL = "http://s12.myradiostream.com:19856/listen.mp3";

export async function onRequestGet() {
  try {
    const stream = await fetch(STREAM_URL, {
      headers: { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.1", "Icy-MetaData": "0" }
    });
    if (!stream.ok || !stream.body) return new Response("Station unavailable", { status: 502 });
    return new Response(stream.body, {
      headers: {
        "Content-Type": stream.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch {
    return new Response("Station unavailable", { status: 502 });
  }
}
