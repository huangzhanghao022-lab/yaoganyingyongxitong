<template>
	<div class="card storage-card">
		<div class="card__header">
			<div class="title">
				<el-icon><pie-chart /></el-icon>
				<span>{{ title }}</span>
			</div>
			<el-radio-group v-model="activeSatellite" size="small" :disabled="loading || !summary">
				<el-radio-button label="AS02">AS02</el-radio-button>
				<el-radio-button label="AS03">AS03</el-radio-button>
			</el-radio-group>
		</div>

		<el-skeleton :loading="loading" animated>
			<template #template>
				<div class="skeleton-chart" />
			</template>
			<template #default>
				<div v-if="chartTotal > 0" class="content">
					<div class="chart">
						<v-chart :option="chartOption" autoresize />
					</div>
					<div class="stats">
						<div class="stat">
							<div class="label">总容量</div>
							<div class="value">{{ chartData.total }}</div>
							<div class="hint">总存储量</div>
						</div>
						<div class="stat">
							<div class="label">剩余空间</div>
							<div class="value success">{{ chartData.free }}</div>
							<div class="hint">状态为“空”的数量</div>
						</div>
						<div class="stat">
							<div class="label">已占用</div>
							<div class="value danger">{{ chartData.used }}</div>
							<div class="hint">除“空”外的记录数</div>
						</div>
					</div>
				</div>
				<el-empty v-else description="暂无固存数据" />
			</template>
		</el-skeleton>
	</div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue';
import { computed, reactive, ref, watch } from 'vue';
import { PieChart } from '@element-plus/icons-vue';

type StorageDetail = {
	free: number;
	used: number;
	total: number;
	label: string;
};

const props = defineProps({
	title: {
		type: String,
		default: ''
	},
	summary: {
		type: Object as PropType<Record<'AS02' | 'AS03', StorageDetail> | null>,
		default: null
	},
	loading: {
		type: Boolean,
		default: false
	}
});

const activeSatellite = ref<'AS02' | 'AS03'>('AS02');

const chartOption = reactive({
	tooltip: {
		trigger: 'item',
		formatter: '{b}<br/>数量：{c} ({d}%)'
	},
	legend: {
		orient: 'vertical',
		left: 'left'
	},
	series: [
		{
			name: '固存空间',
			type: 'pie',
			radius: ['50%', '70%'],
			avoidLabelOverlap: false,
			itemStyle: {
				borderRadius: 10,
				borderColor: '#fff',
				borderWidth: 2
			},
			label: {
				show: false,
				position: 'center'
			},
			emphasis: {
				label: {
					show: true,
					fontSize: 18,
					fontWeight: 'bold'
				}
			},
			labelLine: {
				show: false
			},
			data: [] as { value: number; name: string }[]
		}
	]
});

const chartData = computed(() => {
	const detail = props.summary?.[activeSatellite.value];
	if (!detail) return { free: 0, used: 0, total: 0, label: '' };
	return detail;
});

const chartTotal = computed(() => chartData.value.total);

watch(
	() => [props.summary, activeSatellite.value],
	() => {
		if (!props.summary) {
			chartOption.series[0].data = [];
			return;
		}
		const detail = props.summary[activeSatellite.value];
		chartOption.series[0].data = [
			{ value: detail.free, name: '剩余空间' },
			{ value: detail.used, name: '已占用' }
		];
	},
	{ immediate: true, deep: true }
);
</script>

<style scoped>
.storage-card {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.storage-card .title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
	font-size: 16px;
}

.skeleton-chart {
	height: 240px;
	border-radius: 12px;
	background: var(--el-fill-color-light);
	margin: 0 12px 12px;
}

.content {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 0 12px 12px;
	height: 100%;
	box-sizing: border-box;
}

.chart {
	flex: 1;
	min-height: 180px;
}

.chart :deep(.echarts) {
	width: 100%;
	height: 200px;
}

.stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 8px;
}

.stat {
	background: var(--el-bg-color-overlay, var(--el-bg-color));
	border-radius: 10px;
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 2px;
	box-shadow: var(--el-box-shadow-lighter);
}

.stat .label {
	font-size: 12px;
	color: var(--el-text-color-secondary);
}

.stat .value {
	font-size: 18px;
	font-weight: 600;
}

.stat .value.success {
	color: var(--el-color-success);
}

.stat .value.danger {
	color: var(--el-color-danger);
}

.stat .hint {
	font-size: 12px;
	color: var(--el-text-color-placeholder);
	line-height: 1.4;
}

@media (max-width: 900px) {
	.content {
		padding: 0 10px 10px;
	}

	.stats {
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	}
}
</style>
