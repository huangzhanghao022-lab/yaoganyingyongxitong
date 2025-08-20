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
				<el-card style="max-width: 390px" v-for="(c, ci) in requestList" :key="ci">
					<template #header>
						<div style="display: flex; justify-content: space-between">
							<span>目标名称 {{ c.poiName ? c.poiName : '未指定' }}</span>
							<el-tag type="primary">{{ c.satelliteCode }}</el-tag>
						</div>
					</template>
					<img :src="c.quickView" style="width: 100%; height: 360px" />
					<template #footer>
						<div style="display: flex; justify-content: space-between">
							<span style="line-height: 32px"> 创建时间 {{ c.createTime }} </span>
							<el-dropdown placement="bottom">
								<el-button> 下载</el-button>
								<template #dropdown>
									<el-dropdown-menu>
										<el-dropdown-item
											v-for="imageAddr in c.imageAddress"
											:key="imageAddr"
											><a :href="imageAddr.url" target="_blank">{{
												imageAddr.label
											}}</a></el-dropdown-item
										>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
						</div>
					</template>
				</el-card>
			</cl-row>
			<cl-row>
				<cl-flex1 />
				<!-- 分页控件 -->
				<cl-pagination />
			</cl-row>
		</cl-crud>
	</div>
</template>

<script lang="tsx" setup>
defineOptions({
	name: 'rs-image-request'
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { reactive, ref } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const { service, refs, setRefs } = useCool();

const requestList = reactive<any[]>([]);

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
		{ label: '待受理', value: 1 },
		{ label: '已接收', value: 2 },
		{ label: '执行中', value: 3 },
		{ label: '解析中', value: 4 },
		{ label: '已完成', value: 5 },
		{ label: '已取消', value: 6 },
		{ label: '已终止', value: 7 }
	],
	acceptStatus: [
		{ label: '已接收', value: 2 },
		{ label: '执行中', value: 3 },
		{ label: '解析中', value: 4 },
		{ label: '已完成', value: 5 },
		{ label: '已终止', value: 7 }
	],
	taskPriority: [
		{ label: '低', value: 0 },
		{ label: '中', value: 1 },
		{ label: '高', value: 2 },
		{ label: '热点', value: 3 }
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
			requestList.length = 0;
			list.forEach((item: any) => {
				if (item.imageAddress) {
					try {
						item.imageAddress = JSON.parse(item.imageAddress);
					} catch (error) {
						item.imageAddress = [];
					}
				} else {
					item.imageAddress = [];
				}

				if (!item.quickView) {
					item.quickView = '/satellite.png';
				}

				requestList.push(item);
			});
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
</script>

<style scoped>
.example-showcase .el-dropdown-link {
	cursor: pointer;
	color: var(--el-color-primary);
	display: flex;
	align-items: center;
}
</style>
