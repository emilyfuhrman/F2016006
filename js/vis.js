var init = function(){

	return {

		data:{},
		data_display:null,

		//default mode
		mode:0,
		modes:[
			'math',
			'science'
		],

		//holds any selected filters
		filters:[],

		w:window.innerWidth,
		h:window.innerHeight,

		hex_file_w:30,
		hex_file_h:30,
		hex_w:30,
		hex_h:26,
		hex_sideLength:15,

		colors:[
			'#3366cc',
			'#85B800'
		],

		//path_hex:"M0,15L7.5,2h15L30,15l-7.5,13h-15L0,15z",

		getData:function(_callback){
			var datasets = ['math','science'];
			datasets.forEach(function(d){
				d3.csv('data/dummy_full_' +d +'.csv',function(e,_d){
					self.data[d] = _d;
					datasets = datasets.filter(function(__d){ return __d !== d; });
					if(datasets.length === 0){
						_callback();
					}
				});
			});
		},
		processData:function(){

			//make rating into number
			//create position placeholders
			self.modes.forEach(function(d){
				self.data[d].forEach(function(_d){
					_d.rating = +_d.rating;

					_d.pos = {};
					_d.pos.cube  = {};
					_d.pos.pixel = {};
				});
				self.data[d].sort(function(a,b){
					return d3.descending(a.rating,b.rating);
				});
			});

			self.generate();
		},
		filterData:function(){
			return self.data[self.modes[self.mode]];
		},

		//thanks for all the help, http://www.redblobgames.com/grids/hexagons/!
		generate:function(){
			self.w = window.innerWidth;
			self.h = window.innerHeight;

			self.svg = d3.select('#container').selectAll('svg.vis')
				.data([self]);
			self.svg.enter().append('svg')
				.classed('vis',true);
			self.svg
				.style('background',self.colors[self.mode]);
			self.svg
				.on('click',function(){
					form_hide();
				});
			self.svg.exit().remove();

			//grab all annotation elements
			self.anno_comment = d3.select('#comment');
			self.anno_userDetail = d3.select('#anno #detail #user');
			self.anno_tweet = d3.select('#anno #detail #twitter');

			//grab forms and inputs
			self.form = d3.select('#form')
				.classed('hidden',true)
				.style('left',self.w/2 -250 +'px')
				.style('top','150px')
				;
			self.form_tweet = d3.select('#form_tweet')
				.classed('hidden',true)
				.style('left',self.w/2 -250 +'px')
				.style('top','150px');

			//grab buttons, add click handlers
			self.mode_switch = d3.select('#menu .btn#mode').on('click',function(){
				d3.event.stopPropagation();
				filters_clear();
				
				self.mode = 1 -self.mode;
				self.generate();
			});
			self.add = d3.select('#menu .btn#add').on('click',function(){
				d3.event.stopPropagation();
				form_show();
			});
			self.form_submit = d3.select('#form #submit').on('click',function(){
        		d3.event.preventDefault();
				d3.event.stopPropagation();
				form_submit();
			});
			self.form_submit = d3.select('#submit_tweet').on('click',function(){
        		d3.event.preventDefault();
				d3.event.stopPropagation();
				form_submit_tweet();
			});

			//grab buttons (filters), add click handlers
			self.btn_filters = d3.selectAll('.btn.filter').on('click',function(){
				d3.event.stopPropagation();

				var btn = d3.select(this),
					btn_id = btn.attr('id'),
					btn_selected = btn.classed('selected');

				if(self.filters.indexOf(btn_id) <0){
					self.filters.push(btn_id);
				} else{
					self.filters = self.filters.filter(function(d){ return d !== btn_id; });
				}

				self.btn_filters_clear.classed('visible',true);
				btn
					.classed('selected',!btn_selected)
					.style('color',function(){ return btn_selected ? 'white' : self.colors[self.mode]; });
			});
			self.btn_filters_clear = d3.select('#clear').on('click',function(){
				d3.event.stopPropagation();
				filters_clear();
			});

			//update all mode spans to reflect current mode
			d3.select('#title .mode').text(util_toTitleCase(self.modes[self.mode]));
			d3.select('#form .mode').text(self.modes[self.mode]);

			//update switch button to reflect opposite mode
			d3.select('#menu span.mode_opp').text(self.modes[1 -self.mode]);

			//**TODO -- determine number of rings to calculate positions for

			//**TODO -- determine how to size hexagons in order for the group to fit nicely on a screen

			//**TODO -- calculate correct radius for hexagon group
			var hex_rad = 8,
				hex_rad_hov = hex_rad*2.25;

			//INITIALIZE VARIABLES
			//this is just used to neatly generate a hexagon path
			var hexbin = d3.hexbin();
			var hexTTG,
				hexTTback,
				hexTT;
			var hexG,
				hexesG,
				hexes;

			//INITIALIZE FUNCTIONS
			//convert cube coordinates to pixel coordinates
			function util_cubeToPix(_cube){
				var obj = {};
				var s = hex_rad;

				obj.x = s * Math.sqrt(3) * (_cube.x +_cube.z/2);
				obj.y = s * 3/2 * _cube.z;

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

			//thank you, http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
			function util_toTitleCase(_str){
			    return _str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
			}

			function util_resolveGender(_g){
				return _g.toLowerCase() === 'f' ? 'Female' : 'Male';
			}

			function detail_update(_d){
				var str_comment = '&ldquo;' +_d.comment +'&rdquo;',
					str_userDetail = 'Grade ' +_d.grade +' rating: ' +_d.rating +'/5 &#124; ' +util_resolveGender(_d.gender) +', ' +_d.age +', ' +_d.location;
				self.anno_comment.html(str_comment);
				self.anno_userDetail.html(str_userDetail);
			}
			function detail_clear(){
				var str_userDetail = 'Hover over a hexagon for detail.'
				self.anno_comment.html('');
				self.anno_userDetail.html(str_userDetail);
				self.anno_tweet.html('');
			}

			function filters_clear(){
				self.filters = [];

				self.btn_filters_clear.classed('visible',false);
				self.btn_filters
					.classed('selected',false)
					.style('color','white')
					;
			}

			function form_show(){
				self.form.classed('hidden',false);
			}
			function form_clear(){

			}
			function form_hide(){
				self.form.classed('hidden',true);
				self.form_tweet.classed('hidden',true);
			}
			function form_submit(){
				self.form.classed('hidden',true);
				self.form_tweet.classed('hidden',false);
			}
			function form_submit_tweet(){
				self.form_tweet.classed('hidden',true);
			}

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
			self.data[self.modes[self.mode]].forEach(function(d,i){
				d.pos.pixel = util_cubeToPix(cube_coords[i]);
			});

			self.data_display = self.filters.length === 0 ? self.data[self.modes[self.mode]] : self.filterData();

			hexG = self.svg.selectAll('g.hexG')
				.data([self.data_display]);
			hexG.enter().append('g')
				.classed('hexG',true);
			hexG
				.attr('transform','translate(' +self.w/2 +',' +self.h/2 +')rotate(90)')
				;
			hexG
				.on('mouseout',function(d){
					hexTTG.classed('hidden',true);
					detail_clear();
				});
			hexG.exit().remove();
			hexesG = hexG.selectAll('g.hexesG')
				.data(function(d){ return d; });
			hexesG.enter().append('g')
				.classed('hexesG',true);
			hexesG
				.attr('transform',function(d,i){
					var x = d.pos.pixel.x ? d.pos.pixel.x : 0,
						y = d.pos.pixel.y ? d.pos.pixel.y : 0;
					return 'translate(' +x +',' +y +')';
				});
			hexesG.exit().remove();
			hexes = hexesG.selectAll('path.hex')
				.data(function(d){ return [d]; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',hexbin.hexagon(hex_rad))
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){
					return d.rating/5;
				});
			hexes
				.on('mousemove',function(d){
					var x = d.pos.pixel.x ? d.pos.pixel.x : 0,
						y = d.pos.pixel.y ? d.pos.pixel.y : 0;
					var o = d.rating/5;
					hexTTG
						.classed('hidden',false)
						.attr('transform',function(){
							return 'translate(' +x +',' +y +')';
						});
					hexTT
						.style('fill-opacity',o);
					detail_update(d);
				});
			hexes.exit().remove();

			//create tooltip group
			hexTTG = hexG.selectAll('g.hexTTG')
				.data([self.data_display]);
			hexTTG.enter().append('g')
				.classed('hexTTG',true);
			hexTTG
				.classed('hidden',true);
			hexTTG.exit().remove();
			hexTTback = hexTTG.selectAll('path.hexTTback')
				.data(function(d){ return [d]; });
			hexTTback.enter().append('path')
				.classed('hexTTback',true);
			hexTTback
				.attr('d',hexbin.hexagon(hex_rad_hov))
				.style('fill',self.colors[self.mode])
				;
			hexTTback.exit().remove();
			hexTT = hexTTG.selectAll('path.hexTT')
				.data(function(d){ return [d]; });
			hexTT.enter().append('path')
				.classed('hexTT',true);
			hexTT
				.attr('d',hexbin.hexagon(hex_rad_hov))
				.style('stroke',self.colors[self.mode]);
			hexTT.exit().remove();
		},

		resize:function(){
			//**TODO
		}
	}
}

var self = init();
self.getData(self.processData);