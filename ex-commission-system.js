import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, Plus, Trash2, Settings2, Copy, History } from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

/**
 * PR Cargo – Commission Calculator (Latest)
 *
 * ✅ รองรับตั้งค่าราคาทุนตามประเภทสินค้า/ขนส่ง
 * ✅ Preview ต้นทุนต่อแถว (CBM vs KG) และเลือกค่าที่สูงกว่า
 * ✅ กติกาคอม:
 *    - ถ้า Sell_Base === Cost_Final  -> ค่าคอม = 1% * Sell_Base
 *    - ถ้าไม่เท่ากัน               -> ค่าคอม = Sell_Base - Cost_Final
 * ✅ Tracking ที่มี -1/-2/... = “เลขซ้ำหลายกล่อง” (ไม่ใช่จำนวนชิ้น)
 *    ตัวอย่าง base เดียวกัน:
 *      710062350068
 *      710062350068-1
 *      710062350068-2
 * ✅ Export/Import CSV ใช้งานได้จริง + Template
 * ✅ Log เหตุการณ์ (เช่น ปรับเรทแล้วรายการเก่าถูกคำนวณใหม่)
 */

// ----------------- utils -----------------
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

const fmtMoney = (n: number) =>
    (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });

// Parse numbers that may include commas and decimals.
const parseNumber = (v: unknown) => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const cleaned = s.replace(/,/g, "").replace(/\s+/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
};

const yyyyMm = (d: string) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
};

/**
 * splitTracking
 * - ถ้ามีท้าย -n จะถือว่าเป็น “เลขซ้ำหลายกล่อง”
 * - base = ก่อนขีดสุดท้าย
 * - suffix = n
 * - hasSuffix = true เมื่อมี -n
 */
const splitTracking = (tracking: string) => {
    const s = (tracking || "").trim();
    const idx = s.lastIndexOf("-");
    if (idx <= 0) return { base: s, suffix: "", hasSuffix: false };
    const base = s.slice(0, idx);
    const suffixStr = s.slice(idx + 1);
    const n = Number(suffixStr);
    if (!Number.isFinite(n) || n < 0) return { base: s, suffix: "", hasSuffix: false };
    return { base, suffix: suffixStr, hasSuffix: true };
};

function safeUUID() {
    try {
        // @ts-ignore
        if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    } catch {
        // ignore
    }
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }
}

