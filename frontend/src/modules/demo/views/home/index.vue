<template>
	<el-scrollbar>
		<div class="home-dashboard">
			<task-metrics :metrics="taskMetrics" :loading="loading.tasks" />

			<el-row :gutter="12" class="dashboard-row">
				<!-- 最新任务记录：12 格 -->
				<el-col :span="8">
					<task-latest
					class="dash-card"
					:tasks="latestTasks"
					:loading="loading.tasks"
					@refresh="refreshTasks"
					/>
				</el-col>

				<!-- 载荷固存：6 格 -->
				<el-col :span="8">
					<storage-type-card
					class="dash-card"
					title="载荷固存状态"
					:summary="storageSummary?.payload ?? null"
					:loading="loading.storage"
					/>
				</el-col>

				<!-- 平台固存：6 格 -->
				<el-col :span="8">
					<storage-type-card
					class="dash-card"
					title="平台固存状态"
					:summary="storageSummary?.platform ?? null"
					:loading="loading.storage"
					/>
				</el-col>
				</el-row>


		</div>
	</el-scrollbar>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'home'
});

import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import { onMounted, reactive, ref } from 'vue';
import { useCool } from '/@/cool';

import TaskMetrics from './components/task-metrics.vue';
import StorageTypeCard from './components/storage-type-card.vue';
import TaskLatest from './components/task-latest.vue';

type TaskMetricsData = {
	total: number;
	weeklyTotal: number;
	weeklyAS02: number;
	weeklyAS03: number;
	pending: number;
	lastUpdated?: string;
};

type TaskOverview = {
	id: string | number;
	satellite: string;
	imagingTarget: string;
	status: number;
	statusLabel: string;
	imagingTime: string;
	transferName?: string;
};

type StorageDetail = { free: number; used: number; total: number; label: string };

type StorageSummary = {
	payload: Record<'AS02' | 'AS03', StorageDetail>;
	platform: Record<'AS02' | 'AS03', StorageDetail>;
};

const statusLabels: Record<number, string> = {
	0: '待处理',
	1: '处理中',
	2: '已完成',
	3: '失败'
};

const { service } = useCool();

const loading = reactive({
	tasks: false,
	storage: false
});

const taskMetrics = ref<TaskMetricsData | null>(null);
const latestTasks = ref<TaskOverview[]>([]);
const storageSummary = ref<StorageSummary | null>(null);

function extractList(res: any): any[] {
	if (!res) return [];
	if (Array.isArray(res.list)) return res.list;
	if (Array.isArray(res.data?.list)) return res.data.list;
	if (Array.isArray(res.data)) return res.data;
	return [];
}

function formatDate(value: any, fallback = '-'): string {
	if (!value) return fallback;
	const d = dayjs(value);
	return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : fallback;
}

function resolveTimestamp(value: any): number {
	const d = dayjs(value);
	return d.isValid() ? d.valueOf() : 0;
}

