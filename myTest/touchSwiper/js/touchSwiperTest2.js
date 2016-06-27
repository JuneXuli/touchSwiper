$(function(){
	//初始化swiper1
	var swiper1= new Swiper('#swiper1',{
		pagination: '.swiper-pagination1',
        paginationClickable: true
	});
	
	//点击图片时查看大图
	$("#swiper1 img").load(function(){
		$(this).click(function(){
			//获取swiper1活动索引
			var activeIndex=swiper1.activeIndex;
			//ImagesZoom是否已经初始化,若已经初始化则直接显示，否则调用初始化方法
			if(ImagesZoom.isInited){
				ImagesZoom.show({activeIndex:activeIndex});
			}else{
				ImagesZoom.init({
						"elem": "#swiper1",      //哪个容器下的img图片
						"swipElemId": "swiper2",      //查看图片的swiper容器id
						"activeIndex":activeIndex
				});
			}
		});
	});
});
