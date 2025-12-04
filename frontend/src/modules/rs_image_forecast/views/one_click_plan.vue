<template>
	<div class="one-click-page">
		<el-card shadow="never" class="mb16">
			<template #header>
				<div class="card-header">
					<span>一键规划模块</span>
					<el-space>
						<el-date-picker
							v-model="form.date"
							type="date"
							:clearable="false"
							placeholder="选择日期"
							format="YYYY-MM-DD"
							value-format="x"
							style="width: 160px"
						/>
						<el-select v-model="form.satellite" style="width: 140px">
							<el-option label="AS02" value="AS02" />
							<el-option label="AS03" value="AS03" />
						</el-select>
						<el-button type="primary" :loading="loading" @click="runOneClickPlan">一键规划</el-button>
						<el-button type="success" :loading="submitting" :disabled="!timeline.length" @click="submitPlannedTasks">提交规划</el-button>
					</el-space>
				</div>
			</template>

			<div class="plan-range">
				<span>规划时间窗：</span>
				<el-tag type="info" effect="plain">{{ rangeText }}</el-tag>
				<el-tag type="warning" effect="plain">自动筛选云量 &lt; 10% 且任务间隔 &gt; 1.5h</el-tag>
			</div>
			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-checkbox v-model="taskSwitches.imaging">规划成像</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.transfer">规划数传</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.delete">规划固存删除</el-checkbox>
			</el-space>

			<el-alert
				v-if="!timeline.length"
				title="点击“一键规划”后，将自动生成次日的成像/数传/固存删除任务并展示时间轴"
				type="info"
				show-icon
				:closable="false"
			/>
		</el-card>

	<el-card shadow="never">
		<template #header>
			<div class="card-header">
				<span>任务执行时间轴</span>
				<el-tag v-if="timeline.length" type="success" effect="plain">共 {{ timeline.length }} 个</el-tag>
				</div>
			</template>

		<div v-if="timeline.length" class="timeline-chart" ref="chartRef"></div>
		<el-empty v-else description="暂无任务" :image-size="120" />
	</el-card>
	<el-button v-if="submissionSummary" type="primary" plain @click="submissionDialogVisible = true">查看任务摘要</el-button>

	<el-dialog v-model="submissionDialogVisible" title="任务摘要" width="720px" :append-to-body="true">
		<div class="summary-text">{{ submissionSummary }}</div>
	</el-dialog>
</div>
</template>

<script lang="ts" setup>
defineOptions({ name: "one-click-plan" });

import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, reactive } from "vue";
import { ElMessage } from "element-plus";
import { useCool } from "/@/cool";
import { config as appConfig } from "/@/config";
import { request } from "/@/cool/service/request";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { TooltipComponent, GridComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { TELECONTROL_ANTENNA_MAP } from "../../daily_plan/views/telecontrolAntennas";

echarts.use([ScatterChart, TooltipComponent, GridComponent, DataZoomComponent, CanvasRenderer]);

const ONE_CLICK_PLAN_URL = "http://172.16.10.86:9030/image-forecast";
const TELECONTROL_SEARCH_URLS = [
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
];
const TELECONTROL_STATES = [1, 2, 6];
const TRANSFER_API_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template";
const TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const ANTENNA_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi-transform/get-all-antenna";

const AS02_IMAGING_TEMPLATE = "689d78a65526542523548b0f";
const AS02_IMAGING_FOLDER = "6731752608e123893cf92873";
const AS03_IMAGING_FOLDER = "6731755b08e123893cf92878";
const AS03_IMAGING_TEMPLATES = [
	"673c2d9049b1f446adc4623c",
	"673c2d8f49b1f446adc46230",
	"673c2d9049b1f446adc4623f",
];
const TRANSFER_TEMPLATE_ID = "673c2d9049b1f446adc4623e";
const TRANSFER_FOLDER_ID = "6731752608e123893cf92873";

const DELETE_TEMPLATE_AS02 = "673c2d9049b1f446adc4623a";
const COMMAND_API_URL = TRANSFER_API_URL;

type TimelineItem = {
	id: string;
	name: string;
	type: "" | "success" | "warning" | "info" | "danger" | "data" | "delete";
	time: string;
	meta: string;
	startTs: number;
	endTs?: number;
	raw?: any;
	rollAng?: number | string | null;
	rollText?: string;
	solarText?: string;
	storageSlot?: string;
	antennaId?: string | null;
	teleBegin?: number | null;
	teleEnd?: number | null;
	files?: string[];
	deleteFiles?: string[];
	cloud?: number | null;
	priority?: number | null;
	gapMinutes?: number | null;
};

type TargetPayload = {
	name: string;
	long: number;
	lat: number;
	alt: number;
	imageTime: number;
	priority: number;
};

// 默认日期：北京时间次日 00:00
const tomorrow = (() => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 1);
	return d.getTime();
})();
const form = ref({ satellite: "AS02", date: tomorrow });
const { service } = useCool();
const loading = ref(false);
const submitting = ref(false);
const timeline = ref<TimelineItem[]>([]);
const planRange = computed(() => buildRange(form.value.date));
const rangeText = computed(() => `${formatDisplay(planRange.value.start)} ~ ${formatDisplay(planRange.value.end)}`);
const submissionSummary = ref('');
const submissionDialogVisible = ref(false);
const orbitElements = ref<any | null>(null);
const taskSwitches = reactive({
	imaging: true,
	transfer: true,
	delete: true,
});
const ONE_CLICK_PLAN_CACHE_KEY = "one_click_plan_cache_v1";
const ONE_CLICK_PLAN_RELOAD_FLAG = "__one_click_plan_reload_handled";
const UID_EPOCH = new Date("2025-01-01T00:00:00Z").getTime();
const UID_TIMESTAMP_BITS = 41;
const UID_MACHINE_BITS = 10;
const UID_PID_BITS = 6;
const UID_SEQUENCE_BITS = 7;
const UID_TIMESTAMP_MOD = Math.pow(2, UID_TIMESTAMP_BITS);
const UID_MACHINE_ID = Math.floor(Math.random() * Math.pow(2, UID_MACHINE_BITS));
const UID_PID = Math.floor(Math.random() * Math.pow(2, UID_PID_BITS));
let uidSequence = 0;
let uidLastTimestamp = -1;

function ensureImagingUid(item: TimelineItem): string {
	item.raw = item.raw || {};
	const existing =
		item.raw.imagingUid ||
		item.raw.imagingUID ||
		item.raw.imaging_uid ||
		item.raw.__imagingUid;
	if (existing) {
		const uidText = String(existing);
		if (uidText && uidText.length > 4) {
			item.raw.imagingUid = uidText;
			return uidText;
		}
	}
	const uid = generateImagingUid();
	item.raw.imagingUid = uid;
	return uid;
}

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

function detectPageReload(): boolean {
	if (typeof window === "undefined" || typeof performance === "undefined") return false;
	const entries = performance.getEntriesByType?.("navigation") || [];
	const firstEntry = entries[0] as PerformanceNavigationTiming | undefined;
	if (firstEntry && typeof firstEntry.type === "string") return firstEntry.type === "reload";
	const nav = (performance as any).navigation;
	if (nav?.type != null && nav?.TYPE_RELOAD != null) return nav.type === nav.TYPE_RELOAD;
	return false;
}

const isOneClickReload = detectPageReload();
if (isOneClickReload && typeof window !== "undefined") {
	const win = window as any;
	if (!win[ONE_CLICK_PLAN_RELOAD_FLAG]) {
		try {
			window.localStorage.removeItem(ONE_CLICK_PLAN_CACHE_KEY);
		} catch (err) {
			console.warn("[one-click-plan] clear cache on reload failed", err);
		}
		win[ONE_CLICK_PLAN_RELOAD_FLAG] = true;
	}
}

function restoreOneClickCache() {
	if (typeof window === "undefined") return;
	const raw = window.localStorage.getItem(ONE_CLICK_PLAN_CACHE_KEY);
	if (!raw) return;
	try {
		const payload = JSON.parse(raw);
		if (payload?.form) {
			form.value = { ...form.value, ...payload.form };
		}
		if (payload?.taskSwitches) {
			Object.assign(taskSwitches, payload.taskSwitches);
		}
		if (Array.isArray(payload?.timeline)) {
			timeline.value = payload.timeline;
		}
		if (payload?.orbitElements !== undefined) {
			orbitElements.value = payload.orbitElements;
		}
		if (payload?.submissionSummary !== undefined) {
			submissionSummary.value = payload.submissionSummary;
		}
	} catch (err) {
		console.warn("[one-click-plan] restore cache failed", err);
	}
}

