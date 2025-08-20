<template>
	<div style="height: 100%">
		<cl-crud ref="Crud">
			<cl-row>
				<!-- 刷新按钮 -->
				<cl-refresh-btn />
				<cl-flex1 />
				<!-- 条件搜索 -->
				<cl-search ref="Search" />
			</cl-row>

			<cl-row>
				<!-- 数据表格 -->
				<cl-table ref="Table"> </cl-table>
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
						<el-col :span="24"
							><el-input
								v-model="scope.poiName"
								placeholder="请输入成像点名称"
							></el-input
						></el-col>
					</el-row>
				</template>
			</cl-upsert>
			<cl-upsert ref="AcceptUpsert">
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
						<el-col :span="24"
							><el-input
								v-model="scope.poiName"
								placeholder="请输入成像点名称"
							></el-input
						></el-col>
					</el-row>
				</template>
			</cl-upsert>
		</cl-crud>
		<el-drawer v-model="mapPanelVisible" size="600" direction="rtl">
			<template #header>
				<h4>点击地图选择成像位置</h4>
			</template>
			<template #default>
				<div style="height: 100%; width: 100%; color: red" id="mapDiv"></div>
			</template>
			<template #footer>
				<div style="flex: auto">
					<el-button type="primary" style="width: 100%" @click="mapPanelVisible = false"
						>确定</el-button
					>
				</div>
			</template>
		</el-drawer>
		<cl-form ref="DataForm">
			<template #slot-imageAddress="{ scope }">
				<div class="cert">
					<!--【很重要】prop、rules 配置格式如下 -->
					<el-form-item
						v-for="(item, index) in scope.imageAddress"
						:key="index"
						:label="`数据文件${index + 1}`"
						:prop="`imageAddress.${index}.url`"
						:rules="{
							message: `请填写数据文件${index + 1}的类型和地址`,
							required: true
						}"
					>
						<div class="row">
							<!-- 输入框 -->
							<el-input
								class="input-type"
								v-model="item.label"
								placeholder="请填写类型"
							></el-input>
							<el-input
								class="input-url"
								v-model="item.url"
								placeholder="请填写地址"
							></el-input>
							<!-- 删除行 -->
							<el-icon @click="rowDel(index)">
								<delete />
							</el-icon>
						</div>
					</el-form-item>

					<!-- 添加行 -->
					<el-row type="flex" justify="end">
						<el-button @click="rowAdd()">添加数据</el-button>
					</el-row>
				</div>
			</template>
		</cl-form>
	</div>
</template>

<script lang="tsx" setup>
defineOptions({
	name: 'rs-image-request'
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { reactive, ref } from 'vue';

import 'ol/ol.css';
import dayjs from 'dayjs';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';

import { useForm } from '@cool-vue/crud';
import { value } from '/@/config';
const DataForm = useForm();

const { service, refs, setRefs } = useCool();
const mapPanelVisible = ref(false);
// 目标点选择框
const poiDialogVisible = ref(false);

// 目标点选择框
const dataDialogVisible = ref(false);
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
		// { label: '已创建', value: 0 },
		{ label: '待受理', value: 1, color: 'blue' },
		{ label: '已接收', value: 2, color: 'orange' },
		{ label: '执行中', value: 3, color: 'orange' },
		{ label: '解析中', value: 4, color: 'orange' },
		{ label: '已完成', value: 5, color: 'green' },
		{ label: '已取消', value: 6, color: 'red' },
		{ label: '已终止', value: 7, color: 'red' }
	],
	acceptStatus: [
		{ label: '已接收', value: 2, color: 'orange' },
		{ label: '执行中', value: 3, color: 'orange' },
		{ label: '解析中', value: 4, color: 'orange' },
		{ label: '已完成', value: 5, color: 'green' },
		{ label: '已终止', value: 7, color: 'red' }
	],
	taskPriority: [
		{ label: '低', value: 0 },
		{ label: '中', value: 1 },
		{ label: '高', value: 2 },
		{ label: '热点', value: 3 }
	]
});

