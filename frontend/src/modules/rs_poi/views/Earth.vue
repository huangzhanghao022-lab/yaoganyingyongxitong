<template>
	<div id="earth-container" :style="{ cursor: mapCursor }" class="earth">
		<div class="poi-list-panel">
			<div style="text-align: right" v-show="poiListVisible">
				<el-button type="primary" text @click="poiListVisible = false">⬅️收起</el-button>
			</div>
			<div style="text-align: right" v-show="!poiListVisible">
				<el-button type="primary" text @click="poiListVisible = true">目标列表➡️</el-button>
			</div>
			<div v-show="poiListVisible">
				<div style="padding-bottom: 5px">
					<el-button type="primary" @click="startEditStatus">新增目标点</el-button>
					<el-button type="danger" @click="deletePois">批量删除</el-button>
					<br />
					<el-tag style="margin-top: 3px" type="primary">
						提示：先点击“新增目标点”按钮，然后在地图选择成像点位置。
					</el-tag>
				</div>
				<div style="display: flex">
					<el-input
						v-model="keword_name"
						style="width: 270px"
						clearable
						placeholder="请输入目标点名称"
						@clear="loadPoi"
					/>
					<el-button
						:icon="Search"
						type="primary"
						style="margin-left: 5px; text-align: right; align-self: flex-end"
						@click="findByName"
						>查询
					</el-button>
				</div>
				<hr style="margin: 3px" />
				<el-table
					ref="poiTableRef"
					:data="poiData"
					style="width: 100%; height: 500px"
					@selection-change="handleSelectionChange"
				>
					<el-table-column prop="id" label="ID" v-if="false"></el-table-column>
					<el-table-column type="selection" width="30" />
					<el-table-column fixed type="index" width="50" />
					<el-table-column prop="name" label="名称" width="120" />
					<el-table-column prop="type" label="类型" width="80" />
					<el-table-column fixed="right" label="操作" align="center" width="100">
						<template #default="scope">
							<el-popconfirm
								confirm-button-text="是"
								cancel-button-text="否"
								:icon="InfoFilled"
								icon-color="#626AEF"
								title="确定删除?"
								@confirm="deleteTableRow(scope.row)"
							>
								<template #reference>
									<el-button link type="primary" size="small"> 删除 </el-button>
								</template>
							</el-popconfirm>
						</template>
					</el-table-column>
				</el-table>
			</div>
		</div>
		<el-dialog v-model="addPoiDialogVisible" title="新增成像目标" width="500">
			<el-form
				ref="poiFormRef"
				style="max-width: 600px"
				:model="poiForm"
				:rules="poiFormRules"
				label-width="auto"
				status-icon
			>
				<el-form-item label="名称" prop="name">
					<el-input v-model="poiForm.name" />
				</el-form-item>
				<el-form-item label="纬度" prop="latitude">
					<el-input v-model="poiForm.latitude" />
				</el-form-item>
				<el-form-item label="经度" prop="longitude">
					<el-input v-model="poiForm.longitude" />
				</el-form-item>
				<el-form-item label="状态" prop="status">
					<el-radio-group v-model="poiForm.status">
						<el-radio value="0" checked>启用</el-radio>
						<el-radio value="1">禁用</el-radio>
					</el-radio-group>
				</el-form-item>
				<el-form-item label="备注" prop="desc">
					<el-input v-model="poiForm.remark" type="textarea" />
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="cancelSavePoi">取消</el-button>
					<el-button type="primary" @click="savePoi(poiFormRef)"> 保存 </el-button>
				</div>
			</template>
		</el-dialog>
		<el-drawer v-model="poiDetailVisible" direction="rtl">
			<template #header>
				<h4>成像目标详情</h4>
			</template>
			<template #default>
				<el-descriptions :title="poiForm.name" :column="2" border>
					<el-descriptions-item
						label="类型"
						label-align="right"
						align="center"
						label-class-name="my-label"
						class-name="my-content"
						width="80px"
					>
						<el-tag size="small">{{ poiForm.type }}</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="状态" label-align="right" align="center">
						{{ poiForm.status }}
					</el-descriptions-item>
					<el-descriptions-item label="经度" label-align="right" align="center">
						{{ poiForm.longitude }}
					</el-descriptions-item>
					<el-descriptions-item label="纬度" label-align="right" align="center">
						{{ poiForm.latitude }}
					</el-descriptions-item>
					<el-descriptions-item label="备注" label-align="right" align="center">
						{{ poiForm.remark }}
					</el-descriptions-item>
				</el-descriptions>
			</template>
			<template #footer>
				<div style="flex: auto">
					<el-popconfirm
						confirm-button-text="是"
						cancel-button-text="否"
						:icon="InfoFilled"
						icon-color="#626AEF"
						title="确定删除?"
						@confirm="deletePoi"
					>
						<template #reference>
							<el-button type="danger" style="width: 100%">删除</el-button>
						</template>
					</el-popconfirm>
				</div>
			</template>
		</el-drawer>
	</div>
</template>

<script lang="ts" setup>
import * as earth from './earth.js';
import { onMounted, reactive, ref } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

