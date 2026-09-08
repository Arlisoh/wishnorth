import { assertPublicHttpUrl } from "@/lib/urlSafety";

type PublicFetchOptions = {
  headers?: HeadersInit;
  maxRedirects?: number;
  timeoutMs?: number;
};

export async function fetchPublicUrl(input: string | URL, options: PublicFetchOptions = {}) {
  let current = input instanceof URL ? input : new URL(input);
  const maxRedirects = options.maxRedirects ?? 5;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicHttpUrl(current.toString());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
    try {
      const response = await fetch(current, {
        headers: options.headers,
        redirect: "manual",
        signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect had no location");
        current = new URL(location, current);
        continue;
      }
      return { response, finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects");
}

export async function readBytesLimited(response: Response, maxBytes: number) {
  const announced = Number(response.headers.get("content-length") || "0");
  if (announced > maxBytes) throw new Error("Remote response is too large");
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("Remote response is too large");
        throw new Error("Remote response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function readTextLimited(response: Response, maxBytes: number) {
  return new TextDecoder("utf-8", { fatal: false }).decode(await readBytesLimited(response, maxBytes));
}
