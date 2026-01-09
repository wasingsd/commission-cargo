export function parseTracking(trackingNo: string) {
    const s = (trackingNo || "").trim();
    const idx = s.lastIndexOf("-");

    if (idx <= 0) return { base: s, suffix: null as number | null };

    const base = s.slice(0, idx);
    const tail = s.slice(idx + 1);
    const n = Number(tail);

    if (!Number.isFinite(n) || n < 0) return { base: s, suffix: null };

    return { base, suffix: n };
}