function persistOneClickCache() {
	if (typeof window === "undefined") return;
	const payload = {
		form: form.value,
		taskSwitches: { ...taskSwitches },
		timeline: timeline.value,
		orbitElements: orbitElements.value,
		submissionSummary: submissionSummary.value,
	};
	try {
		window.localStorage.setItem(ONE_CLICK_PLAN_CACHE_KEY, JSON.stringify(payload));
	} catch (err) {
		console.warn("[one-click-plan] persist cache failed", err);
	}
}

restoreOneClickCache();

onMounted(() => {
	if (chartRef.value) {
		chart = echarts.init(chartRef.value);
	}
	updateChart();
});

watch(
	[form, taskSwitches, timeline, submissionSummary],
	() => {
		persistOneClickCache();
	},
	{ deep: true }
);

onBeforeUnmount(() => {
	if (chart) {
		chart.dispose();
		chart = null;
	}
});

watch(timeline, async () => {
	await nextTick();
	if (!chart && chartRef.value) {
		chart = echarts.init(chartRef.value);
	}
	updateChart();
});

function buildRange(dateValue?: number | Date) {
	const base = dateValue ? new Date(dateValue) : new Date();
	base.setHours(0, 0, 0, 0); // 当日 0 点
	const start = new Date(base);
	const end = new Date(base);
	end.setDate(end.getDate() + 1); // 次日
	end.setHours(13, 0, 0, 0); // 次日 13:00
	return { start, end };
}

