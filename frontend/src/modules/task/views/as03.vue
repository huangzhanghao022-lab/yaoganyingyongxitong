<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />

		<el-dialog
			v-model="detailDialog.visible"
			:title="t('详情')"
			width="640px"
			:close-on-click-modal="false"
			:destroy-on-close="true"
		>
			<div v-loading="detailDialog.loading">
				<el-descriptions border :column="2" size="small">
					<el-descriptions-item :label="t('卫星代号')">{{ detailDialog.data?.satelliteCode ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('成像目标点')">{{ detailDialog.data?.imagingTarget ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('经度')">{{ detailDialog.data?.longitude ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('纬度')">{{ detailDialog.data?.latitude ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('云量')">{{ detailDialog.data?.cloudCoverage ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('太阳高度角')">{{ detailDialog.data?.sunElevation ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('成像时间')">{{ detailDialog.data?.imagingTime ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('数传站')">{{ detailDialog.data?.transferName ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('成像UID')">{{ detailDialog.data?.imagingUID ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('数传时间')">{{ detailDialog.data?.transferTime ?? '-' }}</el-descriptions-item>
					<el-descriptions-item :label="t('状态')">{{ getStatusLabel(detailDialog.data?.status) }}</el-descriptions-item>
					<el-descriptions-item :label="t('数传UID')">
						<template #default>
							<div v-if="detailTransferUidList.length" class="uid-flex-column">
								<el-tag v-for="uid in detailTransferUidList" :key="uid" size="small" class="uid-tag">
									{{ uid }}
								</el-tag>
							</div>
							<span v-else>-</span>
						</template>
					</el-descriptions-item>
					<el-descriptions-item :label="t('星历信息')" :span="2">
						<template #default>
							<div v-if="detailOrbitRows.length" class="orbit-list">
								<div v-for="item in detailOrbitRows" :key="item.label" class="orbit-row">
									<span class="orbit-label">{{ item.label }}：</span>
									<span class="orbit-value">{{ item.value }}</span>
								</div>
							</div>
							<span v-else>-</span>
						</template>
					</el-descriptions-item>
					<el-descriptions-item :label="t('缩略图')">
						<el-link
							v-if="detailDialog.data?.thumbnailUrl"
							:href="detailDialog.data.thumbnailUrl"
							target="_blank"
							type="primary"
						>
							{{ detailDialog.data.thumbnailUrl }}
						</el-link>
						<span v-else>-</span>
					</el-descriptions-item>
				</el-descriptions>
			</div>
			<template #footer>
				<el-button @click="detailDialog.visible = false">{{ t('关闭') }}</el-button>
			</template>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'task-as03',
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { computed, reactive, watch } from 'vue';

const { service } = useCool();
const { t } = useI18n();

const options = reactive({
	status: [
		{ label: t('待处理'), value: 0 },
		{ label: t('处理中'), value: 1 },
		{ label: t('已完成'), value: 2 },
		{ label: t('失败'), value: 3 },
	],
});

const ORBIT_LABELS = [
	'历元 (UTC)',
	'半长轴 a (米)',
	'离心率 e',
	'轨道倾角 i (°)',
	'升交点赤经 Ω (°)',
	'近地点幅角 ω (°)',
	'平近点角 M (°)',
	'阻力系数 CD',
];

const statusLabelMap = computed<Record<number, string>>(() => {
	const map: Record<number, string> = {};
	options.status.forEach(item => {
		map[item.value as number] = item.label;
	});
	return map;
});

const Upsert = useUpsert({
	items: [
		{
			label: t('卫星代号'),
			prop: 'satelliteCode',
			component: { name: 'el-input', props: { clearable: true, disabled: true } },
			value: 'AS03',
			span: 12,
			required: false,
		},
		{
			label: t('成像目标点'),
			prop: 'imagingTarget',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: false,
		},
		{
			label: t('经度'),
			prop: 'longitude',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: -180, max: 180, step: 0.01, precision: 2 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('纬度'),
			prop: 'latitude',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: -90, max: 90, step: 0.01, precision: 2 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('云量'),
			prop: 'cloudCoverage',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: 0, max: 100, step: 0.1, precision: 1 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('太阳高度角'),
			prop: 'sunElevation',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: -90, max: 90, step: 0.1, precision: 1 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('星历时间'),
			prop: 'ephemerisTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
			},
			span: 12,
			required: false,
		},
		{
			label: t('成像时间'),
			prop: 'imagingTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
			},
			span: 12,
			required: false,
		},
		{
			label: t('数传站'),
			prop: 'transferName',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: false,
		},
		{
			label: t('数传时间'),
			prop: 'transferTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
			},
			span: 12,
			required: false,
		},
		{
			label: t('成像UID'),
			prop: 'imagingUID',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: false,
		},
		{
			label: t('数传UID'),
			prop: 'transferUID',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					clearable: true,
					autosize: { minRows: 2, maxRows: 6 },
					placeholder: t('可输入多个 UID，使用逗号、空格或换行分隔'),
				},
			},
			span: 12,
			required: false,
		},
		{
			label: t('状态'),
			prop: 'status',
			component: { name: 'el-radio-group', options: options.status },
			value: 0,
			required: true,
		},
		{
			label: t('星历信息'),
			prop: 'orbitElements',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					readonly: true,
					autosize: { minRows: 6, maxRows: 12 },
				},
			},
			span: 24,
			required: false,
		},
		{
			label: t('成像缩略图地址链接'),
			prop: 'thumbnailUrl',
			component: { name: 'cl-upload' },
		},

	],
});

const Table = useTable({
	columns: [
		{ type: 'selection' },
		{ label: t('卫星代号'), prop: 'satelliteCode', minWidth: 140 },
		{ label: t('成像目标点'), prop: 'imagingTarget', minWidth: 140 },
		{ label: t('经度'), prop: 'longitude', minWidth: 110 },
		{ label: t('纬度'), prop: 'latitude', minWidth: 110 },
		{
			label: t('成像时间'),
			prop: 'imagingTime',
			minWidth: 170,
			sortable: 'custom',
			component: { name: 'cl-date-text' },
		},
		{
			label: t('数传站'),
			prop: 'transferName',
			minWidth: 140,
		},
		{
			label: t('数传时间'),
			prop: 'transferTime',
			minWidth: 170,
			component: { name: 'cl-date-text' },
		},
		{
			label: t('状态'),
			prop: 'status',
			minWidth: 120,
			dict: options.status,
		},
		{
			type: 'op',
			buttons: [
				{
					label: t('详情'),
					props: { type: 'primary', text: true, size: 'medium' },
					onClick(ctx: { scope?: { row?: Record<string, any> } }) {
						const row = ctx?.scope?.row ?? {};
						openDetail(row);
					},
				},
				'edit',
				'delete',
			],
		},
	],
});

const Search = useSearch({
	items: [
		{
			label: t('成像目标点'),
			prop: 'imagingTarget',
			component: { name: 'el-input', props: { clearable: true, placeholder: t('支持模糊匹配') } },
		},
		{
			label: t('数传站'),
			prop: 'transferName',
			component: { name: 'el-input', props: { clearable: true } },
		},
		{
			label: t('成像UID'),
			prop: 'imagingUID',
			component: { name: 'el-input', props: { clearable: true } },
		},
		{
			label: t('数传UID'),
			prop: 'transferUID',
			component: { name: 'el-input', props: { clearable: true, placeholder: t('支持部分匹配') } },
		},
		{
			label: t('状态'),
			prop: 'status',
			component: { name: 'el-select', options: options.status, props: { clearable: true } },
		},
	],
});

const Crud = useCrud(
	{
		service: service.task.as03,
	},
	app => {
		app.refresh();
	},
);

const detailDialog = reactive({
	visible: false,
	loading: false,
	data: {} as Record<string, any>,
});

const detailTransferUidList = computed(() => splitTransferUid(detailDialog.data?.transferUID));
const detailOrbitRows = computed(() => parseOrbitElements(detailDialog.data?.orbitElements));

watch(
	() => Upsert.value?.form?.orbitElements,
	raw => {
		if (!Upsert.value || raw == null) return;
		const formatted = formatOrbitElementsForForm(raw);
		if (formatted !== raw) {
			Upsert.value?.setForm('orbitElements', formatted);
		}
	},
);

async function openDetail(row: Record<string, any>) {
	try {
		detailDialog.visible = true;
		detailDialog.loading = true;
		const api = service.task.as03?.info;
		if (typeof api === 'function') {
			const res = await api({ id: row.id });
			detailDialog.data = res?.data?.data ?? res?.data ?? res ?? row;
		} else {
			detailDialog.data = row;
		}
	} catch {
		detailDialog.data = row;
	} finally {
		detailDialog.loading = false;
	}
}

function getStatusLabel(value: unknown): string {
	const num = Number(value);
	if (Number.isFinite(num)) {
		return statusLabelMap.value[num] ?? '-';
	}
	return '-';
}

function splitTransferUid(value: unknown): string[] {
	if (value == null) return [];
	const raw = String(value);
	return raw
		.split(/[\s,，；;]+/)
		.map(item => item.trim())
		.filter(Boolean);
}

function parseOrbitElements(value: unknown): Array<{ label: string; value: string }> {
	if (value == null) return [];
	let data: Record<string, any> | null = null;
	if (typeof value === 'string' && value.trim()) {
		try {
			data = JSON.parse(value);
		} catch {
			data = null;
		}
	} else if (typeof value === 'object' && value !== null) {
		data = value as Record<string, any>;
	}
	if (!data) return [];
	const rows: Array<{ label: string; value: string }> = [];
	for (const label of ORBIT_LABELS) {
		const raw = data[label];
		if (raw == null || raw === '') continue;
		rows.push({ label, value: String(raw) });
	}
	if (!rows.length) {
		Object.entries(data).forEach(([label, raw]) => {
			if (raw == null || raw === '') return;
			rows.push({ label, value: String(raw) });
		});
	}
	return rows;
}

function formatOrbitElementsForForm(value: unknown): string {
	if (value == null || value === '') return '';
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return '';
		try {
			const parsed = JSON.parse(trimmed);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return trimmed;
		}
	}
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return '';
		}
	}
	return String(value);
}
</script>

<style scoped>
.uid-flex-column {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.uid-tag {
	align-self: flex-start;
}

.orbit-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.orbit-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.orbit-label {
	color: var(--el-text-color-regular);
}

.orbit-value {
	color: var(--el-text-color-primary);
}
</style>