// cl-upsert
const Upsert = useUpsert<Eps.RsImageRequestEntity>({
	dialog: {
		title: '成像需求信息'
	},
	items: [
		{
			hidden: true
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
	onOpened(data) {
		if (Upsert.value?.mode == 'info') {
			Upsert.value?.setForm('taskDeadlineTime', Number(data.taskDeadlineTime));
		}
	}
});

// cl-upsert
const AcceptUpsert = useUpsert<Eps.RsImageRequestEntity>({
	dialog: {
		title: '需求受理'
	},
	items: [
		{
			//【很重要】必须为 tabs
			type: 'tabs',
			props: {
				// 分组样式
				type: 'card',
				// 分组列表，必须是 { label, value } 的数组格式
				labels: [
					{
						label: '任务受理', // 标题
						value: 'accept' // 唯一标识
					},
					{
						label: '成像需求',
						value: 'req'
					}
				]
			}
		},
		{
			group: 'accept',
			label: '标记任务状态',
			prop: 'executionStatus',
			component: { name: 'cl-select', props: { options: options.acceptStatus } },
			span: 24,
			required: true
		},
		{
			group: 'accept',
			label: '计划成像时间',
			prop: 'plannedImagingTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', 'value-format': 'x' }
			},
			span: 24,
			required: true
		},
		{
			group: 'accept',
			label: '计划数传时间',
			prop: 'plannedDataTransmissionTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', 'value-format': 'x' }
			},
			span: 24,
			required: true
		},
		{
			group: 'accept',
			label: '预计完成时间',
			prop: 'estimatedCompletionTime',
			component: {
				name: 'el-date-picker',
				props: { type: 'datetime', 'value-format': 'x' }
			},
			span: 24,
			required: true
		},
		{
			group: 'accept',
			label: '需求反馈',
			prop: 'feedback',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4 }
			},
			span: 24
		},
		{
			hidden: true
		},
		{
			group: 'req',
			label: '卫星代号',
			prop: 'satelliteCode',
			component: { name: 'cl-select', props: { options: options.satellies } },
			span: 12,
			required: true
		},
		{
			group: 'req',
			label: '成像模式',
			prop: 'imagingMode',
			component: {
				name: 'slot-imagingMode'
			},
			span: 12,
			required: true
		},
		{
			group: 'req',
			label: '成像点名称',
			prop: 'poiName',
			component: {
				name: 'slot-poiName'
			},
			required: true
		},
		{
			group: 'req',
			label: '经度',
			prop: 'longitude',
			hook: 'number',
			component: { name: 'el-input-number', props: { min: 0 } },
			span: 12,
			required: true
		},
		{
			group: 'req',
			label: '纬度',
			prop: 'latitude',
			hook: 'number',
			component: { name: 'el-input-number', props: { min: 0 } },
			span: 12,
			required: true
		},
		{
			group: 'req',
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
			group: 'req',
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
			group: 'req',
			label: '备注',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4 }
			}
		},
		{
			group: 'req',
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
	onOpened(data) {
		if (AcceptUpsert.value?.mode == 'update') {
			AcceptUpsert.value?.setForm('taskDeadlineTime', Number(data.taskDeadlineTime));
			AcceptUpsert.value?.setForm('plannedImagingTime', Number(data.plannedImagingTime));
			let status = data.executionStatus;
			if (data.executionStatus == 1) {
				status = 2;
			}
			AcceptUpsert.value?.setForm('executionStatus', status);

			AcceptUpsert.value?.setForm(
				'plannedDataTransmissionTime',
				Number(data.plannedDataTransmissionTime)
			);
			AcceptUpsert.value?.setForm(
				'estimatedCompletionTime',
				Number(data.estimatedCompletionTime)
			);
		}
	}
});