function formatDisplay(date: Date | string) {
	const d = typeof date === "string" ? new Date(date) : date;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
		d.getMinutes(),
	)}:${pad(d.getSeconds())}`;
}

function formatNumberText(value: number | string | null | undefined, digits = 4): string {
	if (value == null || value === "") return "--";
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return String(value);
	}
	return Number(num.toFixed(digits)).toString();
}

function formatPercentText(value: number | string | null | undefined): string {
	if (value == null || value === "") return "--";
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return String(value);
	}
	if (num >= 0 && num <= 1) {
		return `${(num * 100).toFixed(1)}%`;
	}
	return `${num}%`;
}

function normalizeDecimal(value: unknown, fallback: number): number {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function formatMonthDay(value: number | Date | string): string {
	const d = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : value;
	if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function runOneClickPlan() {
	const { start, end } = planRange.value;
	loading.value = true;
	try {
		const { targets, priorityMap } = await fetchAllTargets(form.value.satellite);
		if (!targets.length) throw new Error("未获取到目标库数据");
		const token = await getToken();
		const ephemeris = await fetchOrbitElementsForSatellite(form.value.satellite, token);
		orbitElements.value = ephemeris;

		const body: any = {
			satelliteCode: form.value.satellite,
			forecastStartAt: start.getTime(),
			forecastEndAt: end.getTime(),
			targetList: targets,
		};
		if (ephemeris) body.ephemeris = ephemeris;

		const resp = await fetch(ONE_CLICK_PLAN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		const data = await resp.json();
		const rawList: any[] = data?.result || data?.tasks || data?.data || [];
		const withTs = rawList
			.map((r) => {
				const ts = parseStartTime(r);
				const cloud = parseCloudPercent(r?.cloud ?? r?.cloudCoverage ?? r?.cloud_percent ?? r?.cloudPercent);
				const priority =
					resolvePriorityFromCache(r?.name || r?.targetName, priorityMap) ||
					parsePriority(r?.priority ?? r?.priorityLevel ?? r?.level);
				return ts
					? {
							...r,
							startTs: ts,
							name: r?.name || r?.targetName || "Task",
							cloud,
							priority,
					  }
					: null;
			})
			.filter((x): x is any => Boolean(x));

		const cloudFiltered = withTs.filter((r) => r.cloud == null || r.cloud < 10);
		const imagingLimit = form.value.satellite === "AS03" ? 2 : 4;

		// 先确定数传/删除任务，预留时间，再选成像任务
		const dataTask =
			taskSwitches.transfer && form.value.satellite === "AS02"
				? await buildDataTransTask(token, planRange.value.start, planRange.value.end)
				: null;
		const deleteTasks =
			taskSwitches.delete && form.value.satellite === "AS02"
				? await buildDeleteTasks(planRange.value.start, planRange.value.end)
				: [];
		const reservedTimes = [dataTask?.startTs, ...(deleteTasks.map((d) => d.startTs))].filter(Boolean) as number[];
		const gapMs = form.value.satellite === "AS03" ? 2.5 * 60 * 60 * 1000 : 80 * 60 * 1000;
		const noonTs = new Date(planRange.value.start);
		noonTs.setHours(12, 0, 0, 0);

		const picked =
			taskSwitches.imaging && form.value.satellite === "AS03"
				? pickWithPreference(cloudFiltered, imagingLimit, gapMs, reservedTimes, noonTs.getTime())
				: taskSwitches.imaging
				? pickTopTasks(cloudFiltered, imagingLimit, gapMs, reservedTimes)
				: [];

		const imagingDuration = form.value.satellite === "AS03" ? 30 : 40; // seconds
		let items = picked.map((r, idx) => {
			const timeText = formatDisplay(new Date(r.startTs));
			const type = mapTaskType(r);
			const endTs = Number(r.startTs ?? 0) + imagingDuration * 1000;
			const metaParts: string[] = [];
			if (r.cloud != null) metaParts.push(`Cloud: ${r.cloud}%`);
	if (r.priority != null) metaParts.push(`Priority: ${r.priority}`);
	if (r.mode) metaParts.push(`Mode: ${r.mode}`);
	return {
		id: String(r.id ?? r.__uid ?? idx),
		name: r.name,
		type,
		time: timeText,
		meta: metaParts.join(" | ") || "Auto planned task",
		startTs: Number(r.startTs),
		endTs,
		raw: r,
		rollAng:
			r.rollAng ??
			r.roll_angle ??
			r.rollAngle ??
			r.roll_angle_value ??
			r.side_swipe_angle ??
			null,
		rollText: pickRollAngle(r),
		solarText: pickSolarAngle(r),
		cloud: r.cloud ?? null,
		priority: r.priority ?? null,
	} as TimelineItem;
	});
		if (dataTask) items = [...items, dataTask];
		if (deleteTasks.length) items = [...items, ...deleteTasks];

		// 预览固存槽并丰富展示信息
		const imagingItems = items.filter((it) => it.type !== "data" && it.type !== "delete").sort((a, b) => a.startTs - b.startTs);
		if (imagingItems.length) {
			try {
				const slots = await fetchEmptySlots(form.value.satellite === "AS02" ? 0 : 2, imagingItems.length);
				for (let i = 0; i < imagingItems.length; i++) {
					const slot = slots[i];
					if (slot && slot.startFileNo != null) {
						imagingItems[i].storageSlot = String(slot.startFileNo);
					}
				}
			} catch (err) {
				console.warn("[one-click-plan] 预览固存槽失败", err);
			}
		}
		items = items.map((it) => ({ ...it, meta: buildMeta(it) }));
		timeline.value = items;
		ElMessage.success("Plan finished");
	} catch (err: any) {
		ElMessage.error(err?.message || "Plan failed");
	} finally {
		loading.value = false;
	}
}

function updateChart() {
	if (!chart || !timeline.value.length) return;
	const { start, end } = planRange.value;
	const startMs = start.getTime();
	const endMs = end.getTime();

	// 排序并计算相邻间隔
	const sorted = [...timeline.value].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	const data: any[] = [];
	const gapLines: Array<{ coords: number[][]; gap: number }> = [];
	const gapLabels: any[] = [];
	for (let i = 0; i < sorted.length; i++) {
		const cur = sorted[i];
		const prev = sorted[i - 1];
		const gap = prev ? Math.round((cur.startTs - prev.startTs) / 60000) : null;
		data.push({
			value: [cur.startTs, 1],
			name: cur.name,
			meta: cur.meta,
			time: cur.time,
			type: cur.type,
			cloud: cur.cloud,
			priority: cur.priority,
			gapMinutes: gap,
		});
		if (prev && gap != null) {
			gapLines.push({
				coords: [
					[prev.startTs, 1],
					[cur.startTs, 1],
				],
				gap,
			});
			const mid = (prev.startTs + cur.startTs) / 2;
			gapLabels.push({
				value: [mid, 1.1],
				label: `${gap} min`,
			});
		}
	}

	chart.setOption({
		grid: { left: 40, right: 20, top: 26, bottom: 34 },
		xAxis: {
			type: "time",
			min: startMs,
			max: endMs,
			axisLabel: { formatter: "{HH}:{mm}" },
			axisLine: { lineStyle: { color: "#909399" } },
			axisTick: { alignWithLabel: true, lineStyle: { color: "#909399" } },
		},
		yAxis: { show: false, min: 0, max: 1.5 },
		tooltip: {
			trigger: "item",
			borderRadius: 8,
			backgroundColor: "#fff",
			textStyle: { color: "#303133" },
			formatter: (p: any) => {
				const d = p.data;
				if (!d || !d.name) return "";
				const gapText =
					d.gapMinutes != null ? `<div style="color:#606266;font-weight:600;">Gap: ${d.gapMinutes} min</div>` : "";
				return `
					<div style="min-width:180px;">
						<div style="font-weight:600;margin-bottom:4px;">${d.name}</div>
						<div>${d.time ?? ""}</div>
						<div style="color:#606266;">${d.meta ?? ""}</div>
						${gapText}
					</div>
				`;
			},
		},
		series: [
			{
				type: "scatter",
				symbolSize: 14,
				symbolOffset: [0, -3],
				itemStyle: {
					color: (p: any) => {
						const t = String(p.data?.type || "").toLowerCase();
						if (t.includes("data")) return "#f78fb3";
						if (t.includes("delete")) return "#ff6b6b";
						return "#409EFF";
					},
				},
				data,
				z: 3,
			},
			{
				type: "lines",
				coordinateSystem: "cartesian2d",
				polyline: false,
				symbol: ["none", "none"],
				lineStyle: { color: "#d3d7de", width: 1, type: "dashed" },
				data: gapLines,
				silent: true,
				z: 1,
			},
			{
				type: "scatter",
				symbolSize: 1,
				silent: true,
				itemStyle: { color: "transparent" },
				label: {
					show: true,
					formatter: (p: any) => (p.data?.label ? p.data.label : ""),
					position: "top",
					color: "#606266",
					fontSize: 12,
					fontWeight: "600",
					align: "center",
				},
				data: gapLabels,
				z: 2,
			},
		],
	});
}

async function fetchAllTargets(sat: string): Promise<{ targets: TargetPayload[]; priorityMap: Map<string, number> }> {
	const api: any = (service as any)?.rs_poi?.poi;
	if (!api?.page) return { targets: [], priorityMap: new Map() };
	const defaultImageTime = sat === "AS03" ? 30 : 10;
	const size = 200;
	let page = 1;
	let total = 0;
	const acc: any[] = [];
	while (true) {
		const res = await api.page({ page, size });
		const list = res?.list || res?.data?.list || [];
		const pg = res?.pagination || res?.data?.pagination || { total: list.length };
		acc.push(...list);
		total = pg.total ?? acc.length;
		if (acc.length >= total || list.length === 0) break;
		page += 1;
	}
	const code = /AS03/i.test(sat) ? "1" : "0";
	const filtered = acc.filter((p: any) => {
		const s = String(p?.satellites ?? "").trim();
		if (!s) return false;
		const tokens = s.split(/[\s,|;]+/).map((x: string) => x.trim());
		return tokens.includes(code);
	});
	const priorityMap = new Map<string, number>();
	const targets = filtered.reduce<TargetPayload[]>((arr, p: any) => {
		const lon = Number(p.area_lon ?? p.long ?? p.longitude);
		const lat = Number(p.area_lat ?? p.lat ?? p.latitude);
		if (!Number.isFinite(lon) || !Number.isFinite(lat)) return arr;
		const priorityNum = parsePriority(p.level ?? p.priority ?? p.priorityLevel);
		const name = String(p.name ?? "").trim();
		if (!name) return arr;
		priorityMap.set(name.toLowerCase(), priorityNum);
		arr.push({
			name,
			long: lon,
			lat: lat,
			alt: 0,
			imageTime: defaultImageTime,
			priority: priorityNum,
		});
		return arr;
	}, []);
	return { targets, priorityMap };
}

function parseStartTime(row: any): number | null {
	const candidates = [
		row?.startAtBeijing,
		row?.start_at_beijing,
		row?.t0_beijing,
		row?.startAt,
		row?.start_at,
		row?.t0,
		row?.time,
		row?.taskTime,
	];
	for (const value of candidates) {
		if (!value) continue;
		const text = String(value).trim();
		if (!text) continue;
		const normalized = text.includes("T") ? text : text.replace(" ", "T");
		const ts = new Date(normalized).getTime();
		if (!Number.isNaN(ts)) return ts;
	}
	return null;
}

function mapTaskType(task: any): TimelineItem["type"] {
	const name = String(task?.name || "").toLowerCase();
	if (name.includes("数传")) return "data";
	return "info";
}

function parseCloudPercent(v: any): number | null {
	if (v == null || v === "") return null;
	const s = String(v).trim().replace("％", "%");
	if (s.endsWith("%")) {
		const n = Number(s.slice(0, -1));
		return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
	}
	const n = Number(s);
	if (!Number.isFinite(n)) return null;
	return n >= 0 && n <= 1 ? Math.round(n * 100) : Math.max(0, Math.min(100, n));
}

function parsePriority(v: any): number {
	const num = Number(v);
	if (Number.isFinite(num) && num > 0) return num;
	return 99;
}

function resolvePriorityFromCache(name: string | undefined, priorityMap: Map<string, number>) {
	if (!name) return null;
	const key = name.toLowerCase();
	const hit = priorityMap.get(key);
	return hit != null ? hit : null;
}

function pickTopTasks(list: any[], limit: number, gapMs: number, reserved: number[] = []) {
	const sorted = [...list].sort((a, b) => {
		const ta = a.startTs ?? 0;
		const tb = b.startTs ?? 0;
		if (ta !== tb) return ta - tb;
		const pa = a.priority ?? 99;
		const pb = b.priority ?? 99;
		return pa - pb;
	});
	const n = sorted.length;
	let best: any[] = [];
	const score = (arr: any[]) => arr.reduce((s, x) => s + (x.priority ?? 99), 0);

	function ok(ts: number, lastTs: number, chosen: any[]) {
		if (lastTs >= 0 && ts - lastTs < gapMs) return false;
		for (const t of chosen) {
			const v = Number(t.startTs ?? 0);
			if (Number.isFinite(v) && Math.abs(ts - v) < gapMs) return false;
		}
		for (const r of reserved) {
			if (Math.abs(ts - r) < gapMs) return false;
		}
		return true;
	}

	function dfs(idx: number, current: any[], lastTs: number) {
		if (current.length > best.length || (current.length === best.length && score(current) < score(best))) {
			best = [...current];
		}
		if (current.length === limit || idx >= n) return;
		if (current.length + (n - idx) < best.length) return;

		const cand = sorted[idx];
		const ts = Number(cand.startTs ?? 0);
		if (Number.isFinite(ts) && ok(ts, lastTs, current)) {
			current.push(cand);
			dfs(idx + 1, current, ts);
			current.pop();
		}
		dfs(idx + 1, current, lastTs);
	}

	dfs(0, [], -Infinity);
	return best.slice(0, limit);
}

function pickWithPreference(list: any[], limit: number, gapMs: number, reserved: number[], preferAfter: number) {
	const after = list.filter((x) => Number(x.startTs ?? 0) >= preferAfter);
	const first = pickTopTasks(after, limit, gapMs, reserved);
	if (first.length >= limit) return first;
	const pickedTs = new Set(first.map((x) => x.startTs));
	const remain = list.filter((x) => !pickedTs.has(x.startTs));
	const second = pickTopTasks(
		remain,
		limit - first.length,
		gapMs,
		reserved.concat(first.map((x) => Number(x.startTs))),
	);
	return [...first, ...second].slice(0, limit);
}

async function getToken(): Promise<string> {
	const resp = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: "02ptemplate@yinhe.ht", password: "123456", loginType: 2 }),
	});
	const data = await resp.json();
	const token = data?.data?.token;
	if (!token) throw new Error("获取登录 token 失败");
	return token;
}

function getSpacecraftIdBySatellite(satellite: string | undefined): string | null {
	if (!satellite) return null;
	const map: Record<string, string> = {
		AS02: "12",
		AS03: "13",
	};
	return map[satellite] ?? null;
}

async function fetchOrbitElementsForSatellite(satellite: string | undefined, token?: string): Promise<any | null> {
	const spacecraftId = getSpacecraftIdBySatellite(satellite);
	if (!spacecraftId) return null;
	try {
		const tk = token || (await getToken());
		const now = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;
		const body = {
			keyword: "",
			spacecraftIds: [spacecraftId],
			beginTime: now - 7 * dayMs,
			endTime: now + 1 * dayMs,
			page: 1,
			pageSize: 20,
			states: [1, 2],
			order: 6,
		};
		const resp = await fetch("http://ttnonc-webui.cyk3.yhroot.com/v2/api/orbit/keplers/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-web-token": tk,
			},
			body: JSON.stringify(body),
		});
		if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
		const result = await resp.json();
		const list = result?.data?.list;
		if (!Array.isArray(list) || !list.length) return null;
		return list[0]?.orbitElements ?? null;
	} catch (err) {
		console.warn("[one-click-plan] 获取星历失败", err);
		return null;
	}
}

function formatDateYMD(d: Date) {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type TelecontrolRecord = {
	beginTime?: number;
	endTime?: number;
	antennaId?: string;
	dataTrans?: { beginTime?: number; endTime?: number };
};

async function fetchTelecontrolRecords(token: string, date: string, spacecraftId: string): Promise<TelecontrolRecord[]> {
	const { begin, end } = buildUtcRange(date);
	const payload = {
		keyword: "",
		page: 1,
		pageSize: 200,
		states: TELECONTROL_STATES,
		beginTime: begin,
		endTime: end,
		antennaIds: [],
		spacecraftIds: [spacecraftId],
		order: 3,
	};
	let lastError: any = null;
	for (const url of TELECONTROL_SEARCH_URLS) {
		try {
			const resp = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-web-token": token,
				},
				body: JSON.stringify(payload),
			});
			if (!resp.ok) throw new Error(String(resp.status));
			const result = await resp.json();
			const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
			return Array.isArray(list) ? list : [];
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError || new Error("telecontrol fetch failed");
}

function buildUtcRange(date: string) {
	const base = new Date(`${date}T00:00:00`).getTime() + 8 * 60 * 60 * 1000;
	const day = 24 * 60 * 60 * 1000;
	return { begin: base, end: base + day };
}

type PendingFile = { start: number; end: number };

async function fetchPendingFiles(satellite: "AS02" | "AS03"): Promise<PendingFile[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const res = await api.page({ page: 1, size: 200, name, status: 2 });
	const list = res?.list || res?.data?.list || [];
	const sorted = list
		.map((x: any) => {
			const start = Number(x?.startFileNo ?? x?.start_file_no);
			const endRaw = Number(x?.endFileNo ?? x?.end_file_no);
			const end = Number.isFinite(endRaw) ? endRaw : start + 7;
			return { start, end };
		})
		.filter((x: any) => Number.isFinite(x.start))
		.sort((a: any, b: any) => a.start - b.start);
	const unique: PendingFile[] = [];
	const seen = new Set<number>();
	for (const r of sorted) {
		if (seen.has(r.start)) continue;
		seen.add(r.start);
		unique.push({ start: r.start, end: Number.isFinite(r.end) ? r.end : r.start + 7 });
		if (unique.length >= 4) break;
	}
	return unique;
}

async function fetchDeletableFiles(satellite: "AS02" | "AS03"): Promise<PendingFile[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const res = await api.page({ page: 1, size: 200, name, status: 6 });
	const list = res?.list || res?.data?.list || [];
	const sorted = list
		.map((x: any) => {
			const start = Number(x?.startFileNo ?? x?.start_file_no);
			const endRaw = Number(x?.endFileNo ?? x?.end_file_no);
			const end = Number.isFinite(endRaw) ? endRaw : start + 7;
			return { start, end };
		})
		.filter((x: any) => Number.isFinite(x.start))
		.sort((a: any, b: any) => a.start - b.start);
	const unique: PendingFile[] = [];
	const seen = new Set<number>();
	for (const r of sorted) {
		if (seen.has(r.start)) continue;
		seen.add(r.start);
		unique.push({ start: r.start, end: Number.isFinite(r.end) ? r.end : r.start + 7 });
	}
	return unique;
}

async function buildDataTransTask(token: string, start: Date, end: Date): Promise<TimelineItem | null> {
	try {
		const dateStr = formatDateYMD(start);
		const records = await fetchTelecontrolRecords(token, dateStr, "12");
		if (!records?.length) return null;
		const thresholdUtc = new Date(`${dateStr}T17:00:00+08:00`).getTime(); // 北京 17:00
		const sorted = [...records].sort((a, b) => (a.beginTime ?? 0) - (b.beginTime ?? 0));
		const afterEvening = sorted.filter((r) => (r.beginTime ?? 0) >= thresholdUtc);
		const pass = afterEvening[0];
		if (!pass || !pass.beginTime) return null;
		const slotBegin = Number(pass.beginTime);
		const startTs = slotBegin + 60 * 1000; // +1min
		if (startTs < start.getTime() || startTs > end.getTime()) return null;

		const pending = await fetchPendingFiles("AS02");
		if (pending.length < 3) {
			ElMessage.warning("数传文件较少(<3)，不生成数传任务");
			return null;
		}
		const groups = buildTransferGroups(pending);
		const filesText = pending.length ? `Files: ${pending.map((p) => p.start).join(", ")}` : "Files: -";
		const antennaId = pass.antennaId ?? (pass as any)?.antenna_id ?? null;
		return {
			id: `data-${startTs}`,
			name: "数传任务",
			type: "data",
			time: formatDisplay(new Date(startTs)),
			meta: `Antenna: ${antennaId ?? "-"} | ${filesText}`,
			startTs,
			endTs: Number(pass.dataTrans?.endTime ?? pass.endTime ?? startTs),
			antennaId: antennaId ? String(antennaId) : null,
			teleBegin: slotBegin,
			teleEnd: Number(pass.dataTrans?.endTime ?? pass.endTime ?? null) || null,
			files: pending.map((p) => String(p.start)),
			raw: { groups },
			cloud: null,
			priority: null,
		};
	} catch (e) {
		console.warn("[one-click-plan] buildDataTransTask failed", e);
		return null;
	}
}

async function buildDeleteTasks(start: Date, end: Date): Promise<TimelineItem[]> {
	try {
		const sat: "AS02" | "AS03" = "AS02";
		const files = await fetchDeletableFiles(sat);
		if (!files.length) return [];
		// 次日早晨窗口（默认 07:00 开始，6h 窗口）
		const base = new Date(start.getTime() + 24 * 60 * 60 * 1000);
		base.setHours(7, 0, 0, 0);
		const windowStart = base.getTime();
		const windowEnd = windowStart + 6 * 60 * 60 * 1000;
		let chosen = windowStart;
		const allReserved = [windowStart]; // include start to ensure gap calc init
		for (const r of timeline.value) {
			allReserved.push(r.startTs);
		}
		allReserved.sort((a, b) => a - b);
		const minGap = 30 * 60 * 1000;
		// find earliest slot in windowStart..windowEnd that is 30min away from existing
		for (let t = windowStart; t <= windowEnd; t += 5 * 60 * 1000) {
			const ok = allReserved.every((x) => Math.abs(t - x) >= minGap);
			if (ok) {
				chosen = t;
				break;
			}
		}
		if (chosen < windowStart || chosen > windowEnd) return [];

		// 按连续块分组（start + 8 视为连续）
		const sorted = [...files].sort((a, b) => a.start - b.start);
		const groups: PendingFile[][] = [];
		let current: PendingFile[] = [];
		for (const f of sorted) {
			if (!current.length) {
				current.push(f);
				continue;
			}
			const expected = current[0].start + current.length * 8;
			if (f.start === expected) {
				current.push(f);
			} else {
				groups.push(current);
				current = [f];
			}
		}
		if (current.length) groups.push(current);

		const tasks: TimelineItem[] = [];
		for (let i = 0; i < groups.length; i++) {
			const g = groups[i];
			const deleteStart = g[0].start;
			const deleteEnd = g[g.length - 1].start + 7;
			const ts = chosen + i * 60 * 60 * 1000; // 间隔 1h
			if (ts > windowEnd) break;
			tasks.push({
				id: `delete-${ts}-${deleteStart}-${deleteEnd}`,
				name: "固存删除任务",
				type: "delete",
				time: formatDisplay(new Date(ts)),
				meta: `Delete: ${deleteStart}-${deleteEnd}`,
				startTs: ts,
				endTs: ts + 5 * 60 * 1000,
				deleteFiles: g.map((f) => String(f.start)),
				files: g.map((f) => String(f.start)),
				raw: { startFile: deleteStart, endFile: deleteEnd, count: g.length },
				cloud: null,
				priority: null,
			});
		}
		return tasks;
	} catch (e) {
		console.warn("[one-click-plan] buildDeleteTask failed", e);
		return [];
	}
}

const antennaGeoCache = new Map<string, { longitude: number; latitude: number; altitude: number; name: string }>();
let antennaListCache: any[] | null = null;

function toIsoString(val: any): string {
	if (val == null || val === "") return "";
	if (typeof val === "number") {
		return new Date(val).toISOString();
	}
	const raw = String(val);
	const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function pickRollAngle(source: any): string {
	const cand =
		source?.rollAng ??
		source?.roll_angle ??
		source?.rollAngle ??
		source?.roll_angle_value ??
		source?.side_swipe_angle ??
		source?.roll_ang ??
		"";
	return cand == null ? "" : String(cand);
}

function pickSolarAngle(source: any): string {
	const cand =
		source?.solarAng ??
		source?.solar_angle ??
		source?.solarAngle ??
		source?.sunElevation ??
		source?.sunElevationDeg ??
		source?.sun_elevation ??
		source?.sun_angle ??
		"";
	return cand == null ? "" : String(cand);
}

function mapSolarAngleCode(value: any): string {
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return value == null ? "" : String(value);
	}
	if (num >= 20 && num < 30) return "0x1111";
	if (num >= 30 && num < 40) return "0x2222";
	if (num >= 40 && num < 50) return "0x3333";
	if (num >= 50 && num < 60) return "0x4444";
	if (num >= 60 && num < 70) return "0x5555";
	return String(num);
}

function formatBeijingTime(val: any): string {
	const ts = (() => {
		if (typeof val === "number") return val;
		const num = Number(val);
		if (Number.isFinite(num)) return num;
		const d = new Date(val);
		return d.getTime();
	})();
	if (!Number.isFinite(ts)) return "";
	const offset = 8 * 60 * 60 * 1000;
	const d = new Date(ts + offset);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}:${pad(
		d.getUTCMinutes()
	)}:${pad(d.getUTCSeconds())}`;
}

