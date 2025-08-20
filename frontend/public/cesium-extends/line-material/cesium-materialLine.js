if (typeof Cesium !== "undefined")
  {(function (Cesium) {
    /**
     * 自定义材质线Property 适用于entity和primitive材质
     * @param {*} options
     * @returns
     */
    function CustomMaterialLine(options) {
      let Color = Cesium.Color,
        defaultValue = Cesium.defaultValue,
        defined = Cesium.defined,
        defineProperties = Object.defineProperties,
        Event = Cesium.Event,
        createPropertyDescriptor = Cesium.createPropertyDescriptor,
        Property = Cesium.Property,
        Material = Cesium.Material,
        defaultColor = Color.WHITE,
        MaterialType = options.MaterialType || "wallType" + parseInt(Math.random() * 1000);
      // 创建自定义动态材质对象
      function PolylineCustomMaterialProperty(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        // 定义内置属性
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = options.color || Cesium.Color.BLUE;
        this.duration = options.duration || 1000;
        this._time = undefined;
      }
      // 定义材质对象默认属性
      defineProperties(PolylineCustomMaterialProperty.prototype, {
        isvarant: {
          get: function () {
            return false;
          },
        },
        definitionChanged: {
          get: function () {
            return this._definitionChanged;
          },
        },
        color: createPropertyDescriptor("color"),
      });
      // 材质对象需要有type函数 value函数 equals函数
      PolylineCustomMaterialProperty.prototype.getType = function (time) {
        return MaterialType;
      };
      PolylineCustomMaterialProperty.prototype.getValue = function (
        time,
        result
      ) {
        if (!defined(result)) {
          result = {};
        }
        result.color = Property.getValueOrClonedDefault(
          this._color,
          time,
          defaultColor,
          result.color
        );
        result.image = options.image;
        if (this._time === undefined) {
          this._time = time.secondsOfDay;
        }
        result.time = ((time.secondsOfDay - this._time) * 1000) / this.duration;
        return result;
      };
      PolylineCustomMaterialProperty.prototype.equals = function (other) {
        return (
          this === other || //
          (other instanceof PolylineCustomMaterialProperty &&
            Property.equals(this._color, other._color))
        );
      };
      // 将定义的材质对象添加到cesium的材质队列中
      Material._materialCache.addMaterial(MaterialType, {
        fabric: {
          type: MaterialType,
          uniforms: {
            color: options.color || new Cesium.Color(1.0, 0.0, 0.0, 0.5),
            image: options.image,
            time: options.color.time || 0,
          },
          // 动态材质shader
          source:`
            czm_material czm_getMaterial(czm_materialInput materialInput) {
              czm_material material = czm_getDefaultMaterial(materialInput);
              vec2 st = materialInput.st;
              if(texture(image, vec2(0.0, 0.0)).a == 1.0){
                  discard;
              }else{
                  material.alpha = texture(image, vec2(1.0 - fract(time - st.s), st.t)).a * color.a;
              }
              material.diffuse = max(color.rgb * material.alpha * 3.0, color.rgb);
              return material;
          }`,
        },
        // 透明
        translucent: function (material) {
          return true;
        },
      });
      return new PolylineCustomMaterialProperty(options);
    }

    Cesium.CustomMaterialLine = CustomMaterialLine;
  })(Cesium);}