import { Search } from '@element-plus/icons-vue';
import {
	ElButton,
	ElTag,
	FormInstance,
	FormRules,
	POPPER_CONTENT_INJECTION_KEY,
	TableInstance
} from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
import { map } from 'lodash-es';
import Poi from './poi.vue';

interface Poi {
	id?: number;
	name?: string;
	latitude: number;
	longitude: number;
	remark?: string;
	status: string;
	type?: string;
}

// crosshair  pointer
const mapCursor = ref('pointer');
const poiTableRef = ref<TableInstance>();
const poiSelection = ref<Poi[]>([]);
const addPoiDialogVisible = ref(false);
const poiDetailVisible = ref(false);
const keword_name = ref('');
const poiListVisible = ref(true);
let currentEntity;
const poiForm = reactive<Poi>({
	name: '',
	latitude: 0,
	longitude: 0,
	remark: '',
	status: '0',
	type: ''
});
const poiFormRef = ref<FormInstance>();
const poiFormRules = reactive<FormRules<Poi>>({
	name: [
		{ required: true, message: '请输入一个有效的名称', trigger: 'blur' },
		{ min: 1, max: 20, message: '长度在 1 到 20个字符', trigger: 'blur' }
	],
	status: [
		{
			required: true,
			message: '请选择一个状态标识',
			trigger: 'change'
		}
	]
});

const poiData = reactive<Poi[]>([]);

const savePoi = async function (formEl: FormInstance | undefined) {
	if (!formEl) return;
	await formEl.validate(async (valid, fields) => {
		if (valid) {
			await service.rs_poi.poi.add(poiForm);
			addPoiDialogVisible.value = false;
			currentEntity.label.text = poiForm.name;
			currentEntity.__data__ = poiForm;
			mapCursor.value = 'pointer';
			loadPoi();
		} else {
			console.log('error submit!', fields);
		}
	});
};
const cancelSavePoi = function () {
	earth.removePoi(currentEntity);
	addPoiDialogVisible.value = false;
	mapCursor.value = 'pointer';
};
const deletePoi = function () {
	service.rs_poi.poi.delete({ ids: [currentEntity.__data__.id] }).then(res => {
		earth.removePoi(currentEntity);
		currentEntity = null;
		poiDetailVisible.value = false;

		loadPoi();
	});
};
const deleteTableRow = function (row) {
	service.rs_poi.poi.delete({ ids: [row.id] }).then(res => {
		loadPoi();
	});
};
const deletePois = function () {
	const pois = poiTableRef.value!.getSelectionRows();
	console.log(pois);
	const ids = map(pois, poi => {
		return poi.id;
	});

	service.rs_poi.poi.delete({ ids: ids }).then(res => {
		console.log(res);
		earth.removePoi(currentEntity);
		currentEntity = null;
		poiDetailVisible.value = false;

		loadPoi();
	});
};
const loadPoi = async function () {
	earth.removeAllPoi();
	poiData.length = 0;
	const res = await service.rs_poi.poi.list();
	for (let i = 0; i < res.length; i++) {
		poiData.push({
			id: res[i].id,
			name: res[i].name,
			latitude: res[i].latitude,
			longitude: res[i].longitude,
			remark: res[i].remark ? res[i].remark : '',
			status: String(res[i].status),
			type: res[i].type
		});

		earth.addPoi(res[i]);
	}
};
const handleSelectionChange = (val: any[]) => {
	console.log(val);
};
const startEditStatus = () => {
	mapCursor.value = 'crosshair';
	earth.setDrawStatus(true);
};
const selectedPoi = entity => {
	currentEntity = entity;
	poiDetailVisible.value = true;
	poiForm.latitude = entity.__data__.latitude;
	poiForm.longitude = entity.__data__.longitude;
	poiForm.name = entity.__data__.name;
	poiForm.status = entity.__data__.status;
	poiForm.type = entity.__data__.type;
};
const findByName = async () => {
	service.rs_poi.poi
		.listByName({
			name: keword_name.value
		})
		.then(res => {
			earth.removeAllPoi();
			poiData.length = 0;
			for (let i = 0; i < res.length; i++) {
				poiData.push({
					id: res[i].id,
					name: res[i].name,
					latitude: res[i].latitude,
					longitude: res[i].longitude,
					remark: res[i].remark ? res[i].remark : '',
					status: String(res[i].status),
					type: res[i].type
				});

				earth.addPoi(res[i]);
			}
		});
};
const drawEnd = (entity, lng, lat) => {
	poiForm.name = '';
	poiForm.remark = '';
	poiForm.status = '0';
	poiForm.type = 'none';

	currentEntity = entity;
	addPoiDialogVisible.value = true;
	poiForm.latitude = lat;
	poiForm.longitude = lng;
};

onMounted(() => {
	loadPoi();
	earth.initEarth({ selectedPoi, drawEnd });
});
</script>

<style>
.cesium-performanceDisplay-defaultContainer {
	top: initial;
	bottom: 40px;
}

.earth {
	height: 100%;
	width: 100%;
}

.poi-list-panel {
	position: absolute;
	top: 10px;
	left: 10px;
	padding: 5px;
	z-index: 300;
	border-radius: 5px;
	background-color: white;
	overflow: auto;
}
</style>