function buildMeta(item: TimelineItem): string {
	const parts: string[] = [];
	if (item.type === "data") {
		if (item.files?.length) parts.push(`Files: ${item.files.join(",")}`);
		if (item.raw?.groups?.length) {
			const ranges = item.raw.groups
				.map((g: any, idx: number) => `${g.start}-${g.end}(${g.duration || g.time || ""}s)`)
				.join("; ");
			if (ranges) parts.push(`Ranges: ${ranges}`);
		}
		if (item.antennaId) parts.push(`Antenna: ${item.antennaId}`);
		return parts.join(" | ") || "数传任务";
	}
	if (item.type === "delete") {
		if (item.raw?.startFile != null && item.raw?.endFile != null) {
			parts.push(`Delete: ${item.raw.startFile}-${item.raw.endFile}`);
		} else if (item.deleteFiles?.length) {
			parts.push(`Delete: ${item.deleteFiles.join(",")}`);
		}
		return parts.join(" | ") || "固存删除任务";
	}
	if (item.cloud != null) parts.push(`Cloud: ${item.cloud}%`);
	if (item.priority != null) parts.push(`Priority: ${item.priority}`);
	if (item.rollText) parts.push(`Roll: ${item.rollText}`);
	if (item.solarText) parts.push(`Sun: ${item.solarText}`);
	if (item.storageSlot) parts.push(`Slot: ${item.storageSlot}`);
	return parts.join(" | ") || "任务";
}

