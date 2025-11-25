<template>
	<div class="one-click-page">
		<el-card shadow="never" class="mb16">
			<template #header>
				<div class="card-header">
					<span>一键规划模块</span>
					<el-space>
						<el-select v-model="form.satellite" style="width: 140px">
							<el-option label="AS02" value="AS02" />
							<el-option label="AS03" value="AS03" />
						</el-select>
						<el-button type="primary" :loading="loading" @click="runOneClickPlan">一键规划</el-button>
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

echarts.use([ScatterChart, TooltipComponent, GridComponent, DataZoomComponent, CanvasRenderer]);

const ONE_CLICK_PLAN_URL = "http://172.16.10.86:9030/image-forecast";
const TELECONTROL_SEARCH_URLS = [
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
];
const TELECONTROL_STATES = [1, 2, 6];

type TimelineItem = {
	id: string;
	name: string;
	type: "" | "success" | "warning" | "info" | "danger";
	time: string;
	meta: string;
	startTs: number;
	cloud?: number | null;
	priority?: number | null;
};

type TargetPayload = {
	name: string;
	long: number;
	lat: number;
	alt: number;
	imageTime: number;
	priority: number;
};

const form = ref({ satellite: "AS02" });
const { service } = useCool();
const loading = ref(false);
const timeline = ref<TimelineItem[]>([]);
const planRange = computed(() => buildRange());
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

function buildRange() {
	const now = new Date();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() + 1); // 次日 0 点
	const end = new Date(start);
	end.setDate(end.getDate() + 1); // 次次日
	end.setHours(13, 0, 0, 0); // 13:00
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

		// 先确定数传任务，预留时间，再选成像任务，保证与数传/成像之间 80min 间隔
		const dataTask =
			form.value.satellite === "AS02" ? await buildDataTransTask(token, planRange.value.start, planRange.value.end) : null;
		const reservedTimes = dataTask ? [dataTask.startTs] : [];
		const gapMs = 80 * 60 * 1000;

		const picked = pickTopTasks(cloudFiltered, imagingLimit, gapMs, reservedTimes);
		let items = picked.map((r, idx) => {
			const timeText = formatDisplay(new Date(r.startTs));
			const type = mapTaskType(r);
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
				cloud: r.cloud ?? null,
				priority: r.priority ?? null,
			};
		});
		if (dataTask) items = [...items, dataTask];
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

	const data = timeline.value.map((t, idx) => ({
		value: [t.startTs, idx % 2 === 0 ? 1 : -1],
		name: t.name,
		meta: t.meta,
		time: t.time,
		type: t.type,
		cloud: t.cloud,
		priority: t.priority,
	}));

	chart.setOption({
		grid: { left: 40, right: 20, top: 30, bottom: 40 },
		xAxis: {
			type: "time",
			min: startMs,
			max: endMs,
			axisLabel: { formatter: "{HH}:{mm}" },
			axisLine: { lineStyle: { color: "#c0c4cc" } },
			axisTick: { alignWithLabel: true },
		},
		yAxis: { show: false, min: -2, max: 2 },
		tooltip: {
			trigger: "item",
			borderRadius: 8,
			backgroundColor: "#fff",
			textStyle: { color: "#303133" },
			formatter: (p: any) => {
				const d = p.data;
				return `
					<div style="min-width:180px;">
						<div style="font-weight:600;margin-bottom:4px;">${d.name}</div>
						<div>${d.time}</div>
						<div style="color:#606266;">${d.meta}</div>
					</div>
				`;
			},
		},
		series: [
			{
				type: "scatter",
				symbolSize: 14,
				itemStyle: {
					color: (p: any) => (String(p.data?.type || "").toLowerCase().includes("data") ? "#f78fb3" : "#409EFF"),
				},
				data,
			},
		],
	});
}

async function buildDataTransTask(token: string, start: Date, end: Date): Promise<TimelineItem | null> {
	try {
		const dateStr = formatDateYMD(start);
		const records = await fetchTelecontrolRecords(token, dateStr, "12");
		if (!records?.length) return null;
		const thresholdUtc = new Date(`${dateStr}T17:00:00+08:00`).getTime(); // 北京 17:00 对应的 UTC
		console.log("[one-click-plan] telecontrol date", dateStr, "thresholdUtc", thresholdUtc, "records", records);
		const sorted = [...records].sort((a, b) => (a.beginTime ?? 0) - (b.beginTime ?? 0));
		const afterEvening = sorted.filter((r) => (r.beginTime ?? 0) >= thresholdUtc);
		const pass = afterEvening[0];
		console.log("[one-click-plan] chosen data pass", pass);
		if (!pass || !pass.beginTime) return null;
		const slotBegin = Number(pass.beginTime);
		const startTs = slotBegin + 60 * 1000; // +1min
		console.log("[one-click-plan] dataTrans use outer beginTime", slotBegin, "startTs(+1m)", startTs);
		if (startTs < start.getTime() || startTs > end.getTime()) return null;

		const files = await fetchPendingFiles("AS02");
		const filesText = files.length ? `Files: ${files.join(", ")}` : "Files: -";
		return {
			id: `data-${startTs}`,
			name: "数传任务",
			type: "data",
			time: formatDisplay(new Date(startTs)),
			meta: `Antenna: ${pass.antennaId ?? "-"} | ${filesText}`,
			startTs,
			cloud: null,
			priority: null,
		};
	} catch (e) {
		console.warn("[one-click-plan] buildDataTransTask failed", e);
		return null;
	}
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
	if (name.includes("数传")) return "success";
	if (name.includes("固存") || name.includes("删除")) return "warning";
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

function pickTopTasks(list: any[], limit: number, gapMs: number) {
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

	function dfs(idx: number, current: any[], lastTs: number) {
		if (current.length > best.length || (current.length === best.length && score(current) < score(best))) {
			best = [...current];
		}
		if (current.length === limit || idx >= n) return;
		if (current.length + (n - idx) < best.length) return;

		const cand = sorted[idx];
		const ts = Number(cand.startTs ?? 0);
		if (Number.isFinite(ts) && (lastTs < 0 || ts - lastTs >= gapMs)) {
			current.push(cand);
			dfs(idx + 1, current, ts);
			current.pop();
		}
		dfs(idx + 1, current, lastTs);
	}

	dfs(0, [], -Infinity);
	return best.slice(0, limit);
}

async function getToken(): Promise<string> {
	const resp = await fetch("http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token", {
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
	dataTrans: any;
	beginTime?: number;
	endTime?: number;
	antennaId?: string;
};

async function fetchTelecontrolRecords(token: string, date: string, spacecraftId: string): Promise<TelecontrolRecord[]> {
	const { begin, end } = buildUtcRange(date);
	console.log("[one-click-plan] telecontrol range", { date, begin, end });
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
	const base = new Date(`${date}T00:00:00`).getTime() ;
	console.log(base);
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
