(function(window, document){
	compressUpload = function (id, options) {
		var that = this;
		that.id = id;
		that.inputBtn = document.getElementById(that.id);

		// DEFAULT OPTIONS
		that.options = {
			uploadUrl:'',
			limitSize: 100,  //单位kb
			success: function(){}
		};

		// OVERWRITE DEFAULT OPTIONS
		for (i in options) that.options[i] = options[i];

		// INIT THE WHOLE DAMN THING!!!
		that.init();
	}

	compressUpload.prototype = {
		init: function () {
			var that = this;
			that.inputBtn.onchange = function (event) {
				let filesArr = event.target.files;
				for(i = 0,len=filesArr.length; i < len; i++) {
   					let file = filesArr[i];
				    let reader = new FileReader();
				    let Orientation;

				    // 读取文件转base64 
				    reader.readAsDataURL(file);

				    // 读取完成
				    reader.onload = function () {  
				        let result = this.result;

				        /**
				          *  event.target.files[0].size 为原图大小  单位是字节
				          *  如果图片小于 limitSize 直接上传，反之压缩图片
				         */
				        if (file.size <= (that.options.limitSize * 1024)) 
				        {
				            let blob = that.convertBase64UrlToBlob(result);
				            // 提交数据
				            that.submitFormData(blob);
				        }
				        else 
				        {
				            // 创建image
				            let image = new Image();
				            image.src = result;

				            // 图片加载完成
				            image.onload = function () {
				                //获取拍照的信息，解决IOS拍出来的照片旋转问题
				                EXIF.getData(image, function () {
				                    Orientation = EXIF.getTag(this, 'Orientation');
				                });   
				                console.log(Orientation);           

				                // 首先旋转成正确位置 再根据大小压缩 然后根据像素判断是否需要通过瓦片绘制
				                let canvas;

				                // 修复ios拍照上传图片的时被旋转的问题
				                if (Orientation !== undefined && Orientation !== '' && Orientation !== 1) {
				                    // 创建临时canvas  用来调整正确方位
				                    canvas = document.createElement('canvas');

				                    switch (Orientation) {
				                        case 6://需要顺时针（向左）90度旋转
				                            // console.log(image.width, image.height);
				                            that.rotateImg(image, 'left', canvas);
				                            break;
				                        case 8://需要逆时针（向右）90度旋转
				                            that.rotateImg(image, 'right', canvas);
				                            break;
				                        case 3://需要180度旋转
				                            that.rotateImg(image, 'right', canvas);//转两次
				                            that.rotateImg(image, 'right', canvas);
				                            break;
				                    }
				                }
				                else {
				                    canvas = that.compress(image);
				                }
				                // canvas = that.compress(image);

				                // 对缩小比例后的canvas再进行压缩
				                let compressData = canvas.toDataURL("image/jpeg", 0.3);  // 默认MIME image/png
				                let blob = that.convertBase64UrlToBlob(compressData);

				                // 提交数据
				                that.submitFormData(blob);
				            }
				        }
				    }
				}
			    
			}
		},
		/**
		* 创建canvas，绘制Image
		* @param 图片压缩后生成的base64
		*/
		compress: function(image) {
		    let {width, height} = image;

		    // 创建canvas 获取上下文
		    let canvas = document.createElement('canvas');
		    let ctx = canvas.getContext('2d');

		    /**
		    * 判断像素大小
		    * 像素 = 宽 * 高 
		    */

		    // 如果像素大于400万 则需计算压缩比 压缩至400万以下
		    let ratio = (width * height) / 4000000;

		    if (ratio > 1) {
		        // 倍数开方 （相当于面积为多少倍，则宽高对应的倍数需对面积倍数开方）
		        ratio = Math.sqrt(ratio);

		        // 宽高对应的值
		        width /= ratio;
		        height /= ratio;
		    }
		    else {
		        ratio = 1;
		    }

		    // 画布宽高
		    canvas.width = width;
		    canvas.height = height;

		    // 铺底色
		    ctx.fillStyle = '#fff';

		    // 绘制矩形
		    ctx.fillRect(0, 0, width, height);

		    // 如果缩放比例后画布像素仍大于100万像素 则使用瓦片绘制， 反之直接绘制
		    let count = width * height / 1000000;

		    if (count > 1) {
		        // 创建瓦片 获取2d上下文
		        let tcanvas = document.createElement('canvas');
		        let tctx = tcanvas.getContext('2d');

		        /**
		         * 瓦片数量 = count的平方 + 1
		         * +1不是必须得，是为了瓦片更小，数量更多一些
		         */
		        count = ~~(Math.sqrt(count) + 1);  // 比如count为2.3 则转成3

		        let tWidth = ~~(width / count);
		        let tHeight = ~~(height / count);

		        // 瓦片的宽高
		        tcanvas.width = tWidth;
		        tcanvas.height = tHeight;

		        for (let i = 0; i < count; i++) {
		            for (let j = 0; j < count; j++) {
		                tctx.drawImage(image, i * tWidth * ratio, j * tHeight * ratio, tWidth * ratio, tHeight * ratio, 0, 0, tWidth, tHeight);
		                // console.log(tcanvas.width, tcanvas.height, tcanvas.width * tcanvas.height);
		                ctx.drawImage(tcanvas, i * tWidth, j * tHeight, tWidth, tHeight);
		            }
		        }
		    }
		    else {
		        // 直接绘制
		        ctx.drawImage(image, 0, 0, width, height);
		    }

		    return canvas;
		},

		/**
		* 将图片压缩后生成的base64转成二进制对象blob
		* @param 图片压缩后生成的base64
		*/
		convertBase64UrlToBlob: function(urlData){
			var that = this;
			let bytes = window.atob(urlData.split(',')[1]);

		    // 处理异常,将ascii码小于0的转换为大于0
		    let ab = new ArrayBuffer(bytes.length);
		    let ia = new Uint8Array(ab);
		    for (let i = 0; i < bytes.length; i++) {
		        ia[i] = bytes.charCodeAt(i);
		    }

		    // 二进制对象
		    return that.getBlob([ab], "image/jpeg");
		},

		/**
		* Blob对象的兼容性写法
		* @param buffer 数据流
		* @param format 表示将会被放入到blob中的数组内容的MIME类型。类型默认 '' 
		*/
		getBlob: function(buffer, format = 'image/jpeg') {
		    try {
		        return new Blob(buffer, {
		            type: format
		        });
		    }
		    catch (e) {
		        let blob = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder)();

		        buffer.forEach(function (buf) {
		            blob.append(buf);
		        });
		        return blob.getBlob(format);
		    }
		},


		/**
		* 低版本的Android机不支持FormData，需要做兼容处理。首先判断是否需要兼容
		*/
		needsFormDataShim: function() {
		    return  ~navigator.userAgent.indexOf('Android')
		            && ~navigator.vendor.indexOf('Google')
		            && !~navigator.userAgent.indexOf('Chrome')
		            && navigator.userAgent.match(/AppleWebKit\/(\d+)/).pop() <= 534;
		},


		/**
		* 给不支持FormData上传Blob的android机打补丁，定义boundary分隔符，设置请求体。重写XMLHttpRequest原型的send方法
		*/
		FormDataShim: function() {
		    let o = this,
		        // 请求体 
		        parts = [],
		        // 分隔符
		        boundary = Array(5).join('-') + (+new Date() * (1e16 * Math.random())).toString(36),
		        oldSend = XMLHttpRequest.prototype.send;

		    this.append = function (name, value, filename) {
		        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"`);

		        if (value instanceof Blob) {
		            parts.push(`; filename="${filename || 'blob'}"\r\nContent-Type: ${value.type}\r\n\r\n`);
		            parts.push(value);
		        }
		        else {
		            parts.push('\r\n\r\n' + value);
		        }
		        parts.push('\r\n');
		    };

		    // override XHR send()
		    XMLHttpRequest.prototype.send = function (val) {
		        let fr,
		            data,
		            oXHR = this;

		        if (val === o) {
		            // 不能漏最后的\r\n ,否则服务器有可能解析不到参数.
		            parts.push(`--${boundary}--\r\n`);

		            // 创建Blob对象
		            data = that.getBlob(parts);

		            // Set up and read the blob into an array to be sent
		            fr = new FileReader();
		            fr.onload = function () {
		                oldSend.call(oXHR, fr.result);
		            };
		            fr.onerror = function (err) {
		                throw err;
		            };
		            fr.readAsArrayBuffer(data);

		            // 设置请求头Content-Type的类型和分隔符 服务端是根据Content-Type来解析请求体中
		            this.setRequestHeader(
		                'Content-Type',
		                `multipart/form-data; boundary=${boundary}`
		            );

		            XMLHttpRequest.prototype.send = oldSend;
		        }
		        else {
		            oldSend.call(this, val);
		        }
		    };
		},


		/**
		* @param Blob对象
		*/
		submitFormData: function(blob) {
			var that = this;
		    let isNeedShim = that.needsFormDataShim();
		    let formdata = isNeedShim ? new FormDataShim() : new FormData();

		    formdata.append('file', blob);	    
		    
		    if (isNeedShim) {
		        let ajax = new XMLHttpRequest();

		        ajax.open('POST', '/');
		        ajax.onreadystatechange = function() {
		            if (ajax.status === 200 && ajax.readyState === 4) {

		            }
		        }
		        ajax.send(formdata);
		    }
		    else {
		        // 调用API
		        $.ajax({
		            url: that.options.uploadUrl,
		            type: 'POST',
		            datatype: 'json',
		            data: formdata,
		            cache:false,
		            traditional: true,
		            contentType: false,
		            processData: false,
		            success: function (data) {
		                that.options.success(data);
		            },
		            error: function () {}
		        });
		    }
		},

		/**
		* 旋转图片，解决IOS竖着拍的照片会旋转的问题
		* @param 旋转的图片
		* @param 方向
		* @param 绘制的canvas
		*/
		rotateImg: function(img, direction, canvas) {
			var that = this;
		    //最小与最大旋转方向，图片旋转4次后回到原方向
		    const min_step = 0;
		    const max_step = 3;

		    if (img == null) return;

		    // 缩小比例后的canvas
		    let lessCnavas = that.compress(img);
		    let {width, height} = lessCnavas;
		    let step = 2;

		    if (step == null) {
		        step = min_step;
		    }

		    if (direction == 'right') {
		        step++;

		        //旋转到原位置，即超过最大值
		        step > max_step && (step = min_step);
		    } else {
		        step--;
		        step < min_step && (step = max_step);
		    }

		    //旋转角度以弧度值为参数
		    let degree = (step * 90 * Math.PI) / 180;
		    let ctx = canvas.getContext('2d');

		    switch (step) {
		        case 0:
		            canvas.width = width;
		            canvas.height = height;
		            ctx.drawImage(lessCnavas, 0, 0);
		            break;
		        case 1:
		            canvas.width = height;
		            canvas.height = width;
		            ctx.rotate(degree);
		            ctx.drawImage(lessCnavas, 0, -height);
		            break;
		        case 2:
		            canvas.width = width;
		            canvas.height = height;
		            ctx.rotate(degree);
		            ctx.drawImage(lessCnavas, -width, -height);
		            break;
		        case 3:
		            canvas.width = height;
		            canvas.height = width;
		            ctx.rotate(degree);
		            ctx.drawImage(lessCnavas, -width, 0);
		            break;
		    }
		}
	}

})(window, document)