// cl-upsert
// const DataForm = useForm({
// 	dialog: {
// 		title: '关联成像信息'
// 	},
// 	items: [
// 		{
// 			hidden: true
// 		},
// 		{
// 			label: '快视图',
// 			prop: 'quickView',
// 			component: { name: 'el-input' },
// 			required: true
// 		},
// 		{
// 			prop: 'imageAddress',
// 			//【很重要】默认数据格式，以实际业务为主。
// 			component: {
// 				name: 'slot-imageAddress'
// 			}
// 		}
// 	],
// 	onOpened(data) {
// 		if (data.imageAddress) {
// 			data.imageAddress = JSON.parse(data.imageAddress);
// 		} else {
// 			data.imageAddress = [];
// 		}
// 	},
// 	onClosed() {}
// });
function rowAdd() {
	DataForm.value?.form.imageAddress.push({
		label: '',
		url: ''
	});
}

function rowDel(index: number) {
	DataForm.value?.form.imageAddress.splice(index, 1);
}
function delData(index) {
	console.log(index);
}

function addData() {}

// cl-table
const Table = useTable({
	columns: [
		{ type: 'selection' },
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
		{ label: '需求来源', prop: 'nickName', minWidth: 100 },
		{
			label: '成像时长(秒)',
			prop: 'imagingDuration',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '执行状态',
			prop: 'executionStatus',
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
			dict: options.taskPriority
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
			label: '任务创建时间',
			prop: 'taskCreationTime',
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
			type: 'op',
			align: 'right',
			width: 260,
			buttons({ scope }) {
				const btns: any[] = [];
				if (scope.row.executionStatus == 1) {
					btns.push({
						type: 'success',
						label: '接收',
						onClick() {
							AcceptUpsert.value?.edit(scope.row);
						}
					});
				} else {
					btns.push({
						type: 'info',
						label: '关联数据',
						onClick() {
							let imageAddress = [];
							if (scope.row.imageAddress) {
								try {
									imageAddress = JSON.parse(scope.row.imageAddress);
								} catch (error) {
									imageAddress = [];
								}
							}
							DataForm.value?.open({
								dialog: {
									title: '关联成像信息'
								},
								items: [
									{
										hidden: true
									},
									{
										label: '快视图',
										prop: 'quickView',
										component: { name: 'el-input' },
										required: true,
										value: scope.row.quickView
									},
									{
										prop: 'imageAddress',
										//【很重要】默认数据格式，以实际业务为主。
										component: {
											name: 'slot-imageAddress'
										},
										value: imageAddress
									}
								],
								on: {
									submit(data, event) {
										const reqData = data;
										reqData.id = scope.row.id;
										reqData.imageAddress = JSON.stringify(data.imageAddress);
										console.log(reqData);
										service.rs_image_request.imageRequest.update(reqData);
										scope.row.imageAddress = JSON.stringify(data.imageAddress);

										service.rs_image_request.imageRequest
											.update(reqData)
											.then(() => {
												event.close();
												event.done();
												refresh();
											});
									}
								}
							});
						}
					});
				}
				if (scope.row.executionStatus > 1 && scope.row.executionStatus < 6) {
					btns.push({
						type: 'success',
						label: '标注进度',
						onClick() {
							AcceptUpsert.value?.edit(scope.row);
						}
					});
				}
				if (scope.row.executionStatus < 6) {
					btns.push({
						type: 'danger',
						label: '终止',
						onClick() {
							ElMessageBox.confirm('确定要终止这个成像需求吗？', '提示', {
								type: 'warning'
							}).then(() => {
								const data = scope.row;
								data.executionStatus = 7;
								service.rs_image_request.imageRequest.update(data).then(() => {
									refresh();
								});
							});
						}
					});
				}
				btns.push('info');

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
		service: service.rs_image_request.imageRequest,
		async onRefresh(params, { next, done, render }) {
			params.executionStatus = -1;
			const { list, pagination } = await next(params);
			render(list, pagination);
		}
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
	console.log(status, val);
	if (status >= val) {
		return 'success';
	} else {
		return 'info';
	}
}
</script>

<style lang="scss" scoped>
.cert {
	.row {
		display: flex;
		align-items: center;

		.input-type {
			flex: 1;
			margin-right: 10px;
		}
		.input-url {
			flex: 3;
			margin-right: 10px;
		}
		.el-icon {
			cursor: pointer;

			&:hover {
				color: red;
			}
		}
	}
}
</style>
