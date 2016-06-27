(function(window,undefined){
	var document = window.document,
		support = {
			transform3d: ("WebKitCSSMatrix" in window && "m11" in new WebKitCSSMatrix()),
			touch: ("ontouchstart" in window)
		};
	//执行动画	
	function getTranslate(x, y){
		var distX = x, distY = y;
		return support.transform3d ? "translate3d("+ distX +"px, "+ distY +"px, 0)" : "translate("+ distX +"px, "+ distY +"px)";
	}
	//获取触碰点的page属性值
	function getPage(event, page) {
		//window支持ontouchstart事件？返回触控点的page值（所传参数，一般为pageX，pageY）：event[page]
		return support.touch ? event.changedTouches[0][page] : event[page];
	}
	
	var swiper2;
	var swiperMethod={
		init:function(param){
			param=param||{};
			if(param.swipElemId){
				swiper2= new Swiper("#"+param.swipElemId,{
					pagination: '.swiper-pagination2',
			        paginationClickable: true,
			        initialSlide:param.activeIndex?param.activeIndex:0,
			        speed:1000
				});
			}
		}
	};
	var imgs=[];
	//整个swiper容器对象
	var ImagesZoom = function(){};
	ImagesZoom.prototype={
		isInited:false,          //是否已经初始化
		show:function(param){
			swiper2.slideTo(param.activeIndex);
			var coverBox=document.querySelector(".cover-box");
			//显示遮罩层
			coverBox.style.cssText="display: block;";
		},
		close:function(){
			var coverBox=document.querySelector(".cover-box");
			coverBox.style.cssText = "display:none";
			//重置图片位置
			for(var i=0; i<imgs.length; i++){
				imgs[i]._destroy();
			}
		},
		init:function(params){
			var self=this,
			    params=params||{};
			//需要缩放的图片集合
			var scaleImgs=document.querySelectorAll(params.elem+" img");
			var imgHtml="";
			for(var i=0; i<scaleImgs.length; i++){
				var imgSrc=scaleImgs[i].getAttribute("data-src");
				if(imgSrc){
					imgHtml+='<div class="swiper-slide">'+
						    '<div class="imgzoom"><img src="'+imgSrc+'" /></div>'+
						 '</div>';
				}
			}
			$("#swiper2 .swiper-wrapper").html(imgHtml);
			var imgList=document.querySelectorAll("#"+params.swipElemId+" img");
			var coverBox=document.querySelector(".cover-box");
			//点击屏幕关闭
			coverBox.addEventListener("click",function(){
				self.close();
			},true);
			//显示遮罩层
			coverBox.style.cssText="display: block;"
			//初始化swiper2
			swiperMethod.init(params);
			//图片垂直居中
			for(var i=0;i<imgList.length;i++){
				imgList[i].style.cssText = "margin-top:-"+(imgList[i].offsetHeight/2)+"px";
				//给每个图片添加伸缩事件
				var zoom=new singleZoom();
				zoom.init(imgList[i]);
				imgs.push(zoom);
			}
			// 禁止页面滚动
			document.addEventListener("touchmove", self.eventStop, false);
			self.isInited=true;
		}
	}
	window.ImagesZoom = new ImagesZoom();
	//单个伸缩图片
	var singleZoom=function(){};
	singleZoom.prototype={
		buffMove:3,
		buffScale:2,
		finger:false,
		isMove:false,
		isFinish:false,
		init:function(imgObj){
			var self=this;
			var coverBox=document.querySelector(".cover-box");
			//暂时只缩放第一张图
			var zoomImg=imgObj;
			self.element=imgObj;
			//重置坐标数据
			self._destroy();
			//图片初始宽高
			self.imgBaseWidth  = zoomImg.offsetWidth;
			self.imgBaseHeight = zoomImg.offsetHeight;
			self.addEventStart({
				wrapX: coverBox.offsetWidth,   //遮罩层宽（可看到的区域宽）
				wrapY: coverBox.offsetHeight,  //遮罩层高（可看到的区域高）
				mapX: zoomImg.width,           //缩放图片宽
				mapY: zoomImg.height           //缩放图片高
			});
		},
		close:function(){
			var coverBox=document.querySelector(".cover-box");
			coverBox.style.cssText = "display:none";
			//重置图片位置
			for(var i=0; i<imgs.length; i++){
				imgs[i]._destroy();
			}
		},
		//添加相关手势事件
		addEventStart:function(param){
			var self   = this,
				params = param || {};

			//self.element = document.querySelector("#img_1");
			//config set
			self.wrapX = params.wrapX || 0; 	//可视区域宽度
			self.wrapY = params.wrapY || 0; 	//可视区域高度
			self.mapX  = params.mapX || 0; 	    //地图宽度
			self.mapY  = params.mapY || 0;      //地图高度

			self.outDistY = (self.mapY - self.wrapY)/2; //图片垂直方向超过可视区域的距离，图片超过一屏的时候有用
			
			self.width  = self.mapX - self.wrapX;   //地图的宽度减去可视区域的宽度（图片左右两边超过可视区域宽度之和）
			self.height = self.mapY - self.wrapY;   //地图的高度减去可视区域的高度（图片上下两边超过可视区域高度之和）
			//touchmove当手指触摸屏幕时触发
			self.element.addEventListener("touchstart",function(e){
				self._touchstart(e);
			},false);
			//当手指在屏幕上滑动的时候连续触发，即使已经有一个手指放在屏幕上也会触发
			self.element.addEventListener("touchmove",function(e){
				self._touchmove(e);
			},false);
			//当手指从屏幕上离开的时候触发
			self.element.addEventListener("touchend",function(e){
				self._touchend(e);
			},false);
		},
		_touchstart:function(e){
			var self = this;
			//阻止事件默认行为
			e.preventDefault();

			var touchTarget = e.targetTouches.length; //获得触控点数
			self._changeData(); //重新初始化图片、可视区域数据，由于放大会产生新的计算
			self.isMove=false;
			//单手指触控
			if(touchTarget == 1){
				// 获取开始坐标
				self.basePageX = getPage(e, "pageX");
				self.basePageY = getPage(e, "pageY");

				self.finger = false;
			//多手指触控
			}else{
				self.finger = true;
				var touchDistInfo=self.getTouchDist(e);
				self.startFingerDist = touchDistInfo.dist;   //两触控点的距离
				self.startFingerX    = touchDistInfo.x;      //两触控点距离的中点位置横坐标
				self.startFingerY    = touchDistInfo.y;      //两触控点距离的中点位置纵坐标
			}
		},
		_touchmove: function(e){
			var self = this;
			self.isMove=true;
			e.preventDefault();
			e.stopPropagation();

			//console.log("event.changedTouches[0].pageY: "+event.changedTouches[0].pageY);
			
			var touchTarget = e.targetTouches.length; //获得触控点数
			//为单个触碰移动则移动图片
			if(touchTarget == 1 && !self.finger){
				self._move(e);
			}
			//为多个触控移动则缩放图片大小
			if(touchTarget>=2){
				self._zoom(e);
			}
			//当手指从屏幕上离开的时候触发
			self.element.addEventListener("touchend",function(e){
				self._touchend(e);
			},false);
		},
		_touchend: function(e){
			var self = this;

			self._changeData(); //重新计算数据
			if(self.finger){
				self.distX = -self.imgNewX;
				self.distY = -self.imgNewY;
			}

			if( self.distX>0 ){
				self.newX = 0;
			}else if( self.distX<=0 && self.distX>=-self.width ){
				self.newX = self.distX;
				self.newY = self.distY;
			}else if( self.distX<-self.width ){
				self.newX = -self.width;
			}
			//有移动操作才执行重置数据方法，否则关闭
			if(self.isMove){
				self.reset();
			}else{
				self.close();
				//ImagesZoom.close();
			}
		},
		//单个触碰移动时移动图片
		_move: function(e){
			var self = this,
				pageX = getPage(e, "pageX"), //获取移动坐标
				pageY = getPage(e, "pageY");

			// 禁止默认事件
			// e.preventDefault();
			// e.stopPropagation();

			// 获得移动距离
			self.distX = (pageX - self.basePageX) + self.newX;
			self.distY = (pageY - self.basePageY) + self.newY;
			
			//根据移动距离不同情况来计算出X轴需要移动的距离
			if(self.distX > 0){
				self.moveX = Math.round(self.distX/self.buffMove);
			}else if( self.distX<=0 && self.distX>=-self.width ){
				self.moveX = self.distX;
			}else if(self.distX < -self.width ){
				self.moveX = -self.width+Math.round((self.distX+self.width)/self.buffMove);
			}
			self.movePos();
			self.finger = false;
		},
		// 更新地图信息
		_changeData: function(){
			this.mapX     = this.element.offsetWidth; 	  //地图宽度
			this.mapY     = this.element.offsetHeight;      //地图高度
			// this.outDistY = (this.mapY - this.wrapY)/2; //当图片高度超过屏幕的高度时候。图片是垂直居中的，这时移动有个高度做为缓冲带
			this.width    = this.mapX - this.wrapX;   //地图的宽度减去可视区域的宽度
			this.height   = this.mapY - this.wrapY;   //地图的高度减去可视区域的高度
		},// 获取最新两个触控点之间的距离及中点坐标
		getTouchDist: function(e){
			var x1 = 0,
				y1 = 0,
				x2 = 0,
				y2 = 0,
				x3 = 0,
				y3 = 0,
				result = {};
			//只获取最新（最后触碰屏幕）的两个触控点的相关信息
			x1 = e.touches[0].pageX;
			x2 = e.touches[1].pageX;
			y1 = e.touches[0].pageY - document.body.scrollTop;
			y2 = e.touches[1].pageY - document.body.scrollTop;
			
			//两个触控点有一个的pageX为空或为0则返回
			if(!x1 || !x2) return;
			
			//获取两个触控点横向（X轴）距离的中间位置X坐标
			if(x1<=x2){
				x3 = (x2-x1)/2+x1;
			}else{
				x3 = (x1-x2)/2+x2;
			}
			//获取两个触控点纵向（Y轴）距离的中间位置Y坐标
			if(y1<=y2){
				y3 = (y2-y1)/2+y1;
			}else{
				y3 = (y1-y2)/2+y2;
			}
			
			//Math.round(x) 把x四舍五入
			//math.sqrt(x)  返回x的平方根
			//Math.pow(x,y) 返回x的y次幂
			result = {
				dist: Math.round(Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2))),   //获得触控点之间的距离
				x: Math.round(x3),                                                  //获得触控点之间的中点的横坐标
				y: Math.round(y3)												    //获得触控点之间的中点的纵坐标
			};
			return result;
		},
		// 图片缩放
		_zoom: function(e){
			var self = this;
			// e.preventDefault();
			// e.stopPropagation();

			var nowFingerDist = self.getTouchDist(e).dist, //获得当前长度
				ratio 		  = nowFingerDist / self.startFingerDist, //计算缩放比
				imgWidth  	  = Math.round(self.mapX * ratio), //计算图片宽度
				imgHeight 	  = Math.round(self.mapY * ratio); //计算图片高度

			// 计算图片新的坐标
			self.imgNewX = Math.round(self.startFingerX * ratio - self.startFingerX - self.newX * ratio);
			self.imgNewY = Math.round((self.startFingerY * ratio - self.startFingerY)/2 - self.newY * ratio);

			if(imgWidth >= self.imgBaseWidth){
				self.element.style.width = imgWidth + "px";
				self.refresh(-self.imgNewX, -self.imgNewY, "0s", "ease");
				self.finger = true;	
			}else{
				//不能缩小
				if(imgWidth < self.imgBaseWidth){
					self.element.style.width = self.imgBaseWidth + "px";
				}
			}

			self.finger = true;
		},
		// 移动坐标
		movePos: function(){
			var self = this;
			
			//self.height=self.mapY - self.wrapY  
			//<0代表图片高度没有超过可视区域的高度
			if(self.height<0){
				//如果offsetWidth等于imgBaseWidth，代表没有缩放
				if(self.element.offsetWidth == self.imgBaseWidth){
					self.moveY = Math.round(self.distY/self.buffMove);
				}else{
					var moveTop = Math.round((self.element.offsetHeight-self.imgBaseHeight)/2);
					self.moveY = -moveTop + Math.round((self.distY + moveTop)/self.buffMove);
				}
			}else{
				var a = Math.round((self.wrapY - self.imgBaseHeight)/2),
					b = self.element.offsetHeight - self.wrapY + Math.round(self.wrapY - self.imgBaseHeight)/2;

				if(self.distY >= -a){
					self.moveY = Math.round((self.distY + a)/self.buffMove) - a;
				}else if(self.distY <= -b){
					self.moveY = Math.round((self.distY + b)/self.buffMove) - b;
				}else{
					self.moveY = self.distY;
				}
			}
			//当右边滑动距离超过图片边缘一定距离时下一张图片
			if(self.moveX<self.wrapX-self.element.offsetWidth-2){
				if(!self.isFinish){
					self.isFinish=true;
					swiper2.slideNext();
					
					setTimeout(function(){self.isFinish=false;},400);
				}
			//当左边边滑动距离超过图片边缘一定距离时上一张图片
			}else if(self.moveX>2){
				if(!self.isFinish){
					self.isFinish=true;
					swiper2.slidePrev();
					
					setTimeout(function(){self.isFinish=false;},400);
				}
			}else{
				self.refresh(self.moveX, self.moveY, "0s", "ease");
			}
		},
		// 重置数据
		reset: function(){
			var self = this,
				hideTime = ".2s";
			if(self.height<0){
				self.newY = -Math.round(self.element.offsetHeight - self.imgBaseHeight)/2;
			}else{
				var a = Math.round((self.wrapY - self.imgBaseHeight)/2),
					b = self.element.offsetHeight - self.wrapY + Math.round(self.wrapY - self.imgBaseHeight)/2;

				if(self.distY >= -a){
					self.newY = -a;
				}else if(self.distY <= -b){
					self.newY = -b;
				}else{
					self.newY = self.distY;
				}
			}
			self.refresh(self.newX, self.newY, hideTime, "ease-in-out");
		},
		// 执行图片移动 
		refresh: function(x, y, timer, type){
			this.element.style.webkitTransitionProperty = "-webkit-transform";
			this.element.style.webkitTransitionDuration = timer;
			this.element.style.webkitTransitionTimingFunction = type;
			this.element.style.webkitTransform = getTranslate(x, y);
		},
		// 重置坐标数据
		_destroy: function(){
			this.distX = 0;
			this.distY = 0;
			this.newX  = 0;
			this.newY  = 0;
		}
	};	
})(this);


