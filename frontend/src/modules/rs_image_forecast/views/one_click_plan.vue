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
	</div>
</template>

<script lang="ts" setup>
defineOptions({ name: "one-click-plan" });

import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useCool } from "/@/cool";
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

const form = ref({ satellite: "AS02", date: Date.now() });
const { service } = useCool();
const loading = ref(false);
const submitting = ref(false);
const timeline = ref<TimelineItem[]>([]);
const planRange = computed(() => buildRange(form.value.date));
const rangeText = computed(() => `${formatDisplay(planRange.value.start)} ~ ${formatDisplay(planRange.value.end)}`);

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

onMounted(() => {
	if (chartRef.value) {
		chart = echarts.init(chartRef.value);
	}
	updateChart();
});

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

async function runOneClickPlan() {
	const { start, end } = planRange.value;
	loading.value = true;
	try {
		const { targets, priorityMap } = await fetchAllTargets(form.value.satellite);
		if (!targets.length) throw new Error("未获取到目标库数据");
		const token = await getToken();
		const ephemeris = await fetchOrbitElementsForSatellite(form.value.satellite, token);

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
			form.value.satellite === "AS02" ? await buildDataTransTask(token, planRange.value.start, planRange.value.end) : null;
		const deleteTask =
			form.value.satellite === "AS02" ? await buildDeleteTask(planRange.value.start, planRange.value.end) : null;
		const reservedTimes = [dataTask?.startTs, deleteTask?.startTs].filter(Boolean) as number[];
		const gapMs = form.value.satellite === "AS03" ? 2.5 * 60 * 60 * 1000 : 80 * 60 * 1000;
		const noonTs = new Date(planRange.value.start);
		noonTs.setHours(12, 0, 0, 0);

		const picked =
			form.value.satellite === "AS03"
				? pickWithPreference(cloudFiltered, imagingLimit, gapMs, reservedTimes, noonTs.getTime())
				: pickTopTasks(cloudFiltered, imagingLimit, gapMs, reservedTimes);

		let items = picked.map((r, idx) => {
			const timeText = formatDisplay(new Date(r.startTs));
			const type = mapTaskType(r);
			const endTs = Number(r.startTs ?? 0) + 40 * 1000;
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
				cloud: r.cloud ?? null,
				priority: r.priority ?? null,
			} as TimelineItem;
		});
		if (dataTask) items = [...items, dataTask];
		if (deleteTask) items = [...items, deleteTask];
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

async function fetchPendingFiles(satellite: "AS02" | "AS03"): Promise<string[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const res = await api.page({ page: 1, size: 200, name, status: 2 });
	const list = res?.list || res?.data?.list || [];
	const sorted = list
		.map((x: any) => ({
			startFileNo: Number(x?.startFileNo),
			endFileNo: Number(x?.endFileNo),
		}))
		.filter((x: any) => Number.isFinite(x.startFileNo))
		.sort((a: any, b: any) => a.startFileNo - b.startFileNo);
	return sorted.slice(0, 4).map((x: any) => String(x.startFileNo));
}

async function fetchDeletableFiles(satellite: "AS02" | "AS03"): Promise<string[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const res = await api.page({ page: 1, size: 200, name, status: 6 });
	const list = res?.list || res?.data?.list || [];
	const sorted = list
		.map((x: any) => ({
			startFileNo: Number(x?.startFileNo),
			endFileNo: Number(x?.endFileNo),
		}))
		.filter((x: any) => Number.isFinite(x.startFileNo))
		.sort((a: any, b: any) => a.startFileNo - b.startFileNo);
	return sorted.slice(0, 4).map((x: any) => String(x.startFileNo));
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

		const files = await fetchPendingFiles("AS02");
		const filesText = files.length ? `Files: ${files.join(", ")}` : "Files: -";
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
			files,
			cloud: null,
			priority: null,
		};
	} catch (e) {
		console.warn("[one-click-plan] buildDataTransTask failed", e);
		return null;
	}
}

