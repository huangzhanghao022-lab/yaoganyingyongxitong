<template>
	<div class="card metrics-card">
		<div class="card__header">
			<div class="title">
				<el-icon><Calendar /></el-icon>
				<span>任务概览</span>
			</div>
			<el-tag v-if="metrics?.lastUpdated" size="small" type="info">
				更新于 {{ metrics.lastUpdated }}
			</el-tag>
		</div>

		<el-skeleton :loading="loading" animated>
			<template #template>
				<div class="skeleton-row">
					<div v-for="n in 4" :key="n" class="skeleton-item" />
				</div>
			</template>
			<template #default>
				<el-row :gutter="12">
					<el-col v-for="item in items" :key="item.label" :lg="6" :md="12" :sm="12" :xs="24">
						<div class="metric-box">
							<div class="metric-label">{{ item.label }}</div>
							<div class="metric-value">{{ item.value }}</div>
							<div v-if="item.description" class="metric-desc">{{ item.description }}</div>
						</div>
					</el-col>
				</el-row>
			</template>
		</el-skeleton>
	</div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue';
import { computed } from 'vue';
import { Calendar } from '@element-plus/icons-vue';

type Metrics = {
	total: number;
	weeklyTotal: number;
	weeklyAS02: number;
	weeklyAS03: number;
	pending: number;
	lastUpdated?: string;
};

const props = defineProps({
	metrics: {
		type: Object as PropType<Metrics | null>,
		default: null
	},
	loading: {
		type: Boolean,
		default: false
	}
});

const items = computed(() => [
	{
		label: '本周新增任务',
		value: props.metrics?.weeklyTotal ?? '-',
		description: `AS02: ${props.metrics?.weeklyAS02 ?? 0} | AS03: ${props.metrics?.weeklyAS03 ?? 0}`
	},
	{
		label: '待处理任务',
		value: props.metrics?.pending ?? '-',
		description: '状态为“待处理”的任务数量'
	},
	{
		label: '累计任务总数',
		value: props.metrics?.total ?? '-',
		description: '任务记录总量（AS02 + AS03）'
	},
	{
		label: '最近更新时间',
		value: props.metrics?.lastUpdated ?? '-',
		description: '来自任务数据的最近记录时间'
	}
]);
</script>

<style scoped>
.metrics-card {
	margin-bottom: 16px;

	& .title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 16px;
	}
}

.skeleton-row {
	display: grid;
	grid-template-columns: repeat(4, minmax(160px, 1fr));
	gap: 12px;
	padding: 0 20px 16px;
}

.skeleton-item {
	height: 86px;
	border-radius: 10px;
	background-color: var(--el-fill-color-light);
}

.metric-box {
	border-radius: 10px;
	padding: 18px 20px;
	background-color: var(--el-bg-color-overlay, var(--el-bg-color));
	box-shadow: var(--el-box-shadow-lighter);
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-height: 110px;
}

.metric-label {
	font-size: 14px;
	color: var(--el-text-color-secondary);
}

.metric-value {
	font-size: 28px;
	font-weight: 600;
	color: var(--el-text-color-primary);
}

.metric-desc {
	font-size: 12px;
	color: var(--el-text-color-placeholder);
}

@media screen and (max-width: 1024px) {
	.skeleton-row {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media screen and (max-width: 768px) {
	.skeleton-row {
		grid-template-columns: repeat(1, 1fr);
	}
}
</style>

