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

		//path_hex:"M0,15L7.5,2h15L30,15l-7.5,13h-15L0,15z",

		getData:function(_callback){
			d3.csv('data/dummy_full.csv',function(e,d){
				self.data = d;
				_callback();
			});
		},
		processData:function(){

			//make rating into number
			//set placeholder positions
			self.data.forEach(function(d){
				d.rating = +d.rating;

				d.pos = {};
				d.pos.cube = {};
				d.pos.pixel  = {};
			});
			self.data.sort(function(a,b){
				return d3.descending(a.rating,b.rating);
			});

			self.generate();
		},

		//thanks for all the help, http://www.redblobgames.com/grids/hexagons/!
		generate:function(){
			self.w = window.innerWidth;
			self.h = window.innerHeight;

			self.svg = d3.select('#container').append('svg')
				.style('background',self.colors[self.mode]);

			//**TODO
			//maximum radius of the hexagon group
			//var hex_rad = window.innerHeight/3;
			//hardcode for now
			var hex_rad = 9;

			//calculate the size an individual hexagon should be
			//based on the length of the full dataset
			function calc_hexSize(){

			}

			//convert cube coordinates to pixel coordinates
			function coords_cube_to_pix(_cube){
				var obj = {};
				var s = hex_rad;

				obj.x = _cube.x%1 === 1 ? Math.sqrt(3) * s * (_cube.z/2 +_cube.x) : -Math.sqrt(3) * s * (_cube.z/2 +_cube.y);
				obj.y = 3/2 * s * _cube.z;

				// thank you, http://stackoverflow.com/questions/2459402/hexagonal-grid-coordinates-to-pixel-coordinates?rq=1
				// y = 3/2 * s * b
				// b = 2/3 * y / s
				// x = sqrt(3) * s * ( b/2 + r)
				// x = - sqrt(3) * s * ( b/2 + g )
				// r = (sqrt(3)/3 * x - y/3 ) / s
				// g = -(sqrt(3)/3 * x + y/3 ) / s

				// r + b + g = 0

				return obj;
			}

			//this is really just for getting a hexagon path
			var hexbin = d3.hexbin().radius(hex_rad);

			//generate cube coordinates for data points
			//thank you, http://stackoverflow.com/questions/2049196/generating-triangular-hexagonal-coordinates-xyz
			var cube_coords = [];
			for(var i=0; i<50; i++){
				for(var j=-i; j<=i; j++)
				for(var k=-i; k<=i; k++)
				for(var l=-i; l<=i; l++)
					if(Math.abs(j) +Math.abs(k) +Math.abs(l) == i*2 && j +k +l == 0){
						var obj = {};
						obj.x =j;
						obj.y =k;
						obj.z =l;
						cube_coords.push(obj);
					}
			}
			//convert to pixel coordinates
			self.data.forEach(function(d,i){
				d.pos.pixel = coords_cube_to_pix(cube_coords[i]);
			});

			var hexG,
				hexmesh,
				hexes;
			hexG = self.svg.selectAll('g.hexG')
				.data([self.data]);
			hexG.enter().append('g')
				.classed('hexG',true);
			hexG
				.attr('transform','translate(' +self.w/2 +',' +self.h/2 +')rotate(90)')
				/*.attr('transform',function(){
					var x = self.w/2,
						y = self.h/2;
					return 'translate(' +x +',' +y +')';
				})*/
				;
			hexG.exit().remove();
			hexes = hexG.selectAll('path.hex')
				.data(function(d){ return d; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',hexbin.hexagon())
				.attr('transform',function(d,i){
					var x = d.pos.pixel.x ? d.pos.pixel.x : 0,
						y = d.pos.pixel.y ? d.pos.pixel.y : 0;
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