<template>
	<div style="height: 100%">
		<cl-crud ref="Crud">
			<cl-row>
				<!-- 刷新按钮 -->
				<cl-refresh-btn />
				<!-- 新增按钮 -->
				<cl-add-btn />
				<!-- 删除按钮 -->
				<cl-multi-delete-btn />
				<cl-flex1 />
				<!-- 条件搜索 -->
				<cl-search ref="Search" />
			</cl-row>

			<cl-row>
				<!-- 数据表格 -->
				<cl-table ref="Table">
					<!-- 展开信息 -->
					<template #column-detail="{ scope }">
						<div style="padding: 10px" v-if="scope.row.executionStatus < 6">
							<el-timeline style="max-width: 600px">
								<el-timeline-item
									:type="getStatusColor(scope.row.executionStatus, 1)"
									>提交需求</el-timeline-item
								>
								<el-timeline-item
									:type="getStatusColor(scope.row.executionStatus, 2)"
									>接收需求</el-timeline-item
								>
								<el-timeline-item
									:type="getStatusColor(scope.row.executionStatus, 3)"
									>任务执行中
									<span
										style="color: #909399"
										v-show="scope.row.plannedImagingTime"
									>
										计划成像时间
										{{ scope.row.plannedImagingTime }}</span
									>
								</el-timeline-item>
								<el-timeline-item
									:type="getStatusColor(scope.row.executionStatus, 4)"
									>数据下传
									<span
										style="color: #909399"
										v-show="scope.row.estimatedCompletionTime"
									>
										计划下传时间
										{{ scope.row.plannedDataTransmissionTime }}</span
									>
								</el-timeline-item>
								<el-timeline-item
									:type="getStatusColor(scope.row.executionStatus, 5)"
									>解析完成
									<span
										style="color: #909399"
										v-show="scope.row.estimatedCompletionTime"
									>
										预计完成时间
										{{ scope.row.estimatedCompletionTime }}</span
									>
								</el-timeline-item>
							</el-timeline>
						</div>
					</template>
				</cl-table>
			</cl-row>

			<cl-row>
				<cl-flex1 />
				<!-- 分页控件 -->
				<cl-pagination />
			</cl-row>
			<!-- 新增、编辑 -->
			<cl-upsert ref="Upsert">
				<!-- 展开信息 -->
				<template #slot-imagingMode="{ scope }">
					<cl-select
						v-if="scope.satelliteCode == 'AS02'"
						v-model="scope.imagingMode"
						:options="options['AS02_IMAGE_MODE']"
					/>
					<cl-select
						v-else-if="scope.satelliteCode == 'AS03'"
						v-model="scope.imagingMode"
						:options="options['AS03_IMAGE_MODE']"
					/>
					<span v-else>请先选择一个成像卫星</span>
				</template>
				<template #slot-poiName="{ scope }">
					<el-row :gutter="5">
						<el-col :span="12"
							><el-input
								v-model="scope.poiName"
								placeholder="请输入成像点名称"
							></el-input
						></el-col>
						<el-col :span="12">
							<el-button link type="primary" @click="poiPanelVisible = true"
								>从目标库选择</el-button
							>
							<el-button link type="primary" @click="mapPanelVisible = true"
								>从地图选择</el-button
							>
						</el-col>
					</el-row>
				</template>
			</cl-upsert>
		</cl-crud>
		<el-drawer v-model="poiPanelVisible" size="800" direction="rtl">
			<template #header>
				<h4>从目标库选择</h4>
			</template>
			<template #default>
				<poimap ref="poiMap" @selectedRow="selectedPoi"></poimap>
			</template>
			<template #footer>
				<div style="flex: auto">
					<el-button type="primary" style="width: 100%" @click="poiPanelVisible = false">
						确定
					</el-button>
				</div>
			</template>
		</el-drawer>
		<el-drawer v-model="mapPanelVisible" size="800" direction="rtl" @opened="initMap">
			<template #header>
				<h4>点击地图选择成像位置</h4>
			</template>
			<template #default>
				<rsmap
					ref="mapRef"
					style="height: 800px"
					:center="mapCenter"
					:point="poiPoint"
					:allow-edit="allowMapEdit"
					:zoom="mapZoom"
					@cliecked="selectLonlat"
				></rsmap>
			</template>
			<template #footer>
				<div style="flex: auto">
					<el-button type="primary" style="width: 100%" @click="mapPanelVisible = false"
						>确定</el-button
					>
				</div>
			</template>
		</el-drawer>
	</div>
</template>