async function fetchEmptySlots(name: number, expect: number): Promise<any[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const size = Math.max(200, expect);
		let page = 1;
		const acc: any[] = [];
	while (acc.length < expect) {
		const res = await api.page({
			page,
			size,
			name,
			status: 0,
			sort: "startFileNo",
			order: "ASC",
		});
		const list = res?.list || res?.data?.list || [];
		if (!list.length) break;
		acc.push(...list);
		page += 1;
	}
	const seen = new Set<number>();
	return acc
		.map((r) => ({ ...r, startFileNo: Number(r?.startFileNo) }))
		.filter((r) => Number.isFinite(r.startFileNo))
		.filter((r) => {
			if (seen.has(r.startFileNo)) return false;
			seen.add(r.startFileNo);
			return true;
		})
		.sort((a, b) => Number(a.startFileNo) - Number(b.startFileNo))
		.slice(0, expect);
}

async function updateFixedStorageSlot(name: number, slot: any, item: TimelineItem) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.update || !slot?.id) return;
	const payload: Record<string, any> = {
		id: slot.id,
		status: 1,
	};
	if (item?.name) payload.targetName = String(item.name);
	const imagingTime = toIsoString(item?.startTs ?? item?.raw?.startAt ?? item?.raw?.startAtBeijing ?? "");
	if (imagingTime) payload.imagingTime = imagingTime;
	const imagingUid = ensureImagingUid(item);
	if (imagingUid) payload.imagingUid = imagingUid;
	await api.update({ name, data: payload });
}

async function postTemplate(body: Record<string, any>, token: string, type: "image" | "transfer" | "delete" = "image") {
	await validateCommandRequest(type, String(body.spacecraftCode || form.value.satellite || ""), body);
	const resp = await fetch(TRANSFER_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-web-token": token,
		},
		body: JSON.stringify(body),
	});
	if (!resp.ok) {
		const txt = await resp.text();
		throw new Error(txt || `HTTP ${resp.status}`);
	}
}

async function validateCommandRequest(type: "image" | "transfer" | "delete", satellite: string, params: any) {
	const payload = { type, satellite, params };
	const url = `${appConfig.baseUrl}/admin/task/command/validate`;
	try {
		const res = await request({
			url,
			method: "POST",
			data: payload,
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		if (result?.ok === false && Array.isArray(result?.errors)) {
			const msg = result.errors.map((e: any) => `${e.field}: ${e.message}`).join("；");
			throw new Error(msg || "指令参数校验未通过");
		}
	} catch (err: any) {
		throw new Error(err?.message || "指令参数校验失败");
	}
}

async function ensureAntennaList(token: string) {
	if (antennaListCache) return;
	const resp = await fetch(ANTENNA_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-web-token": token,
		},
		body: JSON.stringify({}),
	});
	if (!resp.ok) {
		const txt = await resp.text();
		throw new Error(txt || `HTTP ${resp.status}`);
	}
	const data = await resp.json();
	antennaListCache = data?.data?.getAllAntenna || data?.data || data?.list || [];
}

async function resolveAntennaGeoById(
	antennaId: string | null | undefined,
	token: string
): Promise<{ longitude: number; latitude: number; altitude: number; name: string }> {
	if (!antennaId) {
		throw new Error("数传天线缺少 antennaId");
	}
	const idStr = String(antennaId);
	const mappedName = TELECONTROL_ANTENNA_MAP.get(idStr);
	if (!mappedName) {
		throw new Error(`未找到天线 ${idStr} 的名称映射`);
	}
	if (antennaGeoCache.has(mappedName)) {
		return antennaGeoCache.get(mappedName)!;
	}
	await ensureAntennaList(token);
	const hit =
		antennaListCache?.find(
			(item: any) =>
				item?.name === mappedName ||
				item?.code === mappedName ||
				String(item?.id) === idStr ||
				String(item?.stationId) === idStr
		) ?? null;
	if (!hit) {
		throw new Error(`未在天线列表中找到 ${mappedName}`);
	}
	const geo = {
		longitude: Number(hit?.config?.geographicLocation?.longitude ?? hit?.longitude ?? hit?.long ?? 0) || 0,
		latitude: Number(hit?.config?.geographicLocation?.latitude ?? hit?.latitude ?? hit?.lat ?? 0) || 0,
		altitude: Number(hit?.config?.geographicLocation?.altitude ?? hit?.altitude ?? hit?.alt ?? 0) || 0,
		name: mappedName,
	};
	antennaGeoCache.set(mappedName, geo);
	return geo;
}