function downloadText(filename: string, text: string) {
    try {
        const isCSV = filename.toLowerCase().endsWith(".csv");
        const content = isCSV ? `\ufeff${text}` : text; // BOM for Excel/Thai
        const mime = isCSV ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8";
        const blob = new Blob([content], { type: mime });

        // @ts-ignore (legacy IE)
        if (window.navigator?.msSaveOrOpenBlob) {
            // @ts-ignore
            window.navigator.msSaveOrOpenBlob(blob, filename);
            return true;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return true;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Download failed", err);
        return false;
    }
}

// ----------------- rates -----------------
type ProductType = "ทั่วไป" | "มอก" | "อย" | "พิเศษ";
type Transport = "รถ" | "เรือ";

type RateRow = {
    type: ProductType;
    ship_cbm: number; // บาท/คิว (เรือ)
    ship_kg: number; // บาท/กก. (เรือ)
    truck_cbm: number; // บาท/คิว (รถ)
    truck_kg: number; // บาท/กก. (รถ)
};

const DEFAULT_RATES: RateRow[] = [
    { type: "ทั่วไป", ship_cbm: 3500, ship_kg: 17, truck_cbm: 5500, truck_kg: 25 },
    { type: "มอก", ship_cbm: 4000, ship_kg: 20, truck_cbm: 6000, truck_kg: 26 },
    { type: "อย", ship_cbm: 4500, ship_kg: 26, truck_cbm: 6200, truck_kg: 35 },
    { type: "พิเศษ", ship_cbm: 6000, ship_kg: 60, truck_cbm: 7500, truck_kg: 75 },
];

// ----------------- rows -----------------
type Row = {
    id: string;
    dateIn: string;
    customer: string;
    salesCode: string;
    salesName: string;
    tracking: string;

    productType: ProductType;
    transport: Transport;

    weightKg: string; // allow decimals
    cbm: string; // allow decimals

    useAutoCost: boolean;
    costManual: string;

    sellBase: string;
    note?: string;

    // computed
    month?: string;
    trackingBase?: string;
    trackingSuffix?: string;
    trackingHasSuffix?: boolean;

    costCbm?: number;
    costKg?: number;
    costFinal?: number;
    costRule?: "CBM" | "KG" | "MANUAL" | "";

    commission?: number;
    method?: "" | "DIFF" | "1%";
    flag?: "" | "Sell<Cost" | "1%" | "OK" | "MISSING_COST";
};

type CostResult = {
    costCbm: number;
    costKg: number;
    costFinal: number;
    costRule: Row["costRule"];
    missingAutoInputs: boolean;
};

function computeCost(
    ratesMap: Map<ProductType, RateRow>,
    productType: ProductType,
    transport: Transport,
    weightKg: number,
    cbm: number,
    useAutoCost: boolean,
    manual: number,
): CostResult {
    if (!useAutoCost) {
        const m = Number.isFinite(manual) ? manual : 0;
        return {
            costCbm: 0,
            costKg: 0,
            costFinal: round2(m),
            costRule: m ? "MANUAL" : "",
            missingAutoInputs: false,
        };
    }

    const r = ratesMap.get(productType);
    if (!r) {
        return { costCbm: 0, costKg: 0, costFinal: 0, costRule: "", missingAutoInputs: true };
    }

    const missingAutoInputs = weightKg <= 0 && cbm <= 0;
    if (missingAutoInputs) {
        return { costCbm: 0, costKg: 0, costFinal: 0, costRule: "", missingAutoInputs: true };
    }

    const rateCbm = transport === "รถ" ? r.truck_cbm : r.ship_cbm;
    const rateKg = transport === "รถ" ? r.truck_kg : r.ship_kg;

    const costCbm = round2(cbm * rateCbm);
    const costKg = round2(weightKg * rateKg);

    if (costCbm >= costKg) {
        return { costCbm, costKg, costFinal: costCbm, costRule: "CBM", missingAutoInputs: false };
    }
    return { costCbm, costKg, costFinal: costKg, costRule: "KG", missingAutoInputs: false };
}

function computeRow(row: Row, ratesMap: Map<ProductType, RateRow>): Row {
    const sellBaseN = parseNumber(row.sellBase);
    const weightKgN = parseNumber(row.weightKg);
    const cbmN = parseNumber(row.cbm);
    const manualN = parseNumber(row.costManual);

    const costObj = computeCost(ratesMap, row.productType, row.transport, weightKgN, cbmN, row.useAutoCost, manualN);
    const costFinalN = round2(costObj.costFinal);

    const costReady = row.useAutoCost ? !costObj.missingAutoInputs : true;

    const method: Row["method"] =
        !costReady || (sellBaseN === 0 && costFinalN === 0)
            ? ""
            : sellBaseN === costFinalN
                ? "1%"
                : "DIFF";

    const commission =
        !costReady || (sellBaseN === 0 && costFinalN === 0)
            ? 0
            : sellBaseN === costFinalN
                ? round2(sellBaseN * 0.01)
                : round2(sellBaseN - costFinalN);

    const flag: Row["flag"] =
        !costReady && sellBaseN > 0
            ? "MISSING_COST"
            : sellBaseN === 0 && costFinalN === 0
                ? ""
                : sellBaseN < costFinalN
                    ? "Sell<Cost"
                    : sellBaseN === costFinalN
                        ? "1%"
                        : "OK";

    const m = row.dateIn ? yyyyMm(row.dateIn) : "";
    const t = splitTracking(row.tracking);

    return {
        ...row,
        month: m,
        trackingBase: t.base,
        trackingSuffix: t.suffix,
        trackingHasSuffix: t.hasSuffix,

        costCbm: costObj.costCbm,
        costKg: costObj.costKg,
        costFinal: costFinalN,
        costRule: costObj.costRule,

        commission,
        method,
        flag,
    };
}

// ----------------- CSV -----------------
const CSV_TEMPLATE_LATEST =
    "date_in,customer_code,sales_code,sales_name,tracking_no,product_type,transport,weight_kg,cbm,use_auto_cost,cost_manual,sell_base,note\n" +
    "2025-10-22,PR-027,S-01,Pluy,710062350068-1,ทั่วไป,รถ,100,0.5,true,,4000,ตัวอย่าง (คิดตามคิว)\n" +
    "2025-10-29,PR-014,S-02,Knight,73578475778144,มอก,เรือ,500,1,true,,12000,ตัวอย่าง (คิดตามน้ำหนัก)\n";

function toCSV(rows: Row[]) {
    const headers = [
        "date_in",
        "customer_code",
        "sales_code",
        "sales_name",
        "tracking_no",
        "product_type",
        "transport",
        "weight_kg",
        "cbm",
        "use_auto_cost",
        "cost_manual",
        "cost_final",
        "cost_rule",
        "sell_base",
        "commission_method",
        "commission",
        "flag",
        "note",
    ];

    const safe = (s: string) => (s || "").replace(/,/g, " ");

    const lines = [headers.join(",")];
    for (const r of rows) {
        const vals = [
            r.dateIn || "",
            safe(r.customer || ""),
            safe(r.salesCode || ""),
            safe(r.salesName || ""),
            safe(r.tracking || ""),
            safe(r.productType || ""),
            safe(r.transport || ""),
            String(parseNumber(r.weightKg)),
            String(parseNumber(r.cbm)),
            String(Boolean(r.useAutoCost)),
            String(parseNumber(r.costManual)),
            String(parseNumber(r.costFinal)),
            r.costRule || "",
            String(parseNumber(r.sellBase)),
            r.method || "",
            String(r.commission ?? 0),
            r.flag || "",
            safe(r.note || ""),
        ];
        lines.push(vals.join(","));
    }

    return lines.join("\n");
}

function parseCSV(text: string): Partial<Row>[] {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);

    const iDate = idx("date_in");
    const iCust = idx("customer_code");
    const iSalesCode = idx("sales_code");
    const iSalesName = idx("sales_name");
    const iTrack = idx("tracking_no");
    const iType = idx("product_type");
    const iTrans = idx("transport");
    const iKg = idx("weight_kg");
    const iCbm = idx("cbm");
    const iAuto = idx("use_auto_cost");
    const iManual = idx("cost_manual");
    const iSell = idx("sell_base");
    const iNote = idx("note");

    const normalizeType = (v: string): ProductType => {
        const s = (v || "").trim();
        if (s === "มอก" || s === "อย" || s === "พิเศษ" || s === "ทั่วไป") return s;
        return "ทั่วไป";
    };

    const normalizeTransport = (v: string): Transport => {
        const s = (v || "").trim();
        if (s === "เรือ" || s === "ทางเรือ") return "เรือ";
        if (s === "รถ" || s === "ทางรถ") return "รถ";
        return "รถ";
    };

    const parseBool = (v: string) => {
        const s = (v || "").trim().toLowerCase();
        return s === "true" || s === "1" || s === "yes" || s === "y";
    };

    const out: Partial<Row>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        out.push({
            dateIn: iDate >= 0 ? parts[iDate]?.trim() : "",
            customer: iCust >= 0 ? parts[iCust]?.trim() : "",
            salesCode: iSalesCode >= 0 ? parts[iSalesCode]?.trim() : "",
            salesName: iSalesName >= 0 ? parts[iSalesName]?.trim() : "",
            tracking: iTrack >= 0 ? parts[iTrack]?.trim() : "",

            productType: normalizeType(iType >= 0 ? parts[iType] : "ทั่วไป"),
            transport: normalizeTransport(iTrans >= 0 ? parts[iTrans] : "รถ"),
            weightKg: iKg >= 0 ? (parts[iKg] || "").trim() : "",
            cbm: iCbm >= 0 ? (parts[iCbm] || "").trim() : "",
            useAutoCost: parseBool(iAuto >= 0 ? parts[iAuto] : "true"),
            costManual: iManual >= 0 ? (parts[iManual] || "").trim() : "",

            sellBase: iSell >= 0 ? (parts[iSell] || "").trim() : "",
            note: iNote >= 0 ? (parts[iNote] || "").trim() : "",
        });
    }

    return out;
}