<script lang="tsx" setup>
defineOptions({
	name: 'rs-image-request'
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { reactive, ref, useTemplateRef } from 'vue';
import { ElMessageBox } from 'element-plus';
import poimap from '../../rs_poi/views/poi-widgets.vue';
import rsmap from '../../rs_commom/map.vue';
import dayjs from 'dayjs';

import random from 'string-random';

const mapCenter = reactive([104.40365310824745, 38.50792415184924]);
const mapZoom = ref(5);
const poiPoint = reactive<number[]>([]);
const allowMapEdit = ref<boolean>(true);
type Map = InstanceType<typeof rsmap>;
const mapRef = useTemplateRef<Map>('mapRef');

const { service, refs, setRefs } = useCool();
const poiPanelVisible = ref(false);
const mapPanelVisible = ref(false);
// 目标点选择框
const poiDialogVisible = ref(false);
function selectPoi() {
	poiDialogVisible.value = !poiDialogVisible.value;
}

// 选项
const options = reactive({
	satellies: [
		{ label: '灵知02(AS02光学)', value: 'AS02' },
		{ label: '灵知03(AS03红外)', value: 'AS03' }
	],
	AS02_IMAGE_MODE: [
		{ label: '直通推扫成像', value: 0, color: 'green' },
		{ label: '压缩推扫成像', value: 1, color: 'orange' }
	],
	AS03_IMAGE_MODE: [
		{ label: '单条带推帧成像', value: 0, color: 'green' },
		{ label: '凝视成像', value: 1, color: 'orange' }
	],
	executionStatus: [
		{ label: '已创建', value: 0, color: '#CCCCCC' },
		{ label: '已提交', value: 1, color: '#3366CC' },
		{ label: '已接收', value: 2, color: 'orange' },
		{ label: '执行中', value: 3, color: 'orange' },
		{ label: '解析中', value: 4, color: 'orange' },
		{ label: '已完成', value: 5, color: 'green' },
		{ label: '已取消', value: 6, color: 'red' },
		{ label: '已终止', value: 7, color: 'red' }
	],

	taskPriority: [
		{ label: '低', value: 0, color: 'green' },
		{ label: '中', value: 1, color: '#4165d7' },
		{ label: '高', value: 2, color: '#FF9900' },
		{ label: '热点', value: 3, color: 'red' }
	]
});

// cl-upsert
const Upsert = useUpsert<Eps.RsImageRequestEntity>({
	items: [
		{
			hidden: true
		},
		{
			label: '需求编号',
			prop: 'requestNo',
			component: { name: 'el-input' }
		},
		{
			label: '卫星代号',
			prop: 'satelliteCode',
			component: { name: 'cl-select', props: { options: options.satellies } },
			span: 12,
			required: true
		},
		{
			label: '成像模式',
			prop: 'imagingMode',
			component: {
				name: 'slot-imagingMode'
			},
			span: 12,
			required: true
		},
		{
			label: '成像点名称',
			prop: 'poiName',
			component: {
				name: 'slot-poiName'
			},
			required: true
		},
		{
			label: '经度',
			prop: 'longitude',
			hook: 'number',
			component: { name: 'el-input-number', props: { min: 0 } },
			span: 12,
			required: true
		},
		{
			label: '纬度',
			prop: 'latitude',
			hook: 'number',
			component: { name: 'el-input-number', props: { min: 0 } },
			span: 12,
			required: true
		},
		{
			label: '任务优先级',
			prop: 'taskPriority',
			component: {
				name: 'el-radio-group',
				options: options.taskPriority
			},
			value: 0,
			required: true
		},
		{
			label: '任务截止时间',
			prop: 'taskDeadlineTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', 'value-format': 'x' }
			},
			span: 12,
			required: true
		},
		{
			label: '备注',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4 }
			}
		},
		{
			component: {
				name: 'cl-form-card',
				props: {
					label: '成像参数',
					expand: false
				}
			},
			children: [
				{
					label: '成像时长(秒)',
					prop: 'imagingDuration',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 24,
					required: true
				},
				{
					label: '最小侧摆角',
					prop: 'minSidelobeAngle',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 12
				},
				{
					label: '最大侧摆角',
					prop: 'maxSidelobeAngle',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 12
				},
				{
					label: '最小太阳高度角',
					prop: 'minSunElevationAngle',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 12
				},
				{
					label: '最大太阳高度角',
					prop: 'maxSunElevationAngle',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 12
				},
				{
					label: '最大云量(%)',
					prop: 'maxCloudCover',
					hook: 'number',
					component: { name: 'el-input-number', props: { min: 0 } },
					span: 12
				}
			]
		}
	],
	onOpen() {
		Upsert.value?.hideItem('requestNo');
		if (Upsert.value?.mode == 'add') {
			Upsert.value?.setForm('taskPriority', 0);
			Upsert.value?.setForm('imagingDuration', 10);
			Upsert.value?.setForm('minSidelobeAngle', 0);
			Upsert.value?.setForm('maxSidelobeAngle', 30);
			Upsert.value?.setForm('minSunElevationAngle', 0);
			Upsert.value?.setForm('maxSunElevationAngle', 90);
			Upsert.value?.setForm('maxCloudCover', 10);
			const date = new Date();
			date.setDate(date.getDate() + 7);
			Upsert.value?.setForm('taskDeadlineTime', new Date().getTime() + 3600 * 24 * 1000 * 7);
		} else if (Upsert.value?.mode == 'update') {
		} else if (Upsert.value?.mode == 'info') {
			Upsert.value?.showItem('requestNo');
		}
	},
	onOpened(data) {
		if (Upsert.value?.mode == 'update') {
			Upsert.value?.setForm('taskDeadlineTime', Number(data.taskDeadlineTime));
		}
	},
	onSubmit(data, { done, close, next }) {
		if (Upsert.value?.mode == 'add') {
			data.requestNo =
				'R-' +
				dayjs().format('YYYYMMDD') +
				'-' +
				random(6, { specials: false, numbers: false }).toUpperCase();
		}
		next(data);
		done();
		close();
	}
});

