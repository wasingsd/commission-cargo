export function parseTracking(trackingNo: string) {
    const s = (trackingNo || "").trim();
    // Look for the last dash
    const idx = s.lastIndexOf("-");

    // If no dash or dash is at the start, it's just base
    if (idx <= 0) return { base: s, suffix: null as number | null };

    const base = s.slice(0, idx);
    const tail = s.slice(idx + 1);
    const n = Number(tail);

    // If suffix is not a valid number, treat whole string as base
    if (!Number.isFinite(n) || n < 0) return { base: s, suffix: null };

    return { base, suffix: n };
}