// ----------------- logs -----------------
type LogLevel = "INFO" | "WARN" | "ERROR";

type LogEntry = {
    id: string;
    ts: number;
    level: LogLevel;
    title: string;
    detail?: string;
};

function timeFmt(ts: number) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

// ----------------- tests -----------------
function runDevTests() {
    try {
        const t1 = splitTracking("710062350068-1");
        console.assert(t1.base === "710062350068" && t1.suffix === "1" && t1.hasSuffix === true, "splitTracking -1 failed");

        const t2 = splitTracking("710062350068");
        console.assert(t2.base === "710062350068" && t2.hasSuffix === false, "splitTracking no dash failed");

        const rm = new Map < ProductType, RateRow> (DEFAULT_RATES.map((x) => [x.type, x] as const));

        // Example 1: ทั่วไป + รถ + 100kg + 0.5cbm => max(0.5*5500=2750, 100*25=2500) => 2750 => CBM
        const c1 = computeCost(rm, "ทั่วไป", "รถ", 100, 0.5, true, 0);
        console.assert(c1.costFinal === 2750 && c1.costRule === "CBM", "computeCost example 1 failed");

        // Example 2: มอก + เรือ + 500kg + 1cbm => max(1*4000=4000, 500*20=10000) => 10000 => KG
        const c2 = computeCost(rm, "มอก", "เรือ", 500, 1, true, 0);
        console.assert(c2.costFinal === 10000 && c2.costRule === "KG", "computeCost example 2 failed");

        // parseNumber decimals
        console.assert(parseNumber("0.5") === 0.5 && parseNumber("1,234.56") === 1234.56, "parseNumber decimals failed");

        // CSV parse template
        const parsed = parseCSV(CSV_TEMPLATE_LATEST);
        console.assert(parsed.length === 2, "parseCSV template length failed");
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Dev tests failed:", e);
    }
}

// ----------------- UI helpers -----------------
const COLORS = ["#6D28D9", "#A78BFA"]; // chart colors

function badgeForFlag(flag: Row["flag"]) {
    if (flag === "Sell<Cost") return <Badge variant="destructive">Sell&lt;Cost</Badge>;
    if (flag === "MISSING_COST") return <Badge variant="destructive">MISSING</Badge>;
    if (flag === "1%") return <Badge variant="secondary">1%</Badge>;
    if (flag === "OK") return <Badge variant="outline">OK</Badge>;
    return <span className="text-slate-400">—</span>;
}

function badgeForMethod(method: Row["method"]) {
    if (!method) return <span className="text-slate-400">—</span>;
    return <Badge variant={method === "1%" ? "secondary" : "default"}>{method}</Badge>;
}

function previewTextForRow(r: Row) {
    const w = parseNumber(r.weightKg);
    const c = parseNumber(r.cbm);
    if (!r.useAutoCost) return "Manual";
    if (w <= 0 && c <= 0) return "ต้องใส่ น้ำหนัก/CBM อย่างน้อย 1 ค่า";
    const rule = r.costRule || "";
    return `CBM: ${fmtMoney(r.costCbm || 0)} | KG: ${fmtMoney(r.costKg || 0)} → เลือก ${rule}`;
}

// ----------------- App -----------------
export default function PRCargoCommissionCalculatorLatest() {
    useEffect(() => {
        runDevTests();
    }, []);

    const [rates, setRates] = useState < RateRow[] > (() => DEFAULT_RATES);

    const ratesMap = useMemo(() => {
        const m = new Map < ProductType, RateRow> ();
        for (const r of rates) m.set(r.type, r);
        return m;
    }, [rates]);

    const [rows, setRows] = useState < Row[] > (() => {
        const seed: Row[] = [
            {
                id: safeUUID(),
                dateIn: "2025-10-29",
                customer: "PR-014",
                salesCode: "S-02",
                salesName: "Knight",
                tracking: "73578475778144",
                productType: "มอก",
                transport: "เรือ",
                weightKg: "500",
                cbm: "1",
                useAutoCost: true,
                costManual: "",
                sellBase: "12000",
                note: "ตัวอย่าง (หนักมาก) → เลือกตามน้ำหนัก (คอมควรเป็น 2,000.00)",
            },
            {
                id: safeUUID(),
                dateIn: "2025-10-22",
                customer: "PR-027",
                salesCode: "S-01",
                salesName: "Pluy",
                tracking: "710062350068-1",
                productType: "ทั่วไป",
                transport: "รถ",
                weightKg: "100",
                cbm: "0.5",
                useAutoCost: true,
                costManual: "",
                sellBase: "4000",
                note: "ตัวอย่าง (คิวสูงกว่า) → เลือกตามคิว (คอมควรเป็น 1,250.00)",
            },
        ];

        const rm = new Map < ProductType, RateRow> (DEFAULT_RATES.map((x) => [x.type, x] as const));
        return seed.map((r) => computeRow(r, rm));
    });

    // ----------------- logs state -----------------
    const [logs, setLogs] = useState < LogEntry[] > (() => [
        {
            id: safeUUID(),
            ts: Date.now(),
            level: "INFO",
            title: "เริ่มระบบ",
            detail: "โหลดเรทเริ่มต้น + seed rows",
        },
    ]);

    const addLog = (level: LogLevel, title: string, detail?: string) => {
        setLogs((prev) => [
            {
                id: safeUUID(),
                ts: Date.now(),
                level,
                title,
                detail,
            },
            ...prev,
        ]);
    };

    // Recompute all rows when rates change
    const prevRatesRef = useRef < string > (JSON.stringify(rates));
    useEffect(() => {
        const prev = prevRatesRef.current;
        const next = JSON.stringify(rates);
        if (prev !== next) {
            addLog(
                "INFO",
                "ปรับเรทราคาทุน",
                "ระบบคำนวณต้นทุน/คอมของรายการทั้งหมดใหม่อัตโนมัติ (รายการเก่าจะปรับตามเรทใหม่)",
            );
            prevRatesRef.current = next;
        }

        setRows((prevRows) => prevRows.map((r) => computeRow(r, ratesMap)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ratesMap]);

    const [filters, setFilters] = useState({ month: "all", customer: "all", salesman: "all" });

    const months = useMemo(() => {
        const set = new Set(rows.map((r) => r.month).filter(Boolean) as string[]);
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const customers = useMemo(() => {
        const set = new Set(rows.map((r) => r.customer).filter(Boolean) as string[]);
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const salesmen = useMemo(() => {
        const set = new Set(
            rows
                .map((r) => `${(r.salesCode || "").trim()}|${(r.salesName || "").trim()}`)
                .filter((k) => k !== "|"),
        );
        return ["all", ...Array.from(set).sort()];
    }, [rows]);

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            if (filters.month !== "all" && r.month !== filters.month) return false;
            if (filters.customer !== "all" && r.customer !== filters.customer) return false;
            if (filters.salesman !== "all") {
                const key = `${(r.salesCode || "").trim()}|${(r.salesName || "").trim()}`;
                if (key !== filters.salesman) return false;
            }
            return true;
        });
    }, [rows, filters]);

    const totals = useMemo(() => {
        const sum = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);
        const totalCommission = sum(filteredRows.map((r) => r.commission || 0));
        const diffCommission = sum(filteredRows.filter((r) => r.method === "DIFF").map((r) => r.commission || 0));
        const onePctCommission = sum(filteredRows.filter((r) => r.method === "1%").map((r) => r.commission || 0));
        const shipments = filteredRows.filter((r) => (r.tracking || "").trim()).length;
        const sellTotal = sum(filteredRows.map((r) => parseNumber(r.sellBase)));
        const costTotal = sum(filteredRows.map((r) => parseNumber(r.costFinal)));
        const sellBelowCost = filteredRows.filter((r) => r.flag === "Sell<Cost").length;
        const missingCost = filteredRows.filter((r) => r.flag === "MISSING_COST").length;

        return {
            totalCommission,
            diffCommission,
            onePctCommission,
            shipments,
            sellTotal,
            costTotal,
            sellBelowCost,
            missingCost,
        };
    }, [filteredRows]);

    const pieData = useMemo(() => {
        return [
            { name: "DIFF", value: totals.diffCommission },
            { name: "1%", value: totals.onePctCommission },
        ].filter((d) => d.value > 0);
    }, [totals]);

    const monthlyData = useMemo(() => {
        const map = new Map < string, { month: string; DIFF: number; ONEPCT: number; Total: number
    }> ();
    for (const r of filteredRows) {
        const key = r.month || "";
        if (!key) continue;
        if (!map.has(key)) map.set(key, { month: key, DIFF: 0, ONEPCT: 0, Total: 0 });
        const item = map.get(key)!;
        if (r.method === "DIFF") item.DIFF += r.commission || 0;
        if (r.method === "1%") item.ONEPCT += r.commission || 0;
        item.Total += r.commission || 0;
    }
    return Array.from(map.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
}, [filteredRows]);

const customerSummary = useMemo(() => {
    const map = new Map <
        string,
        { customer: string; DIFF: number; ONEPCT: number; Total: number; Shipments: number; Missing: number
}
    > ();
for (const r of filteredRows) {
    const c = r.customer || "(ไม่ระบุ)";
    if (!map.has(c)) map.set(c, { customer: c, DIFF: 0, ONEPCT: 0, Total: 0, Shipments: 0, Missing: 0 });
    const item = map.get(c)!;
    if ((r.tracking || "").trim()) item.Shipments += 1;
    if (r.flag === "MISSING_COST") item.Missing += 1;
    if (r.method === "DIFF") item.DIFF += r.commission || 0;
    if (r.method === "1%") item.ONEPCT += r.commission || 0;
    item.Total += r.commission || 0;
}
return Array.from(map.values()).sort((a, b) => b.Total - a.Total);
  }, [filteredRows]);

const salesmanSummary = useMemo(() => {
    const map = new Map <
        string,
        {
            key: string;
    salesCode: string;
    salesName: string;
    DIFF: number;
    ONEPCT: number;
    Total: number;
    Shipments: number;
    Missing: number;
}
    > ();

for (const r of filteredRows) {
    const sc = (r.salesCode || "").trim();
    const sn = (r.salesName || "").trim();
    const key = `${sc}|${sn}`;
    const labelCode = sc || "(ไม่ระบุ)";
    const labelName = sn || "(ไม่ระบุ)";

    if (!map.has(key)) {
        map.set(key, {
            key,
            salesCode: labelCode,
            salesName: labelName,
            DIFF: 0,
            ONEPCT: 0,
            Total: 0,
            Shipments: 0,
            Missing: 0,
        });
    }

    const item = map.get(key)!;
    if ((r.tracking || "").trim()) item.Shipments += 1;
    if (r.flag === "MISSING_COST") item.Missing += 1;
    if (r.method === "DIFF") item.DIFF += r.commission || 0;
    if (r.method === "1%") item.ONEPCT += r.commission || 0;
    item.Total += r.commission || 0;
}

return Array.from(map.values()).sort((a, b) => b.Total - a.Total);
  }, [filteredRows]);

const duplicatedBases = useMemo(() => {
    const baseCount = new Map < string, number> ();
    for (const r of filteredRows) {
        const b = (r.trackingBase || "").trim();
        if (!b) continue;
        baseCount.set(b, (baseCount.get(b) || 0) + 1);
    }
    return Array.from(baseCount.entries()).filter(([, c]) => c >= 2);
}, [filteredRows]);

const addRow = () => {
    setRows((prev) => {
        const next = [
            ...prev,
            computeRow(
                {
                    id: safeUUID(),
                    dateIn: "",
                    customer: "",
                    salesCode: "",
                    salesName: "",
                    tracking: "",
                    productType: "ทั่วไป",
                    transport: "รถ",
                    weightKg: "",
                    cbm: "",
                    useAutoCost: true,
                    costManual: "",
                    sellBase: "",
                    note: "",
                },
                ratesMap,
            ),
        ];
        return next;
    });
    addLog("INFO", "เพิ่มรายการ", "เพิ่มแถวใหม่ 1 รายการ");
};

const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? computeRow({ ...(r as Row), ...patch }, ratesMap) : r)));
};