async function buildDeleteTask(start: Date, end: Date): Promise<TimelineItem | null> {
	try {
		const sat: "AS02" | "AS03" = "AS02";
		const files = await fetchDeletableFiles(sat);
		if (!files.length) return null;
		const base = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 次次日 00:00
		base.setHours(0, 0, 0, 0);
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
		if (chosen < windowStart || chosen > windowEnd) return null;
		const startFile = files[0];
		const endFile = files[files.length - 1] ?? startFile;
		return {
			id: `delete-${chosen}`,
			name: "固存删除任务",
			type: "delete",
			time: formatDisplay(new Date(chosen)),
			meta: `Delete files: ${files.join(", ")}`,
			startTs: chosen,
			endTs: chosen + 5 * 60 * 1000,
			deleteFiles: files,
			files,
			raw: { startFile, endFile },
			cloud: null,
			priority: null,
		};
	} catch (e) {
		console.warn("[one-click-plan] buildDeleteTask failed", e);
		return null;
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

async function fetchEmptySlots(name: number, expect: number): Promise<any[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const size = Math.max(200, expect);
	let page = 1;
	let acc: any[] = [];
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
	await api.update({ name, data: payload });
}

async function postTemplate(body: Record<string, any>, token: string) {
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

function buildTransferBody(range: { start: number; end: number }, geo: any, t0Iso: string) {
	const duration = "360";
	const base: Record<string, string> = {
		spacecraftCode: "AS02",
		templateId: TRANSFER_TEMPLATE_ID,
		folderId: TRANSFER_FOLDER_ID,
		name: `${geo?.name || "数传"}数传任务-${t0Iso?.replace("T", " ").replace("Z", "") || ""}`,
		start_seq: "3",
		reset_seq: "true",
		t0: t0Iso,
		duration,
		trans_count: "1",
		long: String(geo?.longitude ?? ""),
		lat: String(geo?.latitude ?? ""),
		alt: String(geo?.altitude ?? ""),
		start_file: String(range.start ?? ""),
		end_file: String(range.end ?? ""),
		trans_type: "1",
		trans_time1: duration,
	};

	// 补齐 start_file1~8 / end_file1~8 / trans_type1~8 / trans_time2~9 为空串
	for (let i = 1; i <= 8; i++) {
		base[`start_file${i}`] = base[`start_file${i}`] || "";
		base[`end_file${i}`] = base[`end_file${i}`] || "";
		base[`trans_type${i}`] = base[`trans_type${i}`] || "";
	}
	for (let i = 2; i <= 9; i++) {
		base[`trans_time${i}`] = base[`trans_time${i}`] || "";
	}

	return base;
}

function buildDeleteBody(range: { start: number; end: number }, startTimeIso: string) {
	return {
		spacecraftCode: "AS02",
		templateId: DELETE_TEMPLATE_AS02,
		folderId: AS02_IMAGING_FOLDER,
		name: `固存删除任务-${formatBeijingTime(startTimeIso)}`,
		start_file: String(range.start ?? ""),
		end_file: String(range.end ?? ""),
		start_seq: "3",
		start_time: startTimeIso,
	};
}

async function submitImagingTasks(token: string, satellite: "AS02" | "AS03") {
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	if (!imaging.length) return;

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
			const body = {
				spacecraftCode: "AS02",
				templateId: AS02_IMAGING_TEMPLATE,
				folderId: AS02_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-${formatBeijingTime(item.startTs)}`,
				scanMode: "0x02",
				rollAng: pickRollAngle(item.raw ?? item),
				solarAng: pickSolarAngle(item.raw ?? item),
				startAt: startIso,
				endAt: endIso,
				fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
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
		const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 40 * 1000));
		const baseSeq = Number(slot?.startFileNo ?? slot?.start_file_no ?? 1) || 1;
		const bodies = [
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[0],
				folderId: AS03_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-1-${formatBeijingTime(item.startTs)}`,
				reset_seq: "1",
				start_seq: String(baseSeq),
				tf: endIso,
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[1],
				folderId: AS03_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-2-${formatBeijingTime(item.startTs)}`,
				t0: startIso,
				start_seq: String(baseSeq + 14),
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[2],
				folderId: AS03_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-3-${formatBeijingTime(item.startTs)}`,
				start_seq: String(baseSeq + 47),
				t0: startIso,
				tf: endIso,
				side_swipe_angle: pickRollAngle(item.raw ?? item),
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

async function submitDataTransferTask(token: string) {
	const task = timeline.value.find((item) => item.type === "data");
	if (!task) return;
	const files = task.files && task.files.length ? task.files : await fetchPendingFiles("AS02");
	if (!files.length) {
		throw new Error("待数传文件列表为空");
	}
	const start = Number(files[0]);
	const end = Number(files[files.length - 1] ?? files[0]);
	if (!Number.isFinite(start) || !Number.isFinite(end)) {
		throw new Error("数传文件号异常");
	}
	const t0Iso = toIsoString(task.startTs || task.teleBegin || Date.now());
	if (!t0Iso) {
		throw new Error("数传开始时间无效");
	}
	const geo = await resolveAntennaGeoById(task.antennaId, token);
	const body = buildTransferBody({ start, end }, geo, t0Iso);
	await postTemplate(body, token);
	ElMessage.success("数传任务提交成功");
}

async function submitDeleteTask(token: string) {
	const task = timeline.value.find((item) => item.type === "delete");
	if (!task) return;
	const files = task.deleteFiles && task.deleteFiles.length ? task.deleteFiles : await fetchDeletableFiles("AS02");
	if (!files.length) {
		throw new Error("待删除文件列表为空");
	}
	const start = Number(files[0]);
	const end = Number(files[files.length - 1] ?? files[0]);
	if (!Number.isFinite(start) || !Number.isFinite(end)) {
		throw new Error("删除文件号异常");
	}
	const startIso = toIsoString(task.startTs ?? Date.now());
	if (!startIso) {
		throw new Error("删除任务开始时间无效");
	}
	const body = buildDeleteBody({ start, end }, startIso);
	await postTemplate(body, token);
	ElMessage.success("固存删除任务提交成功");
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
		await submitImagingTasks(token, satellite);
		if (satellite === "AS02") {
			await submitDataTransferTask(token);
			await submitDeleteTask(token);
		}
	} catch (err: any) {
		ElMessage.error(err?.message || String(err) || "提交失败");
	} finally {
		submitting.value = false;
	}
}
</script>

<style scoped>
.one-click-page {
	padding: 8px;
	display: flex;
	flex-direction: column;
	gap: 12px;
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
</style>