function buildTransferGroups(pending: PendingFile[]) {
	const sorted = [...pending].sort((a, b) => a.start - b.start).slice(0, 4);
	const groups: Array<{ start: number; end: number; count: number; duration: number }> = [];
	let current: { start: number; end: number; count: number } | null = null;
	for (const p of sorted) {
		if (!current) {
			current = { start: p.start, end: p.end, count: 1 };
			continue;
		}
		const expectedNextStart = current.start + current.count * 8;
		if (p.start === expectedNextStart) {
			current.count += 1;
			current.end = p.end;
		} else {
			groups.push({ ...current, duration: current.count * 90 });
			current = { start: p.start, end: p.end, count: 1 };
		}
	}
	if (current) {
		groups.push({ ...current, duration: current.count * 90 });
	}
	return groups;
}

function buildTransferBody(
	groups: Array<{ start: number; end: number; duration: number; count?: number }>,
	geo: any,
	t0Iso: string,
	startSeq: number
) {
	const base: Record<string, string> = {
		spacecraftCode: "AS02",
		templateId: TRANSFER_TEMPLATE_ID,
		folderId: TRANSFER_FOLDER_ID,
		name: `${geo?.name || "数传"}数传任务-${formatBeijingTime(t0Iso)}`,
		start_seq: String(startSeq),
		reset_seq: "true",
		t0: t0Iso,
		duration: "",
		trans_count: String(groups.length || 1),
		long: String(geo?.longitude ?? ""),
		lat: String(geo?.latitude ?? ""),
		alt: String(geo?.altitude ?? ""),
		trans_type: "1",
	};

	let totalDuration = 0;
	groups.forEach((g, idx) => {
		totalDuration += g.duration;
		if (idx === 0) {
			base.start_file = String(g.start);
			base.end_file = String(g.end);
			base.trans_time1 = String(g.duration);
		} else {
			base[`start_file${idx}`] = String(g.start);
			base[`end_file${idx}`] = String(g.end);
			base[`trans_type${idx}`] = "1";
			base[`trans_time${idx + 1}`] = String(g.duration);
		}
	});
	base.duration = String(totalDuration || "");

	// 补齐空字段
	for (let i = 1; i <= 8; i++) {
		base[`start_file${i}`] = base[`start_file${i}`] || "";
		base[`end_file${i}`] = base[`end_file${i}`] || "";
		base[`trans_type${i}`] = base[`trans_type${i}`] || "";
	}
	for (let i = 1; i <= 9; i++) {
		base[`trans_time${i}`] = base[`trans_time${i}`] || "";
	}

	return base;
}

function buildDeleteBody(range: { start: number; end: number }, startTimeIso: string, startSeq: number) {
	return {
		spacecraftCode: "AS02",
		templateId: DELETE_TEMPLATE_AS02,
		folderId: AS02_IMAGING_FOLDER,
		name: `固存删除任务-${formatBeijingTime(startTimeIso)}`,
		start_file: String(range.start ?? ""),
		end_file: String(range.end ?? ""),
		start_seq: String(startSeq),
		start_time: startTimeIso,
	};
}

