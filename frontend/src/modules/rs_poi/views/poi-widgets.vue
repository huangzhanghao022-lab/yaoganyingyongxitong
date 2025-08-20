<template>
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
			<cl-table ref="Table" @currentChange="selectedRow" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>
		<cl-row>
			<cl-flex1 />
			<rsmap
				ref="mapRef"
				style="height: 500px"
				:center="mapCenter"
				:point="poiPoint"
				:allow-edit="allowMapEdit"
				:zoom="mapZoom"
			></rsmap>
		</cl-row>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'rs-poi-widgets'
});

// 定义组件可以触发的事件
const emit = defineEmits(['selectedRow']);

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import Rsmap from '../../rs_commom/map.vue';
import { useI18n } from 'vue-i18n';
import { reactive, onMounted, ref, useTemplateRef } from 'vue';

const { service } = useCool();
const { t } = useI18n();

const mapCenter = reactive([104.40365310824745, 38.50792415184924]);
const mapZoom = ref(5);
const poiPoint = reactive<number[]>([]);
const allowMapEdit = ref<boolean>(false);
type Map = InstanceType<typeof Rsmap>;
const mapRef = useTemplateRef<Map>('mapRef');

// 选项
const options = reactive({
	status: [
		{ label: '启用', value: 0, color: 'green' },
		{ label: '禁用', value: 1, color: 'red' }
	],
	types: [
		{ label: '城市', value: '0' },
		{ label: '机场', value: '1' },
		{ label: '森林', value: '2' },
		{ label: '沙漠', value: '3' },
		{ label: '海洋', value: '4' },
		{ label: '其他', value: 'none' }
	]
});

// cl-table
const Table = useTable({
	columns: [
		{ label: '名称', prop: 'name', minWidth: 140 },
		{ label: '类型', prop: 'type', minWidth: 60, dict: options.types, dictColor: true },
		{
			label: '经度',
			prop: 'longitude',
			hook: 'number',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '纬度',
			prop: 'latitude',
			hook: 'number',
			minWidth: 140,
			sortable: 'custom'
		},
		{
			label: '禁用状态',
			prop: 'status',
			minWidth: 60,
			dict: options.status
		},
		{
			label: '备注',
			prop: 'remark',
			showOverflowTooltip: true
		}
	]
});

function selectedRow(row) {
	mapRef.value?.setPoi([row.longitude, row.latitude]);
	emit('selectedRow', row);
}

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud(
	{
		service: service.rs_poi.poi
	},
	app => {
		app.refresh();
	}
);

onMounted(() => {
	mapRef.value?.initMap();
});
</script>