async function fetchTaskData() {
	loading.tasks = true;
	try {
		const svcAs02 = (service as any)?.task?.as02;
		const svcAs03 = (service as any)?.task?.as03;

		const [as02Res, as03Res] = await Promise.all([
			svcAs02?.page?.({ page: 1, size: 500 }) ?? Promise.resolve(null),
			svcAs03?.page?.({ page: 1, size: 500 }) ?? Promise.resolve(null)
		]);

		const as02 = extractList(as02Res).map((item: any) => ({ ...item, satelliteCode: item.satelliteCode ?? 'AS02', __satellite: 'AS02' }));
		const as03 = extractList(as03Res).map((item: any) => ({ ...item, satelliteCode: item.satelliteCode ?? 'AS03', __satellite: 'AS03' }));
		const all = [...as02, ...as03];

		const weekStart = dayjs().subtract(6, 'day').startOf('day');
		const withinLast7Days = (item: any) => {
			const timestamps = [
				resolveTimestamp(item.createTime),
				resolveTimestamp(item.updateTime),
				resolveTimestamp(item.imagingTime)
			].filter(Boolean);
			if (!timestamps.length) return false;
			return timestamps.some(ts => ts >= weekStart.valueOf());
		};

		const weeklyAS02 = as02.filter(withinLast7Days).length;
		const weeklyAS03 = as03.filter(withinLast7Days).length;
		const pending = all.filter(item => Number(item.status) === 0).length;

		const latest = [...all]
			.sort((a, b) => resolveTimestamp(b.createTime || b.updateTime) - resolveTimestamp(a.createTime || a.updateTime))
			.slice(0, 10)
			.map((item: any) => ({
				id: item.id ?? `${item.__satellite}-${item.createTime ?? ''}`,
				satellite: item.__satellite ?? item.satelliteCode ?? '-',
				imagingTarget: item.imagingTarget ?? item.targetName ?? '-',
				status: Number(item.status ?? -1),
				statusLabel: statusLabels[Number(item.status)] ?? '未知',
				imagingTime: formatDate(item.imagingTime ?? item.createTime),
				transferName: item.transferName ?? '--'
			}));

		const lastRecord = all.sort((a, b) => resolveTimestamp(b.updateTime || b.createTime) - resolveTimestamp(a.updateTime || a.createTime))[0];

		taskMetrics.value = {
			total: all.length,
			weeklyTotal: weeklyAS02 + weeklyAS03,
			weeklyAS02,
			weeklyAS03,
			pending,
			lastUpdated: lastRecord ? formatDate(lastRecord.updateTime ?? lastRecord.createTime) : undefined
		};
		latestTasks.value = latest;
	} catch (err) {
		console.error(err);
		ElMessage.error('任务数据加载失败');
		taskMetrics.value = null;
		latestTasks.value = [];
	} finally {
		loading.tasks = false;
	}
}

async function fetchStorageData() {
	loading.storage = true;
	try {
		const api = (service as any)?.star?.fixed_storage_table;
		if (!api?.page) {
			throw new Error('固存表接口不可用');
		}

		const tables = [
			{ name: 0, satellite: 'AS02' },
			{ name: 1, satellite: 'AS02' },
			{ name: 2, satellite: 'AS03' },
			{ name: 3, satellite: 'AS03' }
		];

		const responses = await Promise.all(
			tables.map(item =>
				api.page({ page: 1, size: 2000, name: item.name, sort: 'startFileNo', order: 'ASC' })
			)
		);

		const summary: StorageSummary = {
			payload: {
				AS02: { free: 0, used: 0, total: 0, label: 'AS02' },
				AS03: { free: 0, used: 0, total: 0, label: 'AS03' }
			},
			platform: {
				AS02: { free: 0, used: 0, total: 0, label: 'AS02' },
				AS03: { free: 0, used: 0, total: 0, label: 'AS03' }
			}
		};

		tables.forEach((item, index) => {
			const list = extractList(responses[index]);
			const free = list.filter((row: any) => Number(row.status) === 0).length;
			const total = list.length;
			const used = total - free;
			const bucket = item.name === 0 || item.name === 2 ? 'payload' : 'platform';
			const satellite = item.satellite as 'AS02' | 'AS03';
			summary[bucket][satellite].free += free;
			summary[bucket][satellite].used += used;
			summary[bucket][satellite].total += total;
		});

		storageSummary.value = summary;
	} catch (err) {
		console.error(err);
		ElMessage.error('固存数据加载失败');
		storageSummary.value = null;
	} finally {
		loading.storage = false;
	}
}

async function refreshTasks() {
	await fetchTaskData();
}

async function refreshAll() {
	await Promise.all([fetchTaskData(), fetchStorageData()]);
}

onMounted(() => {
	refreshAll();
});
</script>

<style lang="scss">
.home-dashboard {
	padding: 12px;
	min-height: 100%;
	box-sizing: border-box;
	background: var(--el-bg-color-page, var(--el-fill-color));
}

.dashboard-row {
  /* el-row 本身是 flex+wrap，三列合计=24 就不会换行 */
  > .el-col { display:flex; }
  > .el-col > * { flex:1; min-width:0; } /* 关键：允许内部收缩 */
}



.card {
	border-radius: 10px;
	margin-bottom: 12px;
	border: 1px solid var(--el-border-color-extra-light);
	background-color: var(--el-bg-color);
	color: var(--el-text-color-primary);
	user-select: none;
	box-shadow: var(--el-box-shadow-lighter);

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		min-height: 52px;

		span {
			font-size: 15px;
			font-weight: 600;
		}
	}
}

@media (max-width: 768px) {
	.home-dashboard {
		padding: 10px;
	}
}
</style>