const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    addLog("INFO", "ลบรายการ", `ลบแถว id=${id}`);
};

const onUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (!parsed.length) {
        addLog("WARN", "Import CSV ไม่สำเร็จ", "ไม่พบข้อมูล (ไฟล์ว่าง หรือหัวคอลัมน์ไม่ตรง)");
        return;
    }

    const mapped: Row[] = parsed.map((p) =>
        computeRow(
            {
                id: safeUUID(),
                dateIn: p.dateIn || "",
                customer: p.customer || "",
                salesCode: p.salesCode || "",
                salesName: p.salesName || "",
                tracking: p.tracking || "",
                productType: ((p.productType as ProductType) || "ทั่วไป") as ProductType,
                transport: ((p.transport as Transport) || "รถ") as Transport,
                weightKg: String((p as any).weightKg ?? ""),
                cbm: String((p as any).cbm ?? ""),
                useAutoCost: Boolean((p as any).useAutoCost ?? true),
                costManual: String((p as any).costManual ?? ""),
                sellBase: String((p as any).sellBase ?? ""),
                note: p.note || "",
            },
            ratesMap,
        ),
    );

    setRows(mapped);
    setFilters({ month: "all", customer: "all", salesman: "all" });
    addLog("INFO", "Import CSV สำเร็จ", `นำเข้า ${mapped.length} รายการ`);
};

const [notice, setNotice] = useState < string > ("");

const handleDownloadTemplate = async () => {
    const ok = downloadText("PR_CARGO_commission_template_latest.csv", CSV_TEMPLATE_LATEST);
    if (ok) {
        setNotice("ดาวน์โหลด Template เริ่มแล้ว");
        addLog("INFO", "ดาวน์โหลด Template", "เริ่มดาวน์โหลด CSV Template");
        return;
    }
    const copied = await copyToClipboard(CSV_TEMPLATE_LATEST);
    setNotice(copied ? "ดาวน์โหลดไม่สำเร็จ — คัดลอก Template ให้แล้ว" : "ดาวน์โหลดไม่สำเร็จ — กรุณากด Copy Template");
    addLog("WARN", "ดาวน์โหลด Template ไม่สำเร็จ", copied ? "Fallback: copy clipboard" : "Clipboard ถูกบล็อก");
};

const handleCopyTemplate = async () => {
    const copied = await copyToClipboard(CSV_TEMPLATE_LATEST);
    setNotice(copied ? "คัดลอก CSV Template แล้ว" : "คัดลอกไม่สำเร็จ (เบราว์เซอร์บล็อก) — ให้คัดลอกจากกล่องด้านล่าง");
    addLog("INFO", "Copy Template", copied ? "คัดลอกลง clipboard" : "Clipboard ถูกบล็อก");
};

const handleExport = async () => {
    const csv = toCSV(rows);
    const ok = downloadText("commission_export_latest.csv", csv);
    if (ok) {
        setNotice("Export เริ่มแล้ว");
        addLog("INFO", "Export CSV", `Export ${rows.length} รายการ`);
        return;
    }
    const copied = await copyToClipboard(csv);
    setNotice(copied ? "ดาวน์โหลด Export ไม่ได้ — คัดลอก CSV ให้แล้ว" : "ดาวน์โหลด Export ไม่ได้ — กรุณา Copy ออกเอง");
    addLog("WARN", "Export CSV ไม่สำเร็จ", copied ? "Fallback: copy clipboard" : "Clipboard ถูกบล็อก");
};

const handleClearLogs = () => {
    setLogs([
        {
            id: safeUUID(),
            ts: Date.now(),
            level: "INFO",
            title: "ล้าง Log",
            detail: "เริ่มบันทึกใหม่",
        },
    ]);
};

