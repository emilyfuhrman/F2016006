var init = function(){

	return {

		data:null,

		mode:'math',

		w:window.innerWidth,
		h:window.innerHeight,

		hex_file_w:30,
		hex_file_h:30,
		hex_w:30,
		hex_h:26,
		hex_sideLength:15,

		colors:{
			'math':'#3366cc',
			'science':'#85B800'
		},

		path_hex:"M0,15L7.5,2h15L30,15l-7.5,13h-15L0,15z",

		getData:function(_callback){
			d3.csv('data/dummy_full.csv',function(e,d){
				self.data = d;
				_callback();
			});
		},
		processData:function(){

			//make rating into number
			self.data.forEach(function(d){
				d.rating = +d.rating;
			});
			self.data.sort(function(a,b){
				return d3.descending(a.rating,b.rating);
			});

			self.generate();
		},
		generate:function(){
			self.w = window.innerWidth;
			self.h = window.innerHeight;

			self.svg = d3.select('#container').append('svg')
				.style('background',self.colors[self.mode]);

			//**TODO
			//maximum radius of the hexagon group
			//var max_vis_r = window.innerHeight/3;

			//calculate the size an individual hexagon should be
			//based on the length of the full dataset
			function calc_hexsize(){

			}

			var origin = {
				'x':window.innerWidth/2,
				'y':window.innerHeight/2
			};
			var hexbin = d3.hexbin()
				//.size([self.h,self.w])
				.size([self.w*0.8,self.h*0.75])
				.radius(12);
			var hexbin_pos = hexbin.centers();

			//**TODO sort hex data into spiral
			
			var hexbin_med_x = hexbin_pos[Math.floor(hexbin_pos.length/3)][0],//d3.median(hexbin_pos,function(d){ return d[0]; }),	//center hexagon, x-value
				hexbin_med_y = hexbin_pos[Math.floor(hexbin_pos.length/3)][1];//d3.median(hexbin_pos,function(d){ return d[1]; });	//center hexagon, y-value

			//hexify data
			self.data.forEach(function(d,i){
				d.pos = {};
				d.pos.x = i === 0 ? hexbin_med_x : hexbin_pos[i][0];
				d.pos.y = i === 0 ? hexbin_med_y : hexbin_pos[i][1];
			});

			//spiral, from http://www.redblobgames.com/grids/hexagons/#rings
			// function cube_spiral(center, radius):
			//     var results = [center]
			//     for each 1 ≤ k ≤ radius:
			//         results = results + cube_ring(center, k)
			//     return results

			var hexG,
				hexmesh,
				hexes;
			hexG = self.svg.selectAll('g.hexG')
				.data([self.data]);
			hexG.enter().append('g')
				.classed('hexG',true);
			/*hexG
				.attr('transform','translate(' +self.w +',0)rotate(90)');*/
			hexG.exit().remove();
			/*hexmesh = hexG.selectAll('path.hexmesh')
				.data(function(d){ return [d]; });
			hexmesh.enter().append('path')
				.classed('hexmesh',true);
			hexmesh
				.attr('d',hexbin.mesh);
			hexmesh.exit().remove();*/
			hexes = hexG.selectAll('path.hex')
				.data(function(d){ return d; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',hexbin.hexagon())
				.attr('transform',function(d,i){
					var x = d.pos.x +(self.w*0.1),
						y = d.pos.y +(self.h*0.125);
					return 'translate(' +x +',' +y +')';
				})
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){
					return d.rating/5;
				});
			hexes.exit().remove();
		},
		resize:function(){
			//**TODO
		}
	}
}

var self = init();
self.getData(self.processData);