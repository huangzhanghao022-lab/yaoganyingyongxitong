let viewer;
let viewerClickHanlder;
let poiLayer;

let tdtToken = '2bccb37f2f2567265e449a55afbd1a95';
let tdtUrl = 'https://t{s}.tianditu.gov.cn/';
let subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];

let allowDraw = false;

// 需要覆盖config.json中地图属性参数
export const mapOptions = {
	basemaps: [
		{
			pid: 10,
			name: '天地图影像',
			icon: '/img/basemaps/tdt_img.png',
			type: 'group',
			layers: [
				{ name: '底图', type: 'tdt', layer: 'img_d', key: [tdtToken] },
				{ name: '注记', type: 'tdt', layer: 'img_z', key: [tdtToken] }
			],
			show: true
		},
		{
			pid: 10,
			name: '天地图电子',
			icon: '/img/basemaps/tdt_vec.png',
			type: 'group',
			layers: [
				{ name: '底图', type: 'tdt', layer: 'vec_d', key: [tdtToken] },
				{ name: '注记', type: 'tdt', layer: 'vec_z', key: [tdtToken] }
			],
			show: false
		}
	],
	scene: {
		// 此处参数会覆盖config.json中的对应配置
		center: {
			lat: 10.166938,
			lng: 105.692104,
			alt: 35575845,
			heading: 358,
			pitch: -87
		},
		cameraController: {
			zoomFactor: 3.0,
			minimumZoomDistance: 1000,
			maximumZoomDistance: 300000000,
			constrainedAxis: false // 解除在南北极区域鼠标操作限制
		}
	}
};

export async function initEarth(cbs) {
	viewer = new Cesium.Viewer('earth-container', {
		// shouldAnimate: false, //允许动画
		homeButton: false,
		baseLayerPicker: false,
		navigationHelpButton: false,
		geocoder: false,
		animation: false,
		infoBox: false,
		sceneMode: Cesium.SceneMode.SCENE2D,
		timeline: false,
		contextOptions: {
			requestWebgl2: true
		},
		baseLayer: new Cesium.ImageryLayer(
			new Cesium.UrlTemplateImageryProvider({
				url:
					tdtUrl +
					'img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' +
					tdtToken,
				subdomains: subdomains,
				tilingScheme: new Cesium.WebMercatorTilingScheme(),
				maximumLevel: 18
			})
		),
		msaaSamples: 8
	});
	let imgLabelMap = new Cesium.UrlTemplateImageryProvider({
		url:
			tdtUrl +
			'cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' +
			tdtToken,
		subdomains: subdomains,
		tilingScheme: new Cesium.WebMercatorTilingScheme(),
		maximumLevel: 18
	});
	viewer.imageryLayers.addImageryProvider(imgLabelMap);

	// 显示帧率
	viewer.scene.debugShowFramesPerSecond = true;
	poiLayer = new Cesium.CustomDataSource('poiLayer');
	viewer.dataSources.add(poiLayer);

	viewer.camera.setView({
		// 相机位置，使用Cartesian3.fromDegrees指定经纬度和高度
		destination: Cesium.Cartesian3.fromDegrees(94.65124138643077, 31.16678690218113, 16000000)
	});

	initEvent(viewer, cbs);
}

function initEvent(viewer, cbs) {
	// 地图点击事件，获取地图视角
	let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
	console.log('allowDraw', allowDraw);
	handler.setInputAction(function (evt) {
		let cartesian = viewer.scene.pickPosition(evt.position);
		if (Cesium.defined(cartesian)) {
			let cartographic = Cesium.Cartographic.fromCartesian(cartesian); //根据笛卡尔坐标获取到弧度
			let lng = Cesium.Math.toDegrees(cartographic.longitude); //根据弧度获取到经度
			let lat = Cesium.Math.toDegrees(cartographic.latitude); //根据弧度获取到纬度
			let height = cartographic.height; //模型高度
			console.log(cartesian, lng, lat, height);
		}

		let pickedObject = viewer.scene.pick(evt.position);
		if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
			let entity = pickedObject.id;
			console.log('拾取到的实体:', entity, entity.__data__);
			if (cbs.selectedPoi) {
				cbs.selectedPoi(entity);
			}
		}

		if (Cesium.defined(cartesian) && allowDraw) {
			var cartographic = Cesium.Cartographic.fromCartesian(cartesian); //根据笛卡尔坐标获取到弧度
			var lng = Cesium.Math.toDegrees(cartographic.longitude); //根据弧度获取到经度
			var lat = Cesium.Math.toDegrees(cartographic.latitude); //根据弧度获取到纬度
			var height = cartographic.height; //模型高度

			// 添加一个实体作为标注
			let poi = new Cesium.Entity({
				// 标注的位置，使用经纬度表示
				position: cartesian,
				// 标注的点样式
				point: {
					pixelSize: 10, // 点的像素大小
					color: Cesium.Color.RED, // 点的颜色
					outlineColor: Cesium.Color.WHITE, // 点的轮廓颜色
					outlineWidth: 2 // 点的轮廓宽度
				},
				// 标注的标签
				label: {
					text: '', // 标签显示的文本
					font: '14pt monospace', // 标签的字体
					fillColor: Cesium.Color.WHITE, // 标签的填充颜色
					style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 标签的样式
					outlineWidth: 2, // 标签的轮廓宽度
					verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 标签的垂直对齐方式
					pixelOffset: new Cesium.Cartesian2(0, -9) // 标签相对于点的像素偏移量
				},
				// 标注的信息窗口
				description: '<p>这是一个详细的描述信息。</p>',
				__data__: null
			});
			allowDraw = false;
			poiLayer.entities.add(poi);
			if (cbs.drawEnd) {
				cbs.drawEnd(poi, lng, lat);
			}
		}
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export function setDrawStatus(allow) {
	allowDraw = allow;
}

export function removeAllPoi() {
	if (Cesium.defined(poiLayer)) {
		poiLayer.entities.removeAll();
	}
}

export function addPoi(row) {
	// 添加一个实体作为标注
	let poi = new Cesium.Entity({
		// 标注的位置，使用经纬度表示
		position: Cesium.Cartesian3.fromDegrees(row.longitude, row.latitude),
		// 标注的点样式
		point: {
			pixelSize: 10, // 点的像素大小
			color: Cesium.Color.RED, // 点的颜色
			outlineColor: Cesium.Color.WHITE, // 点的轮廓颜色
			outlineWidth: 2 // 点的轮廓宽度
		},
		// // 标注的标签
		label: {
			text: row.name, // 标签显示的文本
			font: '14pt monospace', // 标签的字体
			fillColor: Cesium.Color.WHITE, // 标签的填充颜色
			style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 标签的样式
			outlineWidth: 2, // 标签的轮廓宽度
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 标签的垂直对齐方式
			pixelOffset: new Cesium.Cartesian2(0, -12) // 标签相对于点的像素偏移量
		},
		// 标注的信息窗口
		description: '<p>这是一个详细的描述信息。</p>',
		__data__: row
	});

	poiLayer.entities.add(poi);
}

export function removePoi(poi) {
	poiLayer.entities.remove(poi);
}

/**
 * 释放当前地图业务的生命周期函数
 * @returns {void} 无
 */
export function onUnmounted() {
	viewer = null;
	stationLayer = null;
	stationConeLayer = null;
	satelliteLayer = null;
	satelliteConeLayer = null;
}
