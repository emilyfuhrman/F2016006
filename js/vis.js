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
			'math':'#3366cc'
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

			//store (basic) position of each data point
			//doesn't take into account actual size; just distance from origin
			//thank you, http://www.redblobgames.com/grids/hexagons/
			/*var origin = {
				'x':window.innerWidth/2,
				'y':window.innerHeight/2
			};

			var row = 0;
			var coords = [
				{'x': 0, 'y': 1, 'z':-1},
				{'x': 1, 'y': 0, 'z':-1},
				{'x': 1, 'y':-1, 'z': 0},
				{'x': 0, 'y':-1, 'z': 1},
				{'x':-1, 'y': 0, 'z': 1},
				{'x':-1, 'y': 1, 'z': 0}
			];

			self.data.forEach(function(d,i){
				d.pos = {};

				//create deep copy
				var c = jQuery.extend(true,{},coords[i%6]);
				var f = self.hex_h;

				c.x *=f;
				c.y *=f;
				c.z *=f;

				d.pos.x = i === 0 ? origin.x : origin.x +c.x;// -(c.x*0.125);
				d.pos.y = i === 0 ? origin.y : origin.y +(c.z +(c.x + (c.x&1))/2);

				d.pos.x -=self.hex_w/2;
				d.pos.y -=self.hex_h/2;
				//console.log(d.pos);
			});*/

			self.generate();
		},
		generate:function(){
			self.w = window.innerWidth;
			self.h = window.innerHeight;

			self.svg = d3.select('#container').append('svg')
				.style('background',self.colors[self.mode]);

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
				.size([self.h,self.w])
				.radius(20);

			var hexG,
				hexmesh,
				hexes;
			hexG = self.svg.selectAll('g.hexG')
				.data([self.data]);
			hexG.enter().append('g')
				.classed('hexG',true);
			hexG
				.attr('transform','translate(' +self.w +',0)rotate(90)');
			hexG.exit().remove();
			hexmesh = hexG.selectAll('path.hexmesh')
				.data([self.data]);
			hexmesh.enter().append('path')
				.classed('hexmesh',true);
			hexmesh
				.attr('d',hexbin.mesh);
			hexmesh.exit().remove();
			hexes = hexG.selectAll('path.hex')
				.data(function(d){ return d; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',hexbin.hexagon())
				.attr('transform',function(d,i){
					return 'translate(' +d +')';
				})
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){
					return d.rating/5;
				});
			hexes.exit().remove();
		}
	}
}

var self = init();
self.getData(self.processData);