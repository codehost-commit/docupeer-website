export function sanitizeSessionDescriptionSdp(sdp: string) {
  const lines = String(sdp || "").replace(/\r\n/g, "\n").split("\n");
  const removedPayloads = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^a=rtpmap:(\d+)\s+telephone-event\//i);
    if (match?.[1]) removedPayloads.add(match[1]);
  }

  if (!removedPayloads.size) return sdp;

  const cleaned = lines
    .map((line) => {
      if (line.startsWith("m=")) {
        const parts = line.split(" ");
        if (parts.length > 3) {
          return parts.filter((part, index) => index < 3 || !removedPayloads.has(part)).join(" ");
        }
      }
      return line;
    })
    .filter((line) => {
      for (const payload of removedPayloads) {
        if (line.startsWith(`a=rtpmap:${payload} `)) return false;
        if (line.startsWith(`a=fmtp:${payload} `)) return false;
        if (line.startsWith(`a=rtcp-fb:${payload} `)) return false;
      }
      return true;
    });

  return `${cleaned.join("\r\n").replace(/(\r\n)+$/, "")}\r\n`;
}
