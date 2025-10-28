<template>
	<div class="card latest-card">
		<div class="card__header">
			<div class="title">
				<el-icon><Document /></el-icon>
				<span>最新任务记录</span>
			</div>
			<el-button link size="small" @click="$emit('refresh')" :loading="loading">
				<el-icon><Refresh /></el-icon>
				刷新
			</el-button>
		</div>

		<el-table
			:data="tasks"
			height="360"
			border
			size="small"
			empty-text="暂无任务数据"
			:header-cell-class-name="'table-header'"
			:row-class-name="'table-row'"
			v-loading="loading"
		>
			<el-table-column prop="satellite" label="卫星" width="80" />
			<el-table-column prop="imagingTarget" label="成像目标" min-width="80" show-overflow-tooltip />
			<el-table-column prop="imagingTime" label="成像时间" min-width="100" show-overflow-tooltip />
			<el-table-column prop="transferName" label="数传站" min-width="80" show-overflow-tooltip />
		</el-table>
	</div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue';
import { Document, Refresh } from '@element-plus/icons-vue';

type TaskItem = {
	id: string | number;
	satellite: string;
	imagingTarget: string;
	status: number;
	statusLabel: string;
	imagingTime: string;
	transferName?: string;
};

const props = defineProps({
	tasks: {
		type: Array as PropType<TaskItem[]>,
		default: () => []
	},
	loading: {
		type: Boolean,
		default: false
	}
});

function statusTag(status: number) {
	switch (status) {
		case 0:
			return 'warning';
		case 1:
			return 'info';
		case 2:
			return 'success';
		case 3:
			return 'danger';
		default:
			return 'info';
	}
}
</script>

<style scoped>
.latest-card {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.latest-card .title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
	font-size: 16px;
}

.latest-card :deep(.el-table) {
	--el-table-border-color: var(--el-border-color-light);
}

.latest-card :deep(.el-table__empty-block) {
	min-height: 260px;
}

.table-header {
	background-color: var(--el-fill-color-light);
}

.table-row:hover > td {
	background-color: var(--el-fill-color-lighter);
}
</style>
