// Generate images with no API key and no account. See README.md.
/** The service this module talks to. */
export const BASE_URL = "https://veida.ai";
/** Credit balance a signed-out caller starts with. */
export const ANON_GRANT = 4;
/** What one generated image costs, so the grant pays for exactly one. */
export const COST_TEXT_TO_IMAGE = 4;
/** Credits one machine may spend per day regardless of client ids. */
export const IP_DAILY_CEILING = 30;
/** The free text-to-image engine. */
export const MODEL = "veida-image-v1";
/** Aspect ratios the free engine accepts. */
export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
/** Base error; check the subclass to decide what to do next. */
export class VeidaError extends Error {
}
/** The free allowance is spent for this machine today. Wait, or sign in. */
export class QuotaError extends VeidaError {
}
/** The content filter refused the prompt. Reword it rather than retrying. */
export class RejectedError extends VeidaError {
}
/** The deadline passed while the job was still queued. */
export class TimeoutError extends VeidaError {
}
/** A fresh client id. The grant pays for one image, so ids are never reused. */
export function anonId() {
    return "js-" + crypto.randomUUID();
}
/** The quota wall answers HTTP 200 with code 0, so it is recognised by a field. */
export function parseSubmit(env) {
    if (env.code !== 0)
        throw new VeidaError(env.message || "request failed");
    const d = env.data || {};
    if (d.wall) {
        if (d.reason === "anon_ip_daily") {
            throw new QuotaError(`this machine has used its ${IP_DAILY_CEILING} free credits for today; sign in at https://veida.ai/pricing`);
        }
        throw new QuotaError(`free allowance spent (${d.reason}); sign in at https://veida.ai/pricing`);
    }
    if (!d.id)
        throw new VeidaError("the service returned no task id");
    return String(d.id);
}
/** Status is not monotonic, so only a terminal failure ends the wait early. */
export function parsePoll(env) {
    const d = env.data || {};
    const url = Array.isArray(d.images) ? d.images[0] : undefined;
    if (url)
        return { url, watermarked: Array.isArray(d.watermarked) && d.watermarked[0] === true };
    const s = String(d.status || "").toLowerCase();
    if (s === "failed" || s === "error") {
        throw new RejectedError("the prompt was refused by the content filter; reword it");
    }
    return null;
}
/** Turn a prompt into an image. */
export async function generate(prompt, opts = {}) {
    if (!prompt || !prompt.trim())
        throw new VeidaError("prompt is required");
    const ratio = opts.aspectRatio ?? "1:1";
    if (!ASPECT_RATIOS.includes(ratio)) {
        throw new VeidaError(`aspectRatio must be one of ${ASPECT_RATIOS.join(", ")}`);
    }
    const base = opts.baseUrl ?? BASE_URL;
    const deadline = Date.now() + (opts.timeoutMs ?? 240_000);
    const headers = { "content-type": "application/json", "x-anon-id": anonId() };
    const res = await fetch(`${base}/api/ai/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            provider: "kie",
            mediaType: "image",
            model: MODEL,
            scene: "text-to-image",
            prompt,
            options: { aspect_ratio: ratio },
        }),
    });
    const task = parseSubmit(await res.json());
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, opts.pollMs ?? 4000));
        let env;
        try {
            const q = await fetch(`${base}/api/ai/anon-query?taskId=${encodeURIComponent(task)}&provider=kie&mediaType=image`, { headers });
            env = await q.json();
        }
        catch {
            continue; // a dropped connection mid-queue is not a failed generation
        }
        if (env.code !== 0)
            continue;
        const img = parsePoll(env);
        if (img)
            return img;
    }
    throw new TimeoutError("still queued when the deadline passed");
}
