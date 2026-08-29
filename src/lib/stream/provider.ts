/** Video stream provider adapter — Mux / Daily / mock embed. */

export type StreamConfig = {
  title: string;
  embedUrl: string;
  provider: string;
  isLive: boolean;
};

export interface StreamProvider {
  getEmbedUrl(streamId: string): Promise<string>;
  createLiveStream?(title: string): Promise<{ id: string; embedUrl: string }>;
}

export class MockStreamProvider implements StreamProvider {
  async getEmbedUrl(_streamId: string) {
    return process.env.MOCK_STREAM_URL ?? "https://www.youtube.com/embed/dQw4w9WgXcQ";
  }
}

export class MuxStreamProvider implements StreamProvider {
  constructor(private tokenId: string, private tokenSecret: string) {}

  async getEmbedUrl(playbackId: string) {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }

  async createLiveStream(title: string) {
    const auth = Buffer.from(`${this.tokenId}:${this.tokenSecret}`).toString("base64");
    const res = await fetch("https://api.mux.com/video/v1/live-streams", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playback_policy: ["signed"],
        new_asset_settings: { playback_policy: ["signed"] },
        passthrough: title,
      }),
    });
    if (!res.ok) throw new Error("MUX_CREATE_FAILED");
    const data = (await res.json()) as {
      data: { id: string; playback_ids: { id: string }[] };
    };
    const playbackId = data.data.playback_ids[0]?.id ?? data.data.id;
    return {
      id: data.data.id,
      embedUrl: `https://stream.mux.com/${playbackId}.m3u8`,
    };
  }
}

export class DailyStreamProvider implements StreamProvider {
  constructor(private apiKey: string) {}

  async getEmbedUrl(roomName: string) {
    return `https://eventsliner.daily.co/${roomName}`;
  }

  async createLiveStream(title: string) {
    const roomName = title.toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: roomName, properties: { enable_chat: true } }),
    });
    if (!res.ok) throw new Error("DAILY_CREATE_FAILED");
    const data = (await res.json()) as { name: string; url: string };
    return { id: data.name, embedUrl: data.url };
  }
}

export function getStreamProvider(): StreamProvider {
  const muxId = process.env.MUX_TOKEN_ID;
  const muxSecret = process.env.MUX_TOKEN_SECRET;
  if (muxId && muxSecret) return new MuxStreamProvider(muxId, muxSecret);

  const dailyKey = process.env.DAILY_API_KEY;
  if (dailyKey) return new DailyStreamProvider(dailyKey);

  return new MockStreamProvider();
}
