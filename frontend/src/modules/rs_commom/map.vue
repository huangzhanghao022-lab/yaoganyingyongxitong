<template>
	<div style="height: 100%; width: 100%; color: red" :id="mapDivId"></div>
</template>

<script lang="tsx" setup>
defineOptions({
	name: 'rs-commom-map'
});

import { reactive, ref, defineEmits, onMounted } from 'vue';

// 引入ol
import { Map, View, Overlay } from 'ol';
import { fromLonLat, toLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { get as getProjection } from 'ol/proj';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import ImageTile from 'ol/source/ImageTile.js';
import VectorSource from 'ol/source/Vector.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';

import 'ol/ol.css';

// 定义组件可以触发的事件
const emit = defineEmits(['cliecked']);

const mapDivId = ref('mapDiv' + new Date().getTime());

const props = defineProps({
	center: {
		type: Array<number>,
		default: () => [66.22374491696924, 37.010502677990075]
	},
	zoom: {
		type: Number,
		default: 5
	},
	point: {
		type: Array<number>,
		default: () => []
	},
	allowEdit: {
		type: Boolean,
		default: false
	}
});

let map, vectorSource, vectorLayer;

const tdtToken = '2bccb37f2f2567265e449a55afbd1a95';
const tdtUrl = 'https://t{0-7}.tianditu.gov.cn/';

// 创建地图
function initMap() {
	if (!map) {
		map = new Map({
			target: mapDivId.value,
			layers: [
				new TileLayer({
					source: new ImageTile({
						url:
							tdtUrl +
							'img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' +
							tdtToken
					})
				}),
				new TileLayer({
					source: new ImageTile({
						url:
							tdtUrl +
							'cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' +
							tdtToken
					})
				})
			],
			view: new View({
				center: fromLonLat(props.center),
				zoom: props.zoom
			})
		});

		// 创建矢量数据源和矢量图层
		vectorSource = new VectorSource();
		vectorLayer = new VectorLayer({
			source: vectorSource
		});

		map.addLayer(vectorLayer);
		if (props.point.length > 0) {
			vectorSource.clear();
			addPoint(props.point);
		}

		map.on('click', function (event) {
			if (!props.allowEdit) return;

			// 获取点击位置的投影坐标
			const coordinate = event.coordinate;
			// 将投影坐标转换为经纬度坐标
			const lonLat = toLonLat(coordinate);
			console.log(
				'点击位置的经纬度：',
				lonLat,
				map.getView().getZoom(),
				map.getView().getCenter()
			);

			// 将投影坐标转换为经纬度坐标
			console.log('点击位置的经纬度：', lonLat);

			vectorSource.clear();
			addPoint(lonLat);
			emit('cliecked', {
				lonLat
			});
		});
	}
}

function addPoint(lonlat) {
	// 创建一个点要素
	const pointFeature = new Feature({
		geometry: new Point(fromLonLat(lonlat))
	});

	// 设置点要素的样式
	pointFeature.setStyle(
		new Style({
			image: new CircleStyle({
				radius: 6,
				fill: new Fill({ color: 'red' }),
				stroke: new Stroke({ color: 'white', width: 2 })
			})
		})
	);

	// 将点要素添加到矢量数据源中
	vectorSource.addFeature(pointFeature);
}

function setPoi(lonlat) {
	if (vectorSource) {
		vectorSource.clear();
		addPoint(lonlat);
		map.getView().animate({
			center: fromLonLat(lonlat),
			duration: 300 // 动画持续时间，单位为毫秒
		});
	}
}

defineExpose({
	initMap,
	setPoi
});
</script>