async function submitImagingTasks(token: string, satellite: "AS02" | "AS03") {
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	if (!imaging.length) return;

	// 先为本次成像任务生成并缓存 UID，供固存回填/任务落库/数传关联复用
	imaging.forEach((item) => ensureImagingUid(item));

	if (satellite === "AS02") {
		const slots = await fetchEmptySlots(0, imaging.length);
		if (slots.length < imaging.length) {
			throw new Error(`AS02 固存空槽不足，需 ${imaging.length} 个，现有 ${slots.length} 个`);
		}
		let success = 0;
		for (let i = 0; i < imaging.length; i++) {
			const item = imaging[i];
			const slot = slots[i];
			const startIso = toIsoString(item.startTs);
			const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 40 * 1000));
			const imagingUid = ensureImagingUid(item);
			const body = {
				spacecraftCode: "AS02",
				templateId: AS02_IMAGING_TEMPLATE,
				folderId: AS02_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-${formatBeijingTime(item.startTs)}`,
				scanMode: "0x02",
				rollAng: pickRollAngle(item.raw ?? item),
				solarAng: mapSolarAngleCode(pickSolarAngle(item.raw ?? item)),
				startAt: startIso,
				endAt: endIso,
				fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
				imagingUid,
			};
			await postTemplate(body, token);
			success += 1;
			try {
				await updateFixedStorageSlot(0, slot, item);
			} catch (err) {
				console.warn("[one-click-plan] 回填 AS02 固存失败", err);
			}
		}
		ElMessage.success(`AS02 成像任务提交成功 ${success}/${imaging.length}`);
		return;
	}

	// AS03
	const slots = await fetchEmptySlots(2, imaging.length);
	if (slots.length < imaging.length) {
		throw new Error(`AS03 固存空槽不足，需 ${imaging.length} 个，现有 ${slots.length} 个`);
	}
	let success = 0;
	for (let i = 0; i < imaging.length; i++) {
		const item = imaging[i];
		const slot = slots[i];
		const startIso = toIsoString(item.startTs);
		const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 30 * 1000));
		const imagingUid = ensureImagingUid(item);
		// AS03 绝对延时指令号：首个任务从 3 开始，每个任务占用 56 个序号，第二个任务起始 59
		const baseSeq = 3 + i * 56;
		const resetSeq = i === 0;
		const bodies = [
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[0],
				folderId: AS03_IMAGING_FOLDER,
				name: `1.${item.name || "成像任务"}-焦面断电-${formatBeijingTime(item.startTs)}`,
				reset_seq: resetSeq,
				start_seq: String(baseSeq),
				tf: endIso,
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[1],
				folderId: AS03_IMAGING_FOLDER,
				name: `2.${item.name || "成像任务"}-制冷机启停-${formatBeijingTime(item.startTs)}`,
				t0: startIso,
				start_seq: String(baseSeq + 14),
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[2],
				folderId: AS03_IMAGING_FOLDER,
				name: `3.${item.name || "成像任务"}-成像序列+转姿态+GNSS转存-${formatBeijingTime(item.startTs)}`,
				start_seq: String(baseSeq + 47),
				t0: startIso,
				tf: endIso,
				side_swipe_angle: pickRollAngle(item.raw ?? item),
				imagingUid,
			},
		];
		for (const body of bodies) {
			await postTemplate(body, token);
		}
		success += 1;
		try {
			await updateFixedStorageSlot(2, slot, item);
		} catch (err) {
			console.warn("[one-click-plan] 回填 AS03 固存失败", err);
		}
	}
	ElMessage.success(`AS03 成像任务提交成功 ${success}/${imaging.length}`);
}

async function submitDataTransferTask(token: string): Promise<number | null> {
	const task = timeline.value.find((item) => item.type === "data");
	if (!task) return null;
	const pending = task.raw?.groups ? null : await fetchPendingFiles("AS02");
	const groups = task.raw?.groups ?? buildTransferGroups(pending || []);
	if (!groups.length || (pending && pending.length < 3)) {
		throw new Error("待数传文件不足或分组失败");
	}
	const t0Iso = toIsoString(task.startTs || task.teleBegin || Date.now());
	const t0Beijing = formatBeijingTime(task.startTs || task.teleBegin || Date.now());
	if (!t0Iso) {
		throw new Error("数传开始时间无效");
	}
	const geo = await resolveAntennaGeoById(task.antennaId, token);
	const startSeq = 3;
	const body = buildTransferBody(groups, geo, t0Iso, startSeq);
	await postTemplate(body, token, "transfer");
	const consumption = groups.length + 2;
	const lastSeq = startSeq + consumption - 1;

	// 数传回填：依据文件号 -> 固存 -> imagingUid -> 任务记录表
	try {
		const transferUid = generateImagingUid();
		const transferName = resolveTransferStation(task);
		const fileStarts: Array<string | number> = [
			...(Array.isArray(task.files) ? task.files : []),
			...(Array.isArray(task.raw?.files) ? task.raw.files : []),
			...parseStartNosFromMeta(task.meta),
			...parseStartNosFromMeta(task.raw?.meta),
		];
		await syncTransferToTasks("AS02", groups, transferName, t0Iso, transferUid, fileStarts);
	} catch (err) {
		console.warn("[one-click-plan] sync transfer info failed", err);
	}

	ElMessage.success("数传任务提交成功");
	return lastSeq;
}

function resolveTransferStation(task: TimelineItem): string {
	const name =
		task?.raw?.station ||
		task?.raw?.stationName ||
		(task?.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "") ||
		"";
	const trimmed = String(name || "").trim();
	// transferName 字段后端长度为 50，防止超长
	return trimmed ? trimmed.slice(0, 48) : "-";
}

function parseStartNosFromMeta(meta: string | undefined | null): number[] {
	if (!meta) return [];
	const matches = String(meta).match(/\d+/g);
	if (!matches) return [];
	return matches.map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

async function submitDeleteTasks(token: string, baseSeq: number | null) {
	const tasks = timeline.value.filter((item) => item.type === "delete").sort((a, b) => a.startTs - b.startTs);
	if (!tasks.length) return;
	let currentSeq = baseSeq != null ? baseSeq + 1 : 3; // if transfer existed, start after它; else默认3
	for (const task of tasks) {
		const files = task.raw?.startFile ? null : await fetchDeletableFiles("AS02");
		const deleteStart = Number(task.raw?.startFile ?? (files?.[0]?.start));
		const deleteEnd = Number(
			task.raw?.endFile ??
				(files && files.length ? Math.max(...files.map((f) => Number(f.end ?? f.start + 7))) : NaN)
		);
		if (!Number.isFinite(deleteStart) || !Number.isFinite(deleteEnd)) {
			throw new Error("删除文件号异常");
		}
		const startIso = toIsoString(task.startTs ?? Date.now());
		if (!startIso) {
			throw new Error("删除任务开始时间无效");
		}
		const body = buildDeleteBody({ start: deleteStart, end: deleteEnd }, startIso, currentSeq);
		await postTemplate(body, token, "delete");
		const fileCount = Number(task.raw?.count ?? task.deleteFiles?.length ?? 1);
		const consumption = 3 + (Number.isFinite(fileCount) ? fileCount : 1);
		currentSeq += consumption;
	}
	ElMessage.success("固存删除任务提交成功");
}

async function fetchFixedStorageByStartList(starts: number[]): Promise<any[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = 0; // AS02 载荷
	const uniq = Array.from(new Set(starts.filter((n) => Number.isFinite(n))));
	if (!uniq.length) return [];
	const records: any[] = [];
	for (const start of uniq) {
		try {
			const res = await api.page({ page: 1, size: 5, name, startFileNo: start });
			const list = res?.list || res?.data?.list || [];
			if (Array.isArray(list) && list.length) {
				records.push(...list);
			}
		} catch (err) {
			console.warn("[one-click-plan] fetchFixedStorageByStartList failed", err);
		}
	}
	return records;
}

async function syncTransferToTasks(
	satellite: "AS02" | "AS03",
	groups: Array<{ start: number; end: number; duration: number; count?: number }>,
	transferName: string,
	transferTimeIso: string,
	transferUid: string,
	fileStarts: Array<string | number> = []
) {
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) return;

	// 汇总候选起始号：显式文件列表 + 分组的 start/end + 连续块推导（步长 8，仅限有 count 的场景）
	const startSet = new Set<number>();
	const pushNum = (n: number) => {
		if (Number.isFinite(n)) startSet.add(Number(n));
	};

	fileStarts.forEach((v) => pushNum(Number(v)));
	groups.forEach((g) => {
		pushNum(Number(g.start));
		pushNum(Number(g.end));
		const count = Number((g as any)?.count);
		if (Number.isFinite(count) && count > 1) {
			const step = 8; // AS02 载荷默认步长
			for (let i = 1; i < count; i++) {
				pushNum(Number(g.start) + i * step);
			}
		}
	});

	const storageRows = await fetchFixedStorageByStartList(Array.from(startSet));

	const uidSet = new Set<string>();
	for (const row of storageRows) {
		const uid =
			row?.imagingUid ||
			row?.imaging_uid ||
			row?.imagingUID ||
			row?.__imagingUid ||
			row?.__imagingUID;
		if (uid != null && uid !== "") {
			uidSet.add(String(uid));
		}
	}

	if (!uidSet.size) {
		console.warn("[one-click-plan] 未在固存记录中找到 imagingUid，跳过数传回填");
		return;
	}

	for (const uid of uidSet) {
		const res = await svc.page({ page: 1, size: 20, imagingUID: uid });
		const list = res?.list || res?.data?.list || [];
		if (!Array.isArray(list) || !list.length) continue;
		for (const item of list) {
			if (!item?.id) continue;
			const records = Array.isArray(item.transferRecords) ? [...item.transferRecords] : [];
			records.push({ name: transferName, time: transferTimeIso, uid: transferUid });
			await svc.update({
				id: item.id,
				transferName,
				transferTime: transferTimeIso,
				transferUID: transferUid,
				transferRecords: records,
			});
		}
	}
}

async function submitPlannedTasks() {
	if (!timeline.value.length) {
		ElMessage.warning("请先生成时间轴任务");
		return;
	}
	const satellite = form.value.satellite as "AS02" | "AS03";
	submitting.value = true;
	try {
		const token = await getToken();
		if (taskSwitches.imaging) {
			await submitImagingTasks(token, satellite);
		}
		if (satellite === "AS02") {
			let lastSeq: number | null = null;
			if (taskSwitches.transfer) {
				lastSeq = await submitDataTransferTask(token);
			}
			if (taskSwitches.delete) {
				await submitDeleteTasks(token, lastSeq);
			}
		}
		await recordImagingUids();
		await recordImagingTasks();
		submissionSummary.value = buildSubmissionSummaryText();
		submissionDialogVisible.value = true;
	} catch (err: any) {
		ElMessage.error(err?.message || String(err) || "提交失败");
	} finally {
		submitting.value = false;
	}
}

function buildSubmissionSummaryText(): string {
	const lines: string[] = [];
	const orbitText = orbitElements.value ? JSON.stringify(orbitElements.value) : "";
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => a.startTs - b.startTs);
	if (imaging.length) {
		imaging.forEach((it, idx) => {
			const monthDay = formatMonthDay(it.startTs);
			const priorityText = formatNumberText(it.raw?.priority ?? it.priority, 0);
			const priority = priorityText && priorityText !== "--" ? priorityText : "1";
			const scanMode = "直通"; // AS02 默认直通
			const cameraState = "双相机";
			const lonText = formatNumberText(
				it.raw?.long ?? it.raw?.longitude ?? it.raw?.lon ?? it.raw?.area_lon ?? it.raw?.areaLon,
				4
			);
			const lon = lonText && lonText !== "--" ? lonText : "-";
			const latText = formatNumberText(
				it.raw?.lat ?? it.raw?.latitude ?? it.raw?.area_lat ?? it.raw?.areaLat,
				4
			);
			const lat = latText && latText !== "--" ? latText : "-";
			const cloud = formatPercentText(it.raw?.cloud ?? it.cloud);
			const roll = it.rollText ?? "-";
			const sun = it.solarText ?? "-";
			const startTime = formatDisplay(new Date(it.startTs));
			const slot = it.storageSlot || "-";
			const satellite = String(it.raw?.satellite || form.value.satellite || "").toUpperCase();
			if (satellite === "AS03") {
				const altText = formatNumberText(
					it.raw?.alt ?? it.raw?.altitude ?? it.raw?.area_alt ?? it.raw?.areaAlt ?? 0,
					0
				);
				const alt = altText && altText !== "--" ? altText : "0";
				const tf = formatDisplay(new Date(it.endTs ?? it.startTs));
				const imageKind = "推扫成像";
				const fileRef = slot ? `记录文件号${slot}。` : "记录文件号未知。";
				lines.push(
					`${idx + 1}.上注${monthDay} ${it.name}目标点任务：\n` +
						`${priority}级目标，目标点为\n` +
						`${it.name}，经度${lon}，纬度${lat}，高度${alt}m，云量${cloud}，侧摆角${roll}，\n` +
						`太阳高度角${sun}，${imageKind}成像时间${startTime}~${tf}，${fileRef}\n` +
						`预报星历：${orbitText}\n` +
						`预报方法：姿轨控新方法`
				);
			} else {
				const startNum = Number(slot);
				const fileRange =
					Number.isFinite(startNum) && satellite === "AS02"
						? `${startNum}~${startNum + 7}(${scanMode})`
						: `${slot}`;
				lines.push(
					`${idx + 1}.上注${monthDay} ${it.name}目标点任务：\n` +
						`${priority}级目标 ${scanMode}推扫成像任务，${cameraState}成像，目标点为\n` +
						`${it.name}，经度${lon}，纬度${lat}，云量${cloud}，侧摆角${roll}，\n` +
						`太阳高度角${sun}，成像时间${startTime}，记录文件号${fileRange}。\n` +
						`预报星历：${orbitText}\n` +
						`预报方法：姿轨控新方法`
				);
			}
		});
	}

	const dataTask = timeline.value.find((item) => item.type === "data");
	if (dataTask) {
		const time = formatDisplay(new Date(dataTask.startTs));
		const ranges =
			dataTask.raw?.groups?.length
				? dataTask.raw.groups.map((g: any) => `${g.start}-${g.end}`).join("，")
				: dataTask.files?.join(",") || "-";
		const station =
			(form.value as any).stationName ||
			(form.value as any).station ||
			(dataTask.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(dataTask.antennaId)) : "-") ||
			"-";
		lines.push(
			`${lines.length + 1}.上注数传任务，数传站：${station}，开始下数时间：${time}，数传文件号：载荷${ranges}`
		);
	}

	const deletes = timeline.value.filter((item) => item.type === "delete").sort((a, b) => a.startTs - b.startTs);
	if (deletes.length) {
		deletes.forEach((it) => {
			const time = formatDisplay(new Date(it.startTs));
			const start = it.raw?.startFile ?? "-";
			const end = it.raw?.endFile ?? "-";
			lines.push(
				`${lines.length + 1}.上注载荷固存删除任务，删除文件号${start}~${end}，任务执行时间：${time}`
			);
		});
	}

	return lines.join("\n\n");
}

// 生成 imaging UID 并推送
async function recordImagingUids() {
	const svc = form.value.satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) return;
	const imaging = timeline.value.filter((it) => it.type !== "data" && it.type !== "delete");
	for (const it of imaging) {
		const uid = ensureImagingUid(it);
		it.raw = it.raw || {};
		it.raw.imagingUid = uid;
	}
	// 逐条更新 task 表
	for (const it of imaging) {
		const uid = it.raw?.imagingUid;
		if (!uid) continue;
		try {
			const res = await svc.page({ page: 1, size: 1, imagingTime: toIsoString(it.startTs) });
			const list = res?.list || res?.data?.list || [];
			const row = list[0];
			if (!row?.id) continue;
			await svc.update({
				id: row.id,
				imagingUID: uid,
			});
		} catch (err) {
			console.warn("[one-click-plan] recordImagingUids failed", err);
		}
	}
}

async function recordImagingTasks() {
	const imaging = timeline.value.filter((it) => it.type !== "data" && it.type !== "delete");
	if (!imaging.length) return;
	const satellite = String(form.value.satellite || "").toUpperCase();
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc) return;

	const tasks = imaging.map((it) => {
		const payload: Record<string, any> = {
			satelliteCode: satellite,
			imagingTarget: it.name || it.raw?.name || "",
			imagingUID:
				it.raw?.imagingUid ||
				it.raw?.imagingUID ||
				it.raw?.imaging_uid ||
				it.raw?.__imagingUid ||
				generateImagingUid(),
			longitude: normalizeDecimal(
				it.raw?.long ?? it.raw?.longitude ?? it.raw?.lon ?? it.raw?.area_lon ?? it.raw?.areaLon,
				0
			),
			latitude: normalizeDecimal(it.raw?.lat ?? it.raw?.latitude ?? it.raw?.area_lat ?? it.raw?.areaLat, 0),
			cloudCoverage: normalizeDecimal(it.raw?.cloud ?? it.cloud, 0),
			sunElevation: normalizeDecimal(it.solarText ?? it.raw?.solarAng ?? it.raw?.solar_angle ?? it.raw?.solarAngle, 0),
			status: 0,
		};
		const imagingSource =
			it.raw?.startAtBeijing ||
			it.raw?.start_at_beijing ||
			it.raw?.t0_beijing ||
			it.raw?.startAt ||
			it.raw?.start_at ||
			it.raw?.t0 ||
			it.startTs;
		if (imagingSource) payload.imagingTime = toIsoString(imagingSource);
		if (orbitElements.value) {
			try {
				payload.orbitElements = orbitElements.value;
			} catch {
				payload.orbitElements = null;
			}
		}
		return payload;
	});

	const normalizedTasks = tasks.map((task) => {
		const payload: Record<string, any> = {
			satelliteCode: task.satelliteCode ?? satellite,
			imagingTarget: task.imagingTarget ?? "",
			imagingUID: task.imagingUID ?? generateImagingUid(),
			longitude: normalizeDecimal(task.longitude, 0),
			latitude: normalizeDecimal(task.latitude, 0),
			cloudCoverage: normalizeDecimal(task.cloudCoverage, 0),
			sunElevation: normalizeDecimal(task.sunElevation, 0),
			status: Number.isFinite(Number(task.status)) ? Number(task.status) : 0,
		};
		if (task.imagingTime) payload.imagingTime = task.imagingTime;
		if (task.ephemerisTime) payload.ephemerisTime = task.ephemerisTime;
		if (task.transferName) payload.transferName = task.transferName;
		if (task.transferTime) payload.transferTime = task.transferTime;
		if (task.transferUID) payload.transferUID = task.transferUID;
		if (task.thumbnailUrl) payload.thumbnailUrl = task.thumbnailUrl;
		if (task.orbitElements) {
			try {
				payload.orbitElements = task.orbitElements;
			} catch {
				payload.orbitElements = null;
			}
		}
		return payload;
	});

	let lastError: any = null;
	const createFromForecast = (svc as any)?.createFromForecast;
	if (typeof createFromForecast === "function") {
		try {
			await createFromForecast({ tasks: normalizedTasks });
			return;
		} catch (err) {
			lastError = err;
			console.warn("[one-click-plan] createFromForecast failed, fallback request", err);
		}
	}
	if (typeof svc?.request === "function") {
		try {
			await svc.request({
				url: "/createFromForecast",
				method: "POST",
				data: { tasks: normalizedTasks },
			});
			return;
		} catch (err) {
			lastError = err;
			console.warn("[one-click-plan] /createFromForecast request failed, fallback add", err);
		}
	}
	if (typeof svc?.add === "function") {
		for (const payload of normalizedTasks) {
			try {
				await svc.add(payload);
			} catch (err) {
				lastError = err;
				console.warn("[one-click-plan] add task failed", err);
			}
		}
		return;
	}
	if (lastError) {
		throw lastError;
	}
}

function generateImagingUid(): string {
	let timestamp = Date.now() - UID_EPOCH;
	if (timestamp === uidLastTimestamp) {
		const maxSeq = Math.pow(2, UID_SEQUENCE_BITS) - 1;
		uidSequence = (uidSequence + 1) & maxSeq;
		if (uidSequence === 0) {
			timestamp = waitNextMillis(timestamp);
		}
	} else {
		uidSequence = 0;
	}
	uidLastTimestamp = timestamp;

	const timestampPart = padBase36(timestamp % UID_TIMESTAMP_MOD, Math.ceil(UID_TIMESTAMP_BITS / 5));
	const machinePart = padBase36(UID_MACHINE_ID, Math.ceil(UID_MACHINE_BITS / 5));
	const pidPart = padBase36(UID_PID, Math.ceil(UID_PID_BITS / 5));
	const seqPart = padBase36(uidSequence, Math.ceil(UID_SEQUENCE_BITS / 5));
	return `${timestampPart}${machinePart}${pidPart}${seqPart}`;
}

function waitNextMillis(current: number): number {
	let ts = Date.now() - UID_EPOCH;
	while (ts <= current) {
		ts = Date.now() - UID_EPOCH;
	}
	return ts;
}

function padBase36(value: number, length: number): string {
	const text = Math.max(0, value).toString(36);
	return text.padStart(length, "0").slice(-length);
}
</script>

<style scoped>
.one-click-page {
	padding: 8px 8px 96px; /* 与其他页面一致，给底部留空间 */
	display: flex;
	flex-direction: column;
	gap: 12px;
	box-sizing: border-box;
	min-height: 100vh;      /* 由外层滚动 */
	height: auto;
	overflow: visible;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.plan-range {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.mb16 {
	margin-bottom: 16px;
}

.timeline-chart {
	width: 100%;
	height: 380px;
}

.summary-text {
	white-space: pre-line;
	line-height: 1.6;
}

.summary-card {
	position: relative;
}

:global(.app-main) {
	height: 100vh !important;
	overflow: auto !important;
}

</style>