return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">PR Cargo – Commission Calculator (Latest)</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        ตั้งค่าราคาทุนตามประเภทสินค้า + Preview ต้นทุนอัตโนมัติ • Tracking ท้าย <span className="font-semibold">-1/-2</span> = เลขซ้ำหลายกล่อง
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="h-4 w-4 mr-2" /> ดาวน์โหลด CSV Template
                    </Button>
                    <Button variant="outline" onClick={handleCopyTemplate}>
                        <Copy className="h-4 w-4 mr-2" /> Copy Template
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" /> Export CSV
                    </Button>

                    <label className="inline-flex">
                        <Input
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUpload(f);
                                e.currentTarget.value = "";
                            }}
                        />
                        <Button asChild variant="default">
                            <span>
                                <Upload className="h-4 w-4 mr-2" /> Import CSV
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            {notice ? (
                <Alert>
                    <AlertTitle>Template / Export</AlertTitle>
                    <AlertDescription>
                        {notice}
                        <div className="mt-2">
                            <details>
                                <summary className="cursor-pointer">แสดง CSV Template (คัดลอกเองได้)</summary>
                                <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-white p-3 text-xs overflow-auto">{CSV_TEMPLATE_LATEST}</pre>
                            </details>
                        </div>
                    </AlertDescription>
                </Alert>
            ) : null}

            {totals.sellBelowCost > 0 ? (
                <Alert>
                    <AlertTitle>มีรายการขายต่ำกว่าทุน</AlertTitle>
                    <AlertDescription>พบ {totals.sellBelowCost} รายการที่ Sell &lt; Cost — แนะนำให้ตรวจสอบก่อนสรุปค่าคอม</AlertDescription>
                </Alert>
            ) : null}

            {totals.missingCost > 0 ? (
                <Alert>
                    <AlertTitle>มีรายการที่ต้นทุนคำนวณไม่ได้ (ข้อมูลไม่ครบ)</AlertTitle>
                    <AlertDescription>
                        พบ {totals.missingCost} รายการที่เปิด Auto แต่ยังไม่ใส่ น้ำหนัก/CBM (หรือเป็น 0 ทั้งคู่) — ระบบจึงยังไม่คิดค่าคอมให้
                    </AlertDescription>
                </Alert>
            ) : null}

            <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="settings">
                        <Settings2 className="h-4 w-4 mr-2" /> ตั้งค่าราคาทุน
                    </TabsTrigger>
                    <TabsTrigger value="data">Input</TabsTrigger>
                    <TabsTrigger value="summary">สรุป</TabsTrigger>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="logs">
                        <History className="h-4 w-4 mr-2" /> Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="mt-4">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle>ตั้งค่าราคาทุนสินค้า (บาท/คิว และ บาท/กก.)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-600">
                                ระบบจะคำนวณต้นทุนต่อแถวเป็น <span className="font-semibold">ค่าที่สูงกว่า</span> ระหว่าง{" "}
                                <span className="font-mono">CBM×(บาท/คิว)</span> และ <span className="font-mono">KG×(บาท/กก.)</span>
                            </div>

                            <Separator className="my-4" />

                            <div className="overflow-auto rounded-xl border">
                                <table className="min-w-[980px] w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left">
                                            <th className="px-3 py-2 font-semibold">ประเภท</th>
                                            <th className="px-3 py-2 font-semibold">เรือ: บาท/คิว</th>
                                            <th className="px-3 py-2 font-semibold">เรือ: บาท/กก.</th>
                                            <th className="px-3 py-2 font-semibold">รถ: บาท/คิว</th>
                                            <th className="px-3 py-2 font-semibold">รถ: บาท/กก.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rates.map((r, idx) => (
                                            <tr key={r.type} className="border-t">
                                                <td className="px-3 py-2 font-semibold">{r.type}</td>

                                                <td className="px-3 py-2">
                                                    <Input
                                                        inputMode="decimal"
                                                        value={String(r.ship_cbm)}
                                                        onChange={(e) => {
                                                            const v = parseNumber(e.target.value);
                                                            setRates((prev) => prev.map((x, i) => (i === idx ? { ...x, ship_cbm: v } : x)));
                                                        }}
                                                        className="h-9"
                                                    />
                                                </td>

                                                <td className="px-3 py-2">
                                                    <Input
                                                        inputMode="decimal"
                                                        value={String(r.ship_kg)}
                                                        onChange={(e) => {
                                                            const v = parseNumber(e.target.value);
                                                            setRates((prev) => prev.map((x, i) => (i === idx ? { ...x, ship_kg: v } : x)));
                                                        }}
                                                        className="h-9"
                                                    />
                                                </td>

                                                <td className="px-3 py-2">
                                                    <Input
                                                        inputMode="decimal"
                                                        value={String(r.truck_cbm)}
                                                        onChange={(e) => {
                                                            const v = parseNumber(e.target.value);
                                                            setRates((prev) => prev.map((x, i) => (i === idx ? { ...x, truck_cbm: v } : x)));
                                                        }}
                                                        className="h-9"
                                                    />
                                                </td>

                                                <td className="px-3 py-2">
                                                    <Input
                                                        inputMode="decimal"
                                                        value={String(r.truck_kg)}
                                                        onChange={(e) => {
                                                            const v = parseNumber(e.target.value);
                                                            setRates((prev) => prev.map((x, i) => (i === idx ? { ...x, truck_kg: v } : x)));
                                                        }}
                                                        className="h-9"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 text-xs text-slate-500">Tip: ถ้าแก้เรท ระบบจะคำนวณต้นทุน/คอมของรายการทั้งหมดใหม่อัตโนมัติ และบันทึกลง Log</div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="data" className="mt-4">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <CardTitle>รายการ (รองรับต้นทุนอัตโนมัติ + Preview)</CardTitle>

                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="w-40">
                                        <Label className="text-xs text-slate-600">Filter เดือน</Label>
                                        <Select value={filters.month} onValueChange={(v: string) => setFilters((s) => ({ ...s, month: v }))}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="เลือกเดือน" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m === "all" ? "ทั้งหมด" : m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-40">
                                        <Label className="text-xs text-slate-600">Filter ลูกค้า</Label>
                                        <Select value={filters.customer} onValueChange={(v: string) => setFilters((s) => ({ ...s, customer: v }))}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="เลือกลูกค้า" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {customers.map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c === "all" ? "ทั้งหมด" : c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-56">
                                        <Label className="text-xs text-slate-600">Filter เซลล์</Label>
                                        <Select value={filters.salesman} onValueChange={(v: string) => setFilters((s) => ({ ...s, salesman: v }))}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="เลือกเซลล์" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {salesmen.map((k) => (
                                                    <SelectItem key={k} value={k}>
                                                        {k === "all" ? "ทั้งหมด" : k.replace("|", " • ")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button onClick={addRow} className="h-9">
                                        <Plus className="h-4 w-4 mr-2" /> เพิ่มรายการ
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="overflow-auto rounded-xl border">
                                <table className="min-w-[2600px] w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left">
                                            <th className="px-3 py-2 font-semibold">วันที่เข้าโกดัง</th>
                                            <th className="px-3 py-2 font-semibold">รหัสลูกค้า</th>
                                            <th className="px-3 py-2 font-semibold">รหัสเซลล์</th>
                                            <th className="px-3 py-2 font-semibold">ชื่อเซลล์</th>
                                            <th className="px-3 py-2 font-semibold">Tracking No.</th>
                                            <th className="px-3 py-2 font-semibold">ประเภท</th>
                                            <th className="px-3 py-2 font-semibold">ขนส่ง</th>
                                            <th className="px-3 py-2 font-semibold">น้ำหนัก (kg)</th>
                                            <th className="px-3 py-2 font-semibold">ขนาด (CBM)</th>
                                            <th className="px-3 py-2 font-semibold">ต้นทุน (Auto/Manual)</th>
                                            <th className="px-3 py-2 font-semibold">ต้นทุนสุดท้าย</th>
                                            <th className="px-3 py-2 font-semibold">Preview</th>
                                            <th className="px-3 py-2 font-semibold">Sell_Base</th>
                                            <th className="px-3 py-2 font-semibold">วิธีคิด</th>
                                            <th className="px-3 py-2 font-semibold">ค่าคอม</th>
                                            <th className="px-3 py-2 font-semibold">สถานะ</th>
                                            <th className="px-3 py-2 font-semibold">หมายเหตุ</th>
                                            <th className="px-3 py-2 font-semibold" />
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredRows.map((r) => {
                                            const preview = previewTextForRow(r);
                                            return (
                                                <tr key={r.id} className="border-t align-top">
                                                    <td className="px-3 py-2">
                                                        <Input
                                                            type="date"
                                                            value={r.dateIn || ""}
                                                            onChange={(e) => updateRow(r.id, { dateIn: e.target.value })}
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            value={r.customer}
                                                            onChange={(e) => updateRow(r.id, { customer: e.target.value.trim() })}
                                                            placeholder="เช่น PR-014"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            value={r.salesCode}
                                                            onChange={(e) => updateRow(r.id, { salesCode: e.target.value.trim() })}
                                                            placeholder="เช่น S-01"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            value={r.salesName}
                                                            onChange={(e) => updateRow(r.id, { salesName: e.target.value })}
                                                            placeholder="เช่น Pluy"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <div className="space-y-1">
                                                            <Input
                                                                value={r.tracking}
                                                                onChange={(e) => updateRow(r.id, { tracking: e.target.value.trim() })}
                                                                placeholder="เช่น 710062350068-1"
                                                                className="h-9"
                                                            />
                                                            {r.tracking ? (
                                                                <div className="text-xs text-slate-600">
                                                                    Base: <span className="font-mono">{r.trackingBase}</span>
                                                                    {r.trackingHasSuffix ? (
                                                                        <>
                                                                            <span> • Suffix: </span>
                                                                            <span className="font-mono">-{r.trackingSuffix}</span>
                                                                            <Badge className="ml-2" variant="secondary">
                                                                                มี -n (เลขซ้ำ)
                                                                            </Badge>
                                                                        </>
                                                                    ) : (
                                                                        <Badge className="ml-2" variant="outline">
                                                                            ไม่มี -n
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Select value={r.productType} onValueChange={(v: string) => updateRow(r.id, { productType: v as ProductType })}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ทั่วไป">ทั่วไป</SelectItem>
                                                                <SelectItem value="มอก">มอก</SelectItem>
                                                                <SelectItem value="อย">อย</SelectItem>
                                                                <SelectItem value="พิเศษ">พิเศษ</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Select value={r.transport} onValueChange={(v: string) => updateRow(r.id, { transport: v as Transport })}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="รถ">รถ</SelectItem>
                                                                <SelectItem value="เรือ">เรือ</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            inputMode="decimal"
                                                            value={r.weightKg}
                                                            onChange={(e) => updateRow(r.id, { weightKg: e.target.value })}
                                                            placeholder="เช่น 100"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            inputMode="decimal"
                                                            value={r.cbm}
                                                            onChange={(e) => updateRow(r.id, { cbm: e.target.value })}
                                                            placeholder="เช่น 0.5"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <div className="space-y-2">
                                                            <Select value={r.useAutoCost ? "auto" : "manual"} onValueChange={(v: string) => updateRow(r.id, { useAutoCost: v === "auto" })}>
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="auto">Auto (ใช้เรท)</SelectItem>
                                                                    <SelectItem value="manual">Manual (กรอกเอง)</SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            {!r.useAutoCost ? (
                                                                <Input
                                                                    inputMode="decimal"
                                                                    value={r.costManual}
                                                                    onChange={(e) => updateRow(r.id, { costManual: e.target.value })}
                                                                    placeholder="ต้นทุน Manual"
                                                                    className="h-9"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-2 font-semibold">{fmtMoney(r.costFinal || 0)}</td>

                                                    <td className="px-3 py-2">
                                                        <div className="text-xs text-slate-700 whitespace-nowrap">{preview}</div>
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            inputMode="decimal"
                                                            value={r.sellBase}
                                                            onChange={(e) => updateRow(r.id, { sellBase: e.target.value })}
                                                            placeholder="เช่น 4000"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2">{badgeForMethod(r.method)}</td>

                                                    <td className="px-3 py-2 font-semibold">{fmtMoney(r.commission || 0)}</td>

                                                    <td className="px-3 py-2">{badgeForFlag(r.flag)}</td>

                                                    <td className="px-3 py-2">
                                                        <Input
                                                            value={r.note || ""}
                                                            onChange={(e) => updateRow(r.id, { note: e.target.value })}
                                                            placeholder="หมายเหตุ"
                                                            className="h-9"
                                                        />
                                                    </td>

                                                    <td className="px-3 py-2 text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => deleteRow(r.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {filteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={18} className="px-3 py-10 text-center text-slate-500">
                                                    ไม่พบข้อมูลตามตัวกรอง — เปลี่ยน Filter หรือกด “เพิ่มรายการ”
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>

                            <Separator className="my-5" />

                            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">ค่าคอมรวม</div>
                                        <div className="text-lg font-bold">{fmtMoney(totals.totalCommission)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">DIFF</div>
                                        <div className="text-lg font-bold">{fmtMoney(totals.diffCommission)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">1%</div>
                                        <div className="text-lg font-bold">{fmtMoney(totals.onePctCommission)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">จำนวนรายการ</div>
                                        <div className="text-lg font-bold">{totals.shipments}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">Sell รวม</div>
                                        <div className="text-lg font-bold">{fmtMoney(totals.sellTotal)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">Cost รวม</div>
                                        <div className="text-lg font-bold">{fmtMoney(totals.costTotal)}</div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-2xl">
                                    <CardContent className="p-3">
                                        <div className="text-xs text-slate-600">Missing Cost</div>
                                        <div className="text-lg font-bold">{totals.missingCost}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="summary" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="rounded-2xl shadow-sm">
                            <CardHeader>
                                <CardTitle>สรุปรายลูกค้า</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-auto rounded-xl border">
                                    <table className="min-w-[720px] w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold">Customer</th>
                                                <th className="px-3 py-2 text-right font-semibold">DIFF</th>
                                                <th className="px-3 py-2 text-right font-semibold">1%</th>
                                                <th className="px-3 py-2 text-right font-semibold">Total</th>
                                                <th className="px-3 py-2 text-right font-semibold">Shipments</th>
                                                <th className="px-3 py-2 text-right font-semibold">Missing</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerSummary.map((c) => (
                                                <tr key={c.customer} className="border-t">
                                                    <td className="px-3 py-2 font-semibold">{c.customer}</td>
                                                    <td className="px-3 py-2 text-right">{fmtMoney(c.DIFF)}</td>
                                                    <td className="px-3 py-2 text-right">{fmtMoney(c.ONEPCT)}</td>
                                                    <td className="px-3 py-2 text-right font-bold">{fmtMoney(c.Total)}</td>
                                                    <td className="px-3 py-2 text-right">{c.Shipments}</td>
                                                    <td className="px-3 py-2 text-right">{c.Missing}</td>
                                                </tr>
                                            ))}
                                            {customerSummary.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                                                        ยังไม่มีข้อมูล
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl shadow-sm">
                            <CardHeader>
                                <CardTitle>สรุปรายเซลล์</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-auto rounded-xl border">
                                    <table className="min-w-[760px] w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold">Sales</th>
                                                <th className="px-3 py-2 text-right font-semibold">DIFF</th>
                                                <th className="px-3 py-2 text-right font-semibold">1%</th>
                                                <th className="px-3 py-2 text-right font-semibold">Total</th>
                                                <th className="px-3 py-2 text-right font-semibold">Shipments</th>
                                                <th className="px-3 py-2 text-right font-semibold">Missing</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salesmanSummary.map((s) => (
                                                <tr key={s.key} className="border-t">
                                                    <td className="px-3 py-2 font-semibold">
                                                        {s.salesCode} • {s.salesName}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">{fmtMoney(s.DIFF)}</td>
                                                    <td className="px-3 py-2 text-right">{fmtMoney(s.ONEPCT)}</td>
                                                    <td className="px-3 py-2 text-right font-bold">{fmtMoney(s.Total)}</td>
                                                    <td className="px-3 py-2 text-right">{s.Shipments}</td>
                                                    <td className="px-3 py-2 text-right">{s.Missing}</td>
                                                </tr>
                                            ))}
                                            {salesmanSummary.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                                                        ยังไม่มีข้อมูล
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="dashboard" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="rounded-2xl shadow-sm lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Mix: DIFF vs 1%</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                {pieData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-500">ยังไม่มีข้อมูล</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                                                {pieData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl shadow-sm lg:col-span-2">
                            <CardHeader>
                                <CardTitle>คอมรายเดือน (Stacked)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                {monthlyData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-500">ยังไม่มีข้อมูล</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                                            <Legend />
                                            <Bar dataKey="DIFF" stackId="a" fill={COLORS[0]} />
                                            <Bar dataKey="ONEPCT" stackId="a" fill={COLORS[1]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl shadow-sm lg:col-span-3">
                            <CardHeader>
                                <CardTitle>เช็ครายการเสี่ยง (Sell&lt;Cost / Tracking Base ซ้ำ)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-xl border p-3">
                                        <div className="font-semibold">Sell &lt; Cost</div>
                                        <div className="text-sm text-slate-600">รายการที่ราคาขายต่ำกว่าทุน</div>
                                        <div className="mt-2">
                                            {filteredRows.filter((r) => r.flag === "Sell<Cost").length === 0 ? (
                                                <div className="text-slate-500">ไม่มี</div>
                                            ) : (
                                                <ul className="text-sm list-disc pl-5 space-y-1">
                                                    {filteredRows
                                                        .filter((r) => r.flag === "Sell<Cost")
                                                        .slice(0, 10)
                                                        .map((r) => (
                                                            <li key={r.id}>
                                                                {r.customer} • {r.tracking} • Sell {fmtMoney(parseNumber(r.sellBase))} / Cost {fmtMoney(parseNumber(r.costFinal))}
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-3">
                                        <div className="font-semibold">Tracking Base ซ้ำ</div>
                                        <div className="text-sm text-slate-600">ช่วยเช็คว่าเลขเดียวกันมีหลายกล่อง ควรมี -1/-2 หรือพิมพ์ขาด</div>
                                        <div className="mt-2">
                                            {duplicatedBases.length === 0 ? (
                                                <div className="text-slate-500">ไม่มี</div>
                                            ) : (
                                                <ul className="text-sm list-disc pl-5 space-y-1">
                                                    {duplicatedBases.slice(0, 12).map(([b, c]) => (
                                                        <li key={b}>
                                                            <span className="font-mono">{b}</span> • {c} รายการ
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle>Log เหตุการณ์</CardTitle>
                                <Button variant="outline" onClick={handleClearLogs}>
                                    ล้าง Log
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-600 mb-3">
                                ตัวอย่าง: ปรับเรทราคาทุน → รายการเก่าถูกคำนวณใหม่อัตโนมัติ (บันทึกลง Log)
                            </div>

                            <div className="overflow-auto rounded-xl border">
                                <table className="min-w-[900px] w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">เวลา</th>
                                            <th className="px-3 py-2 text-left font-semibold">ระดับ</th>
                                            <th className="px-3 py-2 text-left font-semibold">เหตุการณ์</th>
                                            <th className="px-3 py-2 text-left font-semibold">รายละเอียด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((l) => (
                                            <tr key={l.id} className="border-t">
                                                <td className="px-3 py-2 font-mono text-xs">{timeFmt(l.ts)}</td>
                                                <td className="px-3 py-2">
                                                    <Badge variant={l.level === "ERROR" ? "destructive" : l.level === "WARN" ? "secondary" : "outline"}>
                                                        {l.level}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 font-semibold">{l.title}</td>
                                                <td className="px-3 py-2 text-slate-700">{l.detail || "—"}</td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                                                    ยังไม่มี Log
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="text-xs text-slate-500">
                Tip: ถ้าจะเทียบเลขแทรคกับไฟล์อื่น ให้ใช้ <span className="font-semibold">Tracking No. แบบเต็ม</span> (รวม -1/-2) เพื่อไม่ให้ตกหล่น
            </div>
        </div>
    </div>
);
}