function selectLonlat(e) {
	Upsert.value?.setForm('latitude', e.lonLat[1]);
	Upsert.value?.setForm('longitude', e.lonLat[0]);
}

function selectedPoi(poi) {
	Upsert.value?.setForm('poiId', poi.id);
	Upsert.value?.setForm('poiName', poi.name);
	Upsert.value?.setForm('longitude', Number(poi.longitude));
	Upsert.value?.setForm('latitude', Number(poi.latitude));
}

// cl-table
const Table = useTable({
	columns: [
		{ type: 'selection' },
		// 展开列
		{
			label: '展开',
			type: 'expand',
			prop: 'detail',
			width: 60
		},
		{ label: '需求编号', prop: 'requestNo', minWidth: 180 },
		{ label: '卫星代号', prop: 'satelliteCode', minWidth: 140 },
		{
			label: '成像模式',
			prop: 'imagingMode',
			minWidth: 120,
			formatter(row) {
				const dictKey = row.satelliteCode == 'AS02' ? 'AS02_IMAGE_MODE' : 'AS03_IMAGE_MODE';
				const val = options[dictKey].find(item => {
					return item.value == row.imagingMode;
				});
				return val?.label;
			}
		},
		{
			label: '成像时长(秒)',
			prop: 'imagingDuration',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '执行状态',
			prop: 'executionStatus',
			dictColor: true,
			minWidth: 120,
			dict: options.executionStatus
		},
		{
			label: '经度',
			prop: 'longitude',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '纬度',
			prop: 'latitude',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '任务优先级',
			prop: 'taskPriority',
			minWidth: 120,
			dict: options.taskPriority,
			dictColor: true
		},
		{
			label: '任务截止时间',
			prop: 'taskDeadlineTime',
			minWidth: 170,
			sortable: 'custom',
			formatter(row) {
				return dayjs(new Date(Number(row.taskDeadlineTime))).format('YYYY-MM-DD HH:mm:ss');
			}
		},
		{
			label: '备注',
			prop: 'remark',
			showOverflowTooltip: true,
			minWidth: 200
		},
		{
			label: '反馈',
			prop: 'feedback',
			showOverflowTooltip: true,
			minWidth: 200
		},
		{
			label: '创建时间',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc',
			component: { name: 'cl-date-text' }
		},
		{
			type: 'op',
			width: 230,
			buttons({ scope }) {
				let btns: any[] = [];
				if (scope.row.executionStatus == 0) {
					btns = [
						'edit',
						'delete',
						{
							type: 'success',
							label: '提交',
							onClick() {
								const data = scope.row;
								data.executionStatus = 1;
								service.rs_image_request.imageRequest.update(data).then(() => {
									refresh();
								});
							}
						}
					];
				} else if (scope.row.executionStatus == 1) {
					btns = [
						{
							type: 'danger',
							label: '撤回',
							onClick() {
								ElMessageBox.confirm('确定要撤回成像需求吗？', '提示', {
									type: 'warning'
								}).then(() => {
									const data = scope.row;
									data.executionStatus = 0;
									service.rs_image_request.imageRequest.update(data).then(() => {
										refresh();
									});
								});
							}
						}
					];
				} else if (scope.row.executionStatus > 1 && scope.row.executionStatus < 5) {
					btns = [
						{
							type: 'danger',
							label: '取消',
							onClick() {
								ElMessageBox.confirm('确定取消吗？', '提示', {
									type: 'warning'
								}).then(() => {
									const data = scope.row;
									data.executionStatus = 6;
									service.rs_image_request.imageRequest.update(data).then(() => {
										refresh();
									});
								});
							}
						}
					];
				}
				return btns;
			}
		}
	]
});

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud(
	{
		service: service.rs_image_request.imageRequest
	},
	app => {
		app.refresh();
	}
);

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

function getStatusColor(status, val) {
	if (status >= val) {
		return 'success';
	} else {
		return 'info';
	}
}

function initMap() {
	mapRef.value?.initMap();
}
</script>
