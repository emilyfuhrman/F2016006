var init = function(){

	return {

		data:{},
		data_display:null,

		device:'default',
		device_dimensions:{
			'default':{
				w:1440,
				h:900
			},
			'tablet':{
				w:640,
				h:960
			},
			'mobile':{
				w:480,
				h:640
			}
		},

		//default mode
		mode:0,
		modes:[
			'math',
			'science'
		],

		//holds any selected filters
		filters:[],

		buckets_age:[
			'<18',
			'18-33',
			'34-49',
			'50-65',
			'>65'
		],
		buckets_gender:[
			'M',
			'F'
		],
		buckets_country:[],
		buckets_grade:d3.range(1,13),

		state_grade:0,

		col_w:0,

		m:false,

		hex_file_w:30,
		hex_file_h:30,
		hex_w:30,
		hex_h:26,
		hex_sideLength:15,

		colors:[
			'#4a78cf',
			'#85B800'
		],
		colors_legend:[
			'#3366CC',
			'#71A400'
		],

		getData:function(_callback){
			var datasets = ['math','science','dummy_sample_math','dummy_sample_science'];
			datasets.forEach(function(d){
				d3.csv('data/' +d +'.csv',function(e,_d){
					self.data[d] = _d;
					datasets = datasets.filter(function(__d){ return __d !== d; });
					if(datasets.length === 0){
						_callback();
					}
				});
			});
		},
		processData:function(){

			function util_resolveBucket(_n){
				var bucket;
				if(_n <18){
					bucket = 0;
				} else if(_n >=18 && _n <=33){
					bucket = 1;
				} else if(_n >=34 && _n <=49){
					bucket = 2;
				} else if(_n >=50 && _n <=65){
					bucket = 3;
				} else if(_n >65){
					bucket = 4;
				}
				return bucket;
			}

			//create position placeholders
			self.modes.forEach(function(d){
				self.data[d].forEach(function(_d){
					_d.rating = +_d.rating;
					_d.age = +_d.age;

					_d.age_bucket = util_resolveBucket(_d.age);

					_d.pos = {};
					_d.pos.cube  = {};
					_d.pos.pixel = {};
				});
				self.data[d].sort(function(a,b){
					return d3.descending(a.rating,b.rating);
				});
				self.data['dummy_sample_' +d].forEach(function(_d){
					_d.rating = +_d.rating;
					_d.age = +_d.age;

					_d.age_bucket = util_resolveBucket(_d.age);
				});
				self.data['dummy_sample_' +d].sort(function(a,b){
					return d3.descending(a.rating,b.rating);
				});
			});

			//**TODOS -- create all datasets here, access them in filterData();
			//create gender dataset

			//create grades dataset

			//create countries dataset

			//create gender-countries dataset

			//create gender-grades dataset

			self.generate();
		},
		filterData:function(){
			var d, f, b;
			if(self.filters.length === 0){
				d = self.data[self.modes[self.mode]];
				self.col_w = 0;
			} else{
				d = {};

				//get top countries, for buckets
				function util_getTopCountries(){
					var arr_countries = {};
					var data = self.data['dummy_sample_' +self.modes[self.mode]];
					for(var i=0; i<data.length; i++){
						if(!arr_countries[data[i].country]){
							arr_countries[data[i].country] = 0;
						}
						arr_countries[data[i].country]++;
					}
					var arr_countries_sorted = d3.entries(arr_countries).sort(function(a,b){ return b.value -a.value; });

					//clear out array
					self.buckets_country = [];

					for(var i=0; i<5; i++){
						if(arr_countries_sorted[i]){
							self.buckets_country.push(arr_countries_sorted[i].key);
						}
					}
				}

				util_getTopCountries();

				if(self.filters.length === 1){
					f = self.filters[0];
					b = self['buckets_' +f];

					if(f === 'grade'){
						var s = self.state_grade === 0 ? 0 : 6,
							e = self.state_grade === 0 ? 6 : 12;
						b = b.slice(s,e);
					}

					//set width of buckets
					self.col_w = Math.floor((self.w -self.w*0.25)/b.length);

					b.forEach(function(_b){
						d[_b] = [];
					});
					self.data['dummy_sample_' +self.modes[self.mode]].forEach(function(_d){
						if(d[_d[f]]){ 
							_d.idx = d3.keys(d).indexOf(_d[f]);
							d[_d[f]].push(_d); 
						}
					});

					//convert back to array
					d = d3.entries(d);
					d.forEach(function(_d){ 
						_d.value = _d.value.sort(function(a,b){ 
							if(a.rating === b.rating){
								return b.age_bucket -a.age_bucket;
							}
							return b.rating -a.rating; 
						});
					});
				} else{
					f = self.filters.filter(function(d){ return d !== 'gender'; })[0];
					b = self['buckets_' +f];

					if(f === 'grade'){
						var s = self.state_grade === 0 ? 0 : 6,
							e = self.state_grade === 0 ? 6 : 12;
						b = b.slice(s,e);
					}

					//set width of buckets
					self.col_w = Math.floor((self.w -self.w*0.25)/b.length);

					b.forEach(function(_b){
						d[_b] = [];
						d[_b].push([]); //array -- M
						d[_b].push([]); //array -- F
					});
					self.data['dummy_sample_' +self.modes[self.mode]].forEach(function(_d){
						if(d[_d[f]]){ 
							var arr_g = _d.gender === 'M' ? 0 : 1;
							_d.idx = d3.keys(d).indexOf(_d[f]);
							_d.idx_g = arr_g;
							d[_d[f]][arr_g].push(_d); 
						}
					});

					//convert back to array
					d = d3.entries(d);
					d.forEach(function(_d){ 
						_d.value.forEach(function(__d){
							__d = __d.sort(function(a,b){ 
								if(a.rating === b.rating){
									return b.age_bucket -a.age_bucket;
								}
								return b.rating -a.rating; 
							});
						});
					});
				}
			}
			return d;
		},

		setup:function(){

			self.device = self.util_resolve_device(window.innerWidth);

			self.w = self.device_dimensions[self.device].w;
			self.h = self.device_dimensions[self.device].h;

			//<svg id='map' viewBox='0 0 1436 782' preserveAspectRatio='xMidYMid meet'></svg>
			self.svg = d3.select('#container').selectAll('svg.vis')
				.data([self]);
			self.svg.enter().append('svg')
				.classed('vis',true);
			self.svg
				.attr('viewBox','0 0 1440 900')
				.attr('preserveAspectRatio','xMidYMid meet')
				.style('background',self.colors[self.mode])
			self.svg
				.on('click',function(){
					self.util_form_hide();
				});
			self.svg.exit().remove();

			//grab all annotation elements
			self.anno_comment = d3.select('#comment');
			self.anno_userDetail = d3.select('#anno #detail #user');
			self.anno_tweet = d3.select('#anno #detail #twitter');

			//grab arrows
			self.arrows = d3.selectAll('.arrow').on('click',function(){
				d3.event.stopPropagation();
				self.state_grade === 0 ? self.state_grade++ : self.state_grade--;
				self.arrows.classed('visible',function(d,i){
					return i !== self.state_grade;
				});

				self.generate();
			});

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

			//grab form buttons, add click handlers
			self.form_submit = d3.select('#form #submit').on('click',function(){
        		d3.event.preventDefault();
				d3.event.stopPropagation();
				self.util_form_submit();
			});
			self.form_submit_tweet = d3.select('#submit_tweet').on('click',function(){
        		d3.event.preventDefault();
				d3.event.stopPropagation();
				self.util_form_submit_tweet();
			});

			//grab navigation buttons, add click handlers
			self.mode_switch = d3.select('#menu .btn#mode').on('click',function(){
				d3.event.stopPropagation();
				self.util_filters_clear();
				self.mode = 1 -self.mode;
				self.generate();
			});
			self.add = d3.select('#menu .btn#add').on('click',function(){
				d3.event.stopPropagation();
				self.util_form_show();
			});

			//grab legend
			var legend_g,
				legend_g_txt;
			self.legend = d3.select('.nav#legend')
				.on('mousemove',function(){
					d3.select('#legend #legend_tab').html('&dArr; Hide legend');
					self.legend.classed('show',true);
				})
				.on('mouseout',function(){
					d3.select('#legend #legend_tab').html('&#10595; View legend');
					self.legend.classed('show',false);
				});
			self.legend_comps = self.legend.selectAll('.comp')
				.style('background',self.colors_legend[self.mode]);
			self.legend_body = d3.select('#legend_body').selectAll('svg.legend')
				.data([self]);
			self.legend_body.enter().append('svg')
				.classed('legend',true);
			self.legend_body.exit().remove();
			self.legend_g = self.legend_body.selectAll('g.legend_g')
				.data([[6,7],[1,2,3,4,5]]);
			self.legend_g.enter().append('g')
				.classed('legend_g',true);
			self.legend_g
				.classed('show',function(d,i){
					return i === 0;
				})
				.attr('transform',function(d,i){
					var x = i*180 +24,
						y = 30;
					return 'translate(' +x +',' +y +')';
				});
			self.legend_g.exit().remove();
			legend_g_txt = self.legend_g.selectAll('text.legend_g_txt')
				.data(function(d){ return [d]; });
			legend_g_txt.enter().append('text')
				.classed('legend_g_txt',true);
			legend_g_txt
				.attr('x',function(d){
					return d.length === 2 ? -9 : -5;
				})
				.attr('y',45)
				.text(function(d){
					return d.length === 2 ? 'Hexagon shading: rating' : 'Hexagon size: age';
				});
			legend_g_txt.exit().remove();

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
				if(self.filters.length === 0){
					self.util_filters_clear();
				} else{
					self.btn_filters_clear.classed('visible',true);

					self.legend.classed('expanded',true);
					self.legend_g.classed('show',true);

					d3.select('#sampled').classed('visible',true);
				}

				//deactivate proper filter
				//if button is just being selected, deactivate incompatible filter
				if(btn_id !== 'gender' && !btn_selected){
					if(btn_id === 'country'){
						d3.select('.btn.filter#grade').classed('deactivated',true);
					} else if(btn_id === 'grade'){
						d3.select('.btn.filter#country').classed('deactivated',true);
					}
				//if button is being deselected, reactivate incompatible filter
				} else if(btn_id !== 'gender' && btn_selected){
					if(btn_id === 'country'){
						d3.select('.btn.filter#grade').classed('deactivated',false);
					} else if(btn_id === 'grade'){
						d3.select('.btn.filter#country').classed('deactivated',false);
					}
				}

				if(self.filters.filter(function(d){ return d === 'grade'; }).length >0){
					self.arrows.classed('visible',function(d,i){
						return i !== self.state_grade;
					});
				} else{
					self.arrows.classed('visible',false);
				}

				btn
					.classed('selected',!btn_selected)
					.style('color',function(){ return btn_selected ? 'white' : self.colors[self.mode]; });

				self.generate();
			});
			self.btn_filters_clear = d3.select('#clear').on('click',function(){
				d3.event.stopPropagation();
				self.util_filters_clear();
				self.generate();
			});
		},

		//thanks for all the help, http://www.redblobgames.com/grids/hexagons/!
		generate:function(){
			//self.w = window.innerWidth;
			//self.h = window.innerHeight;
			
			self.svg.style('background',(self.colors[self.mode]));
			self.legend_body.style('background',self.colors_legend[self.mode]);
			self.legend_comps.style('background',self.colors_legend[self.mode]);

			//update all mode spans to reflect current mode
			d3.select('#title .mode').text(util_toTitleCase(self.modes[self.mode]));
			d3.select('#form .mode').text(self.modes[self.mode]);

			//update sample span to reflect sample data, if applicable
			d3.select('#sampled .sample').text(function(){
				return self.filters.length >0 ? 5 : 0;
			});

			//update switch button to reflect opposite mode
			d3.select('#menu span.mode_opp').text(self.modes[1 -self.mode]);

			//**TODO -- determine number of rings to calculate positions for

			//**TODO -- determine how to size hexagons in order for the group to fit nicely on a screen

			//**TODO -- calculate correct radius for hexagon group
			var hex_rad = 8,
				hex_rad_hov = hex_rad*2.25;
			var hex_row_height = Math.floor((self.h/4)/hex_rad);

			//INITIALIZE VARIABLES
			//this is just used to neatly generate a hexagon path
			var hexbin = d3.hexbin();
			var hexTTG,
				hexTTback,
				hexTT;
			var hexG,
				hexesG,
				hexesGT,
				hexesGG,
				hexesGGT,
				hexes;

			var scale_age = d3.scale.linear()
				.domain([0,self.buckets_age.length -1])
				.range([2,hex_rad]);

			//update legend
			var legend_hexes;
			legend_hexes = self.legend_g.selectAll('path.legend_hex')
				.data(function(d,i){ return d; });
			legend_hexes.enter().append('path')
				.classed('legend_hex',true);
			legend_hexes
				.attr('d',function(d,i){
					return d >5 ? hexbin.hexagon(hex_rad) : hexbin.hexagon(scale_age(d));
				})
				.attr('transform',function(d,i){
					var x = d >5 ? i*120 : i*30,
						y = 0;
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('fill-opacity',function(d,i){
					return d >5 ? ((d-6)*5)/5 : 1;
				});
			legend_hexes.exit().remove();

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
				.attr('transform','translate(' +self.w/2 +',' +self.h/2 +')')
				;
			hexG
				.on('mouseout',function(d){
					hexTTG.classed('hidden',true);
					self.util_detail_clear();
				});
			hexG.exit().remove();
			hexesG = hexG.selectAll('g.hexesG')
				.data(function(d,i){ return d; });
			hexesG.enter().append('g')
				.classed('hexesG',true);
			hexesG
				.attr('transform',function(d,i){
					var x = d.pos && d.pos.pixel ? d.pos.pixel.y : i*self.col_w -self.w/2 +self.w*0.125,
						y = d.pos && d.pos.pixel ? d.pos.pixel.x : -self.h*0.25;
					return 'translate(' +x +',' +y +')';
				});
			hexesG.exit().remove();
			hexesGT = hexesG.selectAll('text.hexesGT')
				.data(function(d,i){ return [d]; });
			hexesGT.enter().append('text')
				.classed('hexesGT',true);
			hexesGT
				.attr('transform',function(d,i){
					var x = 0,
						y = hex_row_height*(hex_rad*2) -hex_rad*2;
					return 'translate(' +x +',' +y +')';
				})
				.text(function(d){ 
					var str = self.filters.length === 0 ? '' : d.key;
					return str;
				});
			hexesGT.exit().remove();
			hexesGG = hexesG.selectAll('g.hexesGG')
				.data(function(d,i){ return self.filters.length === 2 ? d.value : [d]; });
			hexesGG.enter().append('g')
				.classed('hexesGG',true);
			hexesGG
				.attr('transform',function(d,i){
					var x = i*(hex_rad*8),
						y = 0;
					return 'translate(' +x +',' +y +')';
				});
			hexesGG.exit().remove();
			hexesGGT = hexesGG.selectAll('text.hexesGGT')
				.data(function(d,i){ return self.filters.length === 2 ? [d] : []; });
			hexesGGT.enter().append('text')
				.classed('hexesGGT',true);
			hexesGGT
				.attr('transform',function(d){
					var x = 0,
						y = hex_row_height*(hex_rad*2) +hex_rad*2;
					return 'translate(' +x +',' +y +')';
				})
				.text(function(d,i){ return d[0].gender; });
			hexesGGT.exit().remove();
			hexes = hexesGG.selectAll('path.hex')
				.data(function(d,i){ return self.filters.length === 0 ? [d] : self.filters.length === 1 ? d.value : d; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',function(d){
					return self.filters.length === 0 ? hexbin.hexagon(hex_rad) : hexbin.hexagon(scale_age(d.age_bucket));
				})
				.attr('transform',function(d,i){
					var x = self.filters.length === 0 ? 0 : Math.floor(i/hex_row_height)*(hex_rad*1.5),
						y = self.filters.length === 0 ? 0 : (i%hex_row_height)*(hex_rad*1.75) +(Math.floor(i/hex_row_height)%2)*(hex_rad*0.875); //why?
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){
					return d.rating/5;
				});
			hexes
				.on('mousemove',function(d,i){
					var x = self.filters.length === 0 ? d.pos.pixel.y : self.filters.length === 1 ? (d.idx*self.col_w -self.w/2 +self.w*0.125) +(Math.floor(i/hex_row_height)*(hex_rad*1.5)) : (d.idx*self.col_w -self.w/2 +self.w*0.125) +(Math.floor(i/hex_row_height)*(hex_rad*1.5)) +d.idx_g*(hex_rad*8),
						y = self.filters.length === 0 ? d.pos.pixel.x : (-self.h*0.25) +((i%hex_row_height)*(hex_rad*1.75) +(Math.floor(i/hex_row_height)%2)*(hex_rad*0.875));
					var o = d.rating/5;

					x +=self.w/2;
					y +=self.h/2;

					hexTTG
						.classed('hidden',false)
						.attr('transform',function(){
							return 'translate(' +x +',' +y +')rotate(90)';
						});
					hexTT
						.style('fill-opacity',o);
					self.util_detail_update(d);
				});
			hexes.exit().remove();

			//create tooltip group
			hexTTG = self.svg.selectAll('g.hexTTG')
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

		},

		//INTERFACE
		util_filters_clear:function(){

			self.filters = [];

			self.btn_filters_clear.classed('visible',false);
			self.btn_filters
				.classed('selected',false)
				.classed('deactivated',false)
				.style('color','white')
				;
			self.arrows.classed('visible',false);

			self.legend.classed('expanded',false);
			self.legend_g.classed('show',function(d,i){
				return i === 0;
			});

			d3.select('#sampled').classed('visible',false);
		},

		util_form_clear:function(){
		},
		util_form_hide:function(){
			self.form.classed('hidden',true);
			self.form_tweet.classed('hidden',true);
		},
		util_form_show:function(){
			self.form.classed('hidden',false);
		},
		util_form_submit:function(){
			self.form.classed('hidden',true);
			self.form_tweet.classed('hidden',false);
		},
		util_form_submit_tweet:function(){
			self.form_tweet.classed('hidden',true);
		},	

		util_detail_update:function(_d){
			var str_comment = '&ldquo;' +_d.comment +'&rdquo;',
				str_userDetail = 'Grade ' +_d.grade +' rating: ' +_d.rating +'/5 &#124; ' +self.util_resolve_gender(_d.gender) +', ' +_d.age +', ' +_d.country;
			self.anno_comment.html(str_comment);
			self.anno_userDetail.html(str_userDetail);
		},
		util_detail_clear:function(){
			var str_userDetail = 'Hover over a hexagon for detail.'
			self.anno_comment.html('');
			self.anno_userDetail.html(str_userDetail);
			self.anno_tweet.html('');
		},

		util_resolve_gender:function(_g){
			return _g.toLowerCase() === 'f' ? 'Female' : 'Male';
		},
		util_resolve_device:function(_w){
			var device = 'default';
			if(_w >self.device_dimensions.tablet.w){
				device = 'default';
			} else if(_w <=self.device_dimensions.tablet.w && _w >self.device_dimensions.mobile.w){
				device = 'tablet';
			} else if(_w <=self.device_dimensions.mobile.w){
				device = 'mobile';
			}
			return device;
		}
	}
}

var self = init();
self.setup();
self.getData(self.processData);

window.onresize = function(){
	var device = self.util_resolve_device(window.innerWidth);
	if(device !== self.device){
		console.log(self.device +'->' +device);
		self.setup();
		self.generate();
	}
}