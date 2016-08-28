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
				w:768,
				h:1024
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

		//array(s) for unique values
		unique_countries:[],

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
		buckets_grade:[
			'Grades 1-5',
			'Grades 6-8',
			'Grades 9-12',
			'College'
		],
		buckets_rating:{
			'1':'LOVE',
			'2':'LIKE',
			'3':'OK',
			'4':'DISLIKE',
			'5':'HATE'
		},

		m:false,

		hex_file_w:30,
		hex_file_h:30,
		hex_sideLength:15,

		path_legend:"M0,130.9V34.7c0-6.4,0-11.6,0-11.5c0,0,0-5.2,0-11.5S5.2,0,11.6,0 h76.3c6.4,0,11.6,5.2,11.6,11.5c0,0.2,0,16.3,0,16.5c0.3,6.1,5.4,11,11.6,11h53c6.4,0,11.6,5.2,11.6,11.6v80.3",
		path_legend_exp:"M0,130.9V34.7c0-6.4,0-11.6,0-11.5c0,0,0-5.2,0-11.5S5.2,0,11.6,0H88 c6.4,0,11.6,5.2,11.6,11.5c0,0.2,0,16.3,0,16.5c0.3,6.1,5.4,11,11.6,11h233.8c6.4,0,11.6,5.2,11.6,11.6v80.2",

		//mobile comments visible?
		comments_on:false,

		colors:[
			'#4a78cf',
			'#85B800'
		],
		colors_legend:[
			'#295ccc',
			'#67a400'
		],

		getData:function(_callback){
			var datasets = ['math','science','dummy_sample_math','dummy_sample_science','countries'];
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

			//create position placeholders
			self.modes.forEach(function(d){
				self.data[d].forEach(function(_d){
					_d.rating = +_d.rating;
					_d.age = +_d.age;

					_d.age_bucket = self.util_resolve_age(_d.age);
					_d.grade_bucket = self.util_resolve_grade(_d.grade);

					_d.pos = {};
				});
				self.data[d].sort(function(a,b){
					return d3.descending(a.rating,b.rating);
				});
				self.data['dummy_sample_' +d].forEach(function(_d){
					_d.rating = +_d.rating;
					_d.age = +_d.age;

					_d.age_bucket = self.util_resolve_age(_d.age);
					_d.grade_bucket = self.util_resolve_grade(_d.grade);
				});
				self.data['dummy_sample_' +d].sort(function(a,b){
					return d3.descending(a.rating,b.rating);
				});
			});

			//create unique countries dataset
			self.util_get_unique_countries();

			self.generate();
		},
		filterData:function(){
			var d, f, b, r;

			r = 0;
			d = {};

			//if only one filter is selected
			if(self.filters.length === 1){
				f = self.filters[0];
				f = f === 'grade' ? 'grade_bucket' : f;

				//get buckets that correspond to filter
				b = self[(f === 'grade_bucket' ? 'buckets_grade' : 'buckets_' +f)];

				//in data object, create new array for every bucket
				b.forEach(function(_b){ d[_b] = []; });

				//cycle through sampled dataset to add values to their accordant arrays
				self.data['dummy_sample_' +self.modes[self.mode]].forEach(function(_d){
					var hash = f === 'country' ? _d[f].split(' ').join('_').toLowerCase() : _d[f];
					if(d[hash]){
						_d.idx = d3.keys(d).indexOf(hash);
						d[hash].push(_d);
					}
				});

				//convert back to array
				d = d3.entries(d);

				var length_tot = d3.sum(d,function(_d){ return _d.value.length; });

				d.forEach(function(_d){ 

					//calculate length in relation to total length for placement
					var _r = _d.value.length/length_tot;

					_d.ratio = _r;
					_d.ratio_agg = r;

					r +=_r;

					//sort primarily by rating and secondarily by age
					_d.value = _d.value.sort(function(a,b){ 
						if(a.rating === b.rating){
							return b.age_bucket -a.age_bucket;
						}
						return b.rating -a.rating; 
					});
				});

			//if more than one filter is selected (must be gender + {something})
			} else{
				f = self.filters.filter(function(d){ return d !== 'gender'; })[0];
				f = f === 'grade' ? 'grade_bucket' : f;

				//get buckets that correspond to filter
				b = self[(f === 'grade_bucket' ? 'buckets_grade' : 'buckets_' +f)];

				b.forEach(function(_b){
					d[_b] = [];
					d[_b].push([]); //array -- M
					d[_b].push([]); //array -- F
				});

				self.data['dummy_sample_' +self.modes[self.mode]].forEach(function(_d){
					var hash = f === 'country' ? _d[f].split(' ').join('_').toLowerCase() : _d[f];
					if(d[hash]){ 
						var arr_g = _d.gender === 'M' ? 0 : 1;
						_d.idx = d3.keys(d).indexOf(hash);
						_d.idx_g = arr_g;
						d[hash][arr_g].push(_d); 
					}
				});

				//convert back to array
				d = d3.entries(d);

				var length_tot = d3.sum(d,function(_d){ return (_d.value[0].length +_d.value[1].length); });

				d.forEach(function(_d){ 

					//calculate length in relation to total length for placement
					var _r = (_d.value[0].length +_d.value[1].length)/length_tot;
					
					_d.ratio = _r;
					_d.ratio_agg = r;

					r +=_r;

					//sort primarily by rating and secondarily by age
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
			return d;
		},

		/*	====================================================================== 
			SETUP -- Run on initial load and device change reload
			====================================================================== */

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
				.attr('viewBox',function(d){
					var x = self.device_dimensions[self.device].w,
						y = self.device_dimensions[self.device].h;
					return '0 0 ' +x +' ' +y;
				})
				.attr('preserveAspectRatio','xMidYMid meet');
			self.svg
				.on('click',function(){
					self.util_form_hide();
				});
			self.svg.exit().remove();

			//add defs (thanks, http://bl.ocks.org/tomgp/d59de83f771ca2b6f1d4)
			var defs = self.svg.append("defs");
			defs.append("marker")
				.attr({
					"id":"arrow",
					"viewBox":"0 -5 10 10",
					"refX":5,
					"refY":0,
					"markerWidth":8,
					"markerHeight":8,
					"orient":"auto"
				})
				.append("path")
					.attr("d", "M0,-5L10,0L0,5")
					.attr("class","arrowHead")
					.style('fill','white');

			//grab menu and all annotation elements
			self.menu = d3.select('#menu');
			self.anno = d3.select('#anno');
			self.anno_comment = d3.select('#comment');
			self.anno_tweet = d3.select('#anno #detail #twitter');
			self.anno_userDetail = d3.select('#anno #detail #user').html(function(){
				return self.device === 'default'? 'Hover over a hexagon for detail.' : self.device === 'tablet' ? 'Tap a hexagon for detail.' : 'Swipe to explore!';
			});

			//grab forms and inputs
			self.form = d3.select('#form')
				.classed('hidden',true)
				.style('left',window.innerWidth/2 -250 +'px')
				.style('top','150px')
				;
			self.form_tweet = d3.select('#form_tweet')
				.classed('hidden',true)
				.style('left',window.innerWidth/2 -250 +'px')
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
			self.twit = d3.select('#logo_tweet').on('click',function(){
        		d3.event.preventDefault();
				d3.event.stopPropagation();
				
				var tweetString = "Why I #LoveHateSciMath: Share your story at http://quantamagazine.org via @QuantaMagazine";
				self.util_form_submit_tweet(tweetString);
			});

			//grab navigation buttons, add click handlers
			self.mode_switch = d3.selectAll('.btn.view.mode').on('click',function(){
				d3.event.stopPropagation();
				self.util_filters_clear();
				self.mode = 1 -self.mode;
				self.generate();
			});
			self.add = d3.select('#menu .btn#add').on('click',function(){
				d3.event.stopPropagation();
				self.util_form_hide();
				self.util_form_show();
			});

		/*	---------------------------------------------------------------------- 
			LEGEND
			---------------------------------------------------------------------- */

			var legend_g_txt,
				legend_g_line;

			//grab legend, add interaction
			self.legend = d3.select('.nav#legend')
				.on('mousemove',function(){
					self.legend.classed('show',true);
				})
				.on('mouseout',function(){
					self.legend.classed('show',false);
				});
			
			//legend SVG container
			self.legend_body = d3.select('#legend_body').selectAll('svg.legend')
				.data([self]);
			self.legend_body.enter().append('svg')
				.classed('legend',true);
			self.legend_body.exit().remove();

			//legend background path
			self.legend_bg = self.legend_body.selectAll('path.legend_bg')
				.data([self]);
			self.legend_bg.enter().append('path')
				.classed('legend_bg',true);
			self.legend_bg
				.attr('d',function(){
					return self.filters.length === 0 ? self.path_legend : self.path_legend_exp;
				})
				.attr('transform','translate(1,1)');
			self.legend_bg.exit().remove();

			//legend hexagon groups
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
						y = 69;
					return 'translate(' +x +',' +y +')';
				});
			self.legend_g.exit().remove();

			//legend hexagon group captions
			legend_g_txt = self.legend_g.selectAll('text.legend_g_txt')
				.data(function(d){ return [d]; });
			legend_g_txt.enter().append('text')
				.classed('legend_g_txt',true);
			legend_g_txt
				.attr('x',function(d){
					return d.length === 2 ? -9 : -5;
				})
				.attr('y',48)
				.text(function(d){
					return d.length === 2 ? 'Hexagon shading: rating' : 'Hexagon size: age';
				});
			legend_g_txt.exit().remove();

			//legend hexagon group dividers
			legend_g_line = self.legend_g.selectAll('line.legend_g_line')
				.data(function(d){ return [d]; });
			legend_g_line.enter().append('line')
				.classed('legend_g_line',true);
			legend_g_line
				.attr('x1',function(d){
					return d.length === 2 ? -9 : -5;
				})
				.attr('y1',33)
				.attr('x2',139)
				.attr('y2',33);
			legend_g_line.exit().remove();

		/*	---------------------------------------------------------------------- 
			FILTERS
			---------------------------------------------------------------------- */

			//grab filters, add click handlers
			self.btn_filters = self.menu.selectAll('.btn.filter').on('click',function(){
				d3.event.stopPropagation();

				//check to make sure it's not a dropdown 
				if(!d3.select(this).classed('dd')){ self.filter(this); }
			});
			self.btn_filters_clear = d3.select('#clear').on('click',function(){
				d3.event.stopPropagation();
				self.util_filters_clear();
				self.generate();
			});

		/*	---------------------------------------------------------------------- 
			MOBILE NAV
			---------------------------------------------------------------------- */

			//grab mobile hamburger menu, add click handler
			self.mobile_ham = d3.select('#hamburger').on('click',function(){
				var o = self.menu.style('display');
				if(o === 'none'){
					self.menu.style('display','block');
					self.mobile_ham.classed('xout',true);
				} else{
					self.menu.style('display','none');
					self.mobile_ham.classed('xout',false);
				}
			});

			//grab mobile comments button, add click handler
			self.mobile_comments = d3.select('#comments').on('click',function(){
				if(self.comments_on && self.device === 'mobile'){
					self.comments_hide();
				} else if(!self.comments_on && self.device === 'mobile'){
					self.comments_show();
				}
			});

			//grab mobile comments panel elements
			self.mobile_comments_panel = d3.select('#comments_panel');
			self.mobile_comments_panel_body = d3.select('#comments_panel .panel');
		},

		/*	====================================================================== 
			GENERATE -- Run on initial load, mode change, filter change, device change
			====================================================================== */

		//thanks for all the help, http://www.redblobgames.com/grids/hexagons/!
		generate:function(){

			var filters_off = self.filters.length === 0,
				device_off  = self.device === 'default';

			//prepare data to be displayed
			self.data_display = filters_off ? [self.data[self.modes[self.mode]]] : self.filterData();

			//remove comments panel if needed
			if(self.device !== 'mobile' || (self.device === 'mobile' && !self.comments_on)){ self.comments_hide(); }
			
			d3.select('body').attr('class',self.modes[self.mode]);

			//class and style filter buttons
			/*self.btn_filters.attr('class',function(){
				var elem = d3.select(this),
					p_01 = elem.classed('dd') ? 'dd' : '',
					p_02 = elem.classed('selected') ? 'selected' : '',
					p_03 = elem.classed('deactivated') ? 'deactivated' : '';
				return 'btn filter ' +self.modes[self.mode] +' ' +p_01 +' ' +p_02 +' ' +p_03;
			});*/

			//create dropdown for country filter
			var countries_menu_items;
			countries_menu_items = d3.select('.btn.filter#country .expand').selectAll('li.option')
				.data(self.unique_countries.sort(function(a,b){
					return a <b ? -1 : a >b ? 1 : 0;
				}));
			countries_menu_items.enter().append('li')
				.classed('option',true);
			countries_menu_items
				.html(function(d){ return d; });
			countries_menu_items
				.on('click',function(d){
					d3.event.stopPropagation();
					self.filter(this.parentNode.parentNode,this);
				});
			countries_menu_items.exit().remove();

			//update all mode spans to reflect current mode
			d3.select('#title .mode').text(self.util_toTitleCase(self.modes[self.mode]));
			d3.selectAll('#form .mode').text(self.modes[self.mode]);

			d3.selectAll('.mobile.solid').style('background-color',function(){
				return d3.select(this).classed('mobile') ? self.colors_legend[self.mode] : 'transparent';
			});

			//update sample span to reflect sample data, if applicable
			d3.select('#sampled .sample').text(function(){
				return filters_off ? 0 : 5;
			});

			//update switch buttons to reflect current/opposite modes
			d3.selectAll('.mode_cur').text(self.modes[self.mode]);
			d3.selectAll('.mode_opp').text(self.modes[1 -self.mode]);

			//update form options
			var sel_ops_country,
				sel_ops_rating,
				sel_ops_grade;
			var data_rating = d3.entries(self.buckets_rating).map(function(d){ return d.key +'=' +d.value; });
			sel_ops_country = d3.select('.input.select #input_country').selectAll('option.sel_ops_country')
				.data(self.data.countries.sort(function(a,b){
					return a.name <b.name ? -1 : a.name >b.name ? 1 : 0;
				}));
			sel_ops_country.enter().append('option')
				.classed('sel_ops_country',true);
			sel_ops_country
				.html(function(d,i){ return i >0 ? d.name : ''; });
			sel_ops_country.exit().remove();
			sel_ops_rating = d3.select('.input.select #input_rating').selectAll('option.sel_ops_rating')
				.data([""].concat(data_rating));
			sel_ops_rating.enter().append('option')
				.classed('sel_ops_rating',true);
			sel_ops_rating
				.html(function(d,i){ return i >0 ? d : ''; });
			sel_ops_rating.exit().remove();
			sel_ops_grade = d3.select('.input.select #input_grade').selectAll('option.sel_ops_grade')
				.data([""].concat(self.buckets_grade));
			sel_ops_grade.enter().append('option')
				.classed('sel_ops_grade',true);
			sel_ops_grade
				.html(function(d,i){ return d; });
			sel_ops_grade.exit().remove();

			//HEX GRID CALCULATIONS
			//for columns
			var hex_pad = 60,
				hex_pad_sub = self.filters.length === 2 ? 15 : 0,

				hex_area_w = self.device === 'default' ?
					( self.filters.length === 2 ? self.w*0.75 -((self.data_display.length -1)*hex_pad -(self.data_display.length*hex_pad_sub))
					: self.filters.length === 1 ? self.w*0.75 -((self.data_display.length -1)*hex_pad)
					: 0)
					: self.w*0.45,
				hex_area_h = self.device === 'default' ?
					self.h*0.45 :
					( self.filters.length === 2 ? self.h*0.75 -((self.data_display.length -1)*hex_pad -(self.data_display.length*hex_pad_sub))
					: self.filters.length === 1 ? self.h*0.75 -((self.data_display.length -1)*hex_pad)
					: 0),
				hex_area = hex_area_w*hex_area_h;

			//thank you, https://en.wikipedia.org/wiki/Centered_hexagonal_number
			var num_rings = self.calc_hex_rings(self.data[self.modes[self.mode]].length),

				//calculate radius for hexagon group based on height of screen and number of rings to be drawn
				hex_h = Math.floor(self.h/(num_rings*(self.device === 'mobile' ? 0.75 : 2))),
				hex_w,

				hex_rad = filters_off ? hex_h/2 : self.calc_hex_linear_radius(d3.sum(self.data_display,function(d){ return d.value.length; }),hex_area),
				hex_rad_hov = hex_rad*2.25,
				hex_rad_legend = 8;

			hex_h = (Math.sqrt(3)/2)*(2*hex_rad);
			hex_w = hex_rad*2;

			var	hex_row_h = Math.floor( hex_area_h/hex_h ),
				hex_col_w = Math.floor( hex_area_w/(hex_w*0.75) )
				;
 
			//INITIALIZE VARIABLES
			//this is just used to neatly generate a hexagon path
			var hexbin = d3.hexbin();
			var hexTTG,
				hexTTback,
				hexTT;
			var hexG,
				hexesG,
				hexes,
				hexesLabels;
			var legend_hexes,
				legend_hexes_txt,
				legend_hexes_arr;

			//INITIALIZE FUNCTIONS
			//convert cube coordinates to pixel coordinates
			function util_cubeToPix(_cube){
				var obj = {};
				var s = hex_rad;

				obj.x = s * Math.sqrt(3) * (_cube.x +_cube.z/2);
				obj.y = s * 3/2 * _cube.z;

				return obj;
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
				d.pos = util_cubeToPix(cube_coords[i]);
			});

			var scale_age = d3.scale.linear()
				.domain([0,self.buckets_age.length -1])
				.range([2,hex_rad]);
			var scale_age_legend = d3.scale.linear()
				.domain([0,self.buckets_age.length -1])
				.range([2,hex_rad_legend]);

			var padding = {
				'top':(self.h*0.25)/2,
				'right':0,
				'bottom':0,
				'left':(self.w*0.25)/2
			};

			//UPDATE LEGEND
			legend_hexes = self.legend_g.selectAll('path.legend_hex')
				.data(function(d,i){ return d; });
			legend_hexes.enter().append('path')
				.classed('legend_hex',true);
			legend_hexes
				.attr('d',function(d,i){
					return d >5 ? hexbin.hexagon(hex_rad_legend) : hexbin.hexagon(scale_age_legend(d));
				})
				.attr('transform',function(d,i){
					var x = d >5 ? i*120 : i*30,
						y = 9;
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('fill-opacity',function(d,i){
					return d >5 ? ((d-6)*5)/5 : 1;
				});
			legend_hexes.exit().remove();
			legend_hexes_txt = self.legend_g.selectAll('text.legend_hex_txt')
				.data(function(d,i){ return d; });
			legend_hexes_txt.enter().append('text')
				.classed('legend_hex_txt',true);
			legend_hexes_txt
				.attr('transform',function(d,i){
					var x = d >5 ? i*120 : i*30,
						y = -6;
					return 'translate(' +x +',' +y +')';
				})
				.text(function(d,i){
					return d >5 ? (d === 6 ? '1' : '5') : self.buckets_age[d-1]; 
				});
			legend_hexes_txt.exit().remove();
			legend_hexes_arr = self.legend_g.selectAll('line.legend_hex_arr')
				.data(function(d,i){ return d.length === 2 ? d : false; });
			legend_hexes_arr.enter().append('line')
				.classed('legend_hex_arr',true);
			legend_hexes_arr
				.attr('marker-end','url(#arrow)')
				.attr('x1',6)
				.attr('y1',-9)
				.attr('x2',111)
				.attr('y2',-9)
				;
			legend_hexes_txt.exit().remove();

			//UPDATE HEXAGONS
			//hexagon container
			hexG = self.svg.selectAll('g.hexG')
				.data([self.data_display]);
			hexG.enter().append('g')
				.classed('hexG',true);
			hexG
				.attr('transform',function(d){
					//var noT = self.device === 'default' || self.device === 'mobile' || self.filters.length === 0,
					var x = filters_off ? self.w/2 : device_off ? padding.left : (self.w -hex_area_w)/1.75,
						y = filters_off ? self.h/2 : device_off ? (self.h -hex_area_h)/1.75 : padding.top;
					return 'translate(' +x +',' +y +')';
				});
			hexG
				.on('mouseout',function(d){
					hexTTG.classed('hidden',true);
					self.util_detail_clear();
				});
			hexG.exit().remove();

			//hexagon sub-containers
			hexesG = hexG.selectAll('g.hexesG')
				.data(function(d){ return d; });
			hexesG.enter().append('g')
				.classed('hexesG',true);
			hexesG
				.attr('transform',function(d,i){
					var x = d.ratio_agg ? device_off ? (d.ratio_agg*hex_area_w) +(i*hex_pad) : 0 : 0,
						y = d.ratio_agg ? device_off ? 0 : (d.ratio_agg*hex_area_h) +(i*hex_pad) : 0;
					return 'translate(' +x +',' +y +')';
				})
			hexesG.exit().remove();

			//panels for position testing -- keep these around for now
			/*var hr = hexesG.selectAll('rect.hr')
				.data(function(d){ return [d]; });
			hr.enter().append('rect')
				.classed('hr',true);
			hr
				.attr('width',function(d){
					return d.ratio ? device_off ? hex_area_w*d.ratio : hex_area_w : 0;
				})
				.attr('height',function(d){
					return d.ratio ? device_off ? hex_area_h : hex_area_h*d.ratio : 0;
				})
				.attr('x',0)
				.attr('y',0)
				.style('fill','pink');
			hr.exit().remove();*/

			//hexagons
			hexes = hexesG.selectAll('path.hex')
				.data(function(d){ return d.value || d; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.attr('d',function(d){
					return filters_off ? hexbin.hexagon(hex_rad) : hexbin.hexagon(scale_age(d.age_bucket));
				})
				.attr('transform',function(d,i){
					var row_num = device_off ? i%hex_row_h : Math.floor(i/hex_col_w),
						col_num = device_off ? Math.floor(i/hex_row_h) : i%hex_col_w;
					var x = filters_off ? d.pos.y : col_num*(hex_w*0.75),
						y = filters_off ? d.pos.x : row_num*(hex_h) +((col_num%2)*(hex_h/2));
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){ return d.rating/5; });
			hexes
				.on('mousemove',function(d,i){
					var x, y;
					var o = d.rating/5;
					var row_num = device_off ? i%hex_row_h : Math.floor(i/hex_col_w),
						col_num = device_off ? Math.floor(i/hex_row_h) : i%hex_col_w;
					var p = self.data_display[d.idx],

						x_trans = filters_off ? self.w/2 : device_off ? padding.left : (self.w -hex_area_w)/1.75,
						y_trans = filters_off ? self.h/2 : device_off ? (self.h -hex_area_h)/1.75 : padding.top,

						x_trans_micro = filters_off ? 0 : device_off && p.ratio_agg ? (p.ratio_agg*hex_area_w) +(d.idx*hex_pad) : 0,
						y_trans_micro = filters_off ? 0 : device_off && p.ratio_agg ? 0 : (p.ratio_agg*hex_area_h) +(d.idx*hex_pad);

					x = filters_off ? d.pos.y : col_num*(hex_w*0.75);
					y = filters_off ? d.pos.x : row_num*(hex_h) +((col_num%2)*(hex_h/2));

					x +=(x_trans +x_trans_micro);
					y +=(y_trans +y_trans_micro);

					hexTTG
						.classed('hidden',false)
						.attr('transform',function(){ return 'translate(' +x +',' +y +')rotate(90)'; });
					hexTT.style('fill-opacity',o);
					
					self.util_detail_update(d);
				});
			hexes.exit().remove();

			//labels under groups
			hexesLabels = hexesG.selectAll('text.hexLabel')
				.data(function(d){ return !filters_off ? [d] : false; });
			hexesLabels.enter().append('text')
				.classed('hexLabel',true);
			hexesLabels
				.attr('x',function(d){ return d.ratio ? device_off ? hex_area_w*d.ratio/2 : hex_area_w : 0; })
				.attr('y',function(d){ return d.ratio ? device_off ? hex_area_h +30 : hex_area_h*d.ratio : 0; })
				.text(function(d){ 
					var t = self.filters.length === 1 ? (d.value.length >0 ? d.key : '') : '';
					if(self.filters[0] === 'gender'){
						t = self.util_resolve_gender(t);
					}
					t = self.util_toTitleCase(t);
					return t; 
				});
			hexesLabels.exit().remove();

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
				.style('fill',self.colors[self.mode]);
			hexTTback.exit().remove();
			hexTT = hexTTG.selectAll('path.hexTT')
				.data(function(d){ return [d]; });
			hexTT.enter().append('path')
				.classed('hexTT',true);
			hexTT
				.attr('d',hexbin.hexagon(hex_rad_hov))
				.style('stroke',self.colors[self.mode]);
			hexTT.exit().remove();

			self.menu
				.style('display',function(){
					return self.device !== 'mobile' ? 'block' : 'none';
				});
			self.anno.style('background',function(){
				return self.device === 'mobile' ? self.mode === 0 ? 'rgba(41, 92, 204, 0.75)' : 'rgba(103,164,0,0.75)' : 'transparent';
			});

			//if on, refresh comments panel
			if(self.comments_on){
				self.comments_show();
			}
		},

		//determine filter state from interface selections
		//this does not filter the data itself
		filter:function(_elem,_item){

			var btn = d3.select(_elem),
				btn_id = btn.attr('id'),
				btn_selected = btn.classed('selected');
			var item,
				item_id;

			if(_item){
				
				item = d3.select(_item);
				item_id = item.data()[0].split(' ').join('_').toLowerCase();
				
				//if dropdown option has not yet been accounted for, add to sub-filters array
				if(self.buckets_country.length <5 && self.buckets_country.indexOf(item_id) <0){

					//if top-level filter has not yet been accounted for, add to filters array
					//deactivate incompatible filter if 'country' is selected
					if(self.filters.indexOf(btn_id) <0){
						self.filters.push(btn_id);
						btn.classed('selected',true);

						if(btn_id === 'country'){ d3.select('.btn.filter#grade').classed('deactivated',true); }
					}
					self.buckets_country.push(item_id);
					item.classed('selected',true);
				} else{
					self.buckets_country = self.buckets_country.filter(function(d){ return d !== item_id; });
					item.classed('selected',false);

					//if no more sub-filters, remove top-level filter from filters array
					//reactivate incompatible filter if 'country' is deselected
					if(self.buckets_country.length === 0){
						self.filters = self.filters.filter(function(d){ return d !== btn_id; });
						btn.classed('selected',false);

						if(btn_id === 'country'){ d3.select('.btn.filter#grade').classed('deactivated',false); }
					}
				}

			} else{
				if(self.filters.indexOf(btn_id) <0){
					self.filters.push(btn_id);
				} else{
					self.filters = self.filters.filter(function(d){ return d !== btn_id; });
				}

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

				//class button as selected or not
				btn.classed('selected',!btn_selected);
			}
			if(self.filters.length === 0 && self.buckets_country.length === 0){
				self.util_filters_clear();
			} else{
				self.btn_filters_clear.classed('visible',true);

				self.legend_bg.attr('d',self.path_legend_exp);
				self.legend.classed('expanded',true);
				self.legend_g.classed('show',true);

				d3.select('#sampled').classed('visible',true);
			}
			
			self.mobile_ham.classed('xout',false);
			self.generate();
		},

		/*	====================================================================== 
			UTILITY FUNCTIONS
			====================================================================== */

		//resizing logic
		resize:function(){
		},

		//mobile comments view
		comments_show:function(){
			self.comments_on = true;

			self.mobile_comments.html('&larr; View <span class="b">main</span>.');
			self.mobile_comments_panel.style('display','block');

			function getCommentData(){
				var data = [];
				if(self.filters.length === 1){
					self.data_display.forEach(function(d){
						d.value.forEach(function(_d){
							data.push(_d);
						});
					});
				} else if(self.filters.length === 2){
					self.data_display.forEach(function(d){
						d.value.forEach(function(_d){
							_d.forEach(function(__d){
								data.push(__d);
							});
						});
					});
				} else{
					data = self.data_display;
				}
				return data;
			}

			var comment_data = getCommentData();
			var comments;
			comments = self.mobile_comments_panel_body.selectAll('div.comment_block')
				.data(comment_data);
			comments.enter().append('div')
				.classed('comment_block',true);
			comments
				.html(function(d){
					var str = '<span class="mobile_comment_user">Grade ' +d.grade +' rating: ' +d.rating +'/5 &#124; ' +self.util_resolve_gender(d.gender) +', ' +d.age +', ' +d.country +'</span><span>&ldquo;' +d.comment +'&rdquo;</span>';
					return str;
				})
				.style('border-bottom',function(d){
					return '2px solid ' +self.colors[self.mode];
				});
			comments.exit().remove();
		},
		comments_hide:function(){
			self.comments_on = false;

			self.mobile_comments.html('&rarr; View <span class="b">comments</span>.');
			self.mobile_comments_panel.style('display','none');
			self.mobile_comments_panel_body.html('');
		},

		//HEXAGON CALCULATIONS
		//calculate the number of rings in a radial hex grid
		//takes number of total data points
		calc_hex_rings:function(_n){
			var num_hexes = 0,
				c;
			for(var num_rings=0; num_hexes <=_n; num_rings++){
				num_hexes = 1 +6*((0.5*num_rings)*(num_rings -1));
			}
			return num_rings -1;
		},
		calc_hex_linear_radius:function(_count,_area){
			var hex_area = _area/_count;
			return Math.floor(Math.sqrt(((hex_area/6)*4)/Math.sqrt(3)));
		},

		//interface
		util_filters_clear:function(){

			self.filters = [];
			self.buckets_country = [];

			self.btn_filters_clear.classed('visible',false);
			self.btn_filters
				.classed('selected',false)
				.classed('deactivated',false);

			//deselect all dropdown menu selections
			d3.selectAll('li.option').classed('selected',false);

			self.legend_bg.attr('d',self.path_legend);
			self.legend.classed('expanded',false);
			self.legend_g.classed('show',function(d,i){
				return i === 0;
			});

			d3.select('#sampled').classed('visible',false);
		},

		//forms
		util_form_center:function(){
			self.form.style('left',window.innerWidth/2 -250 +'px');
			self.form_tweet.style('left',window.innerWidth/2 -250 +'px');
		},
		util_form_clear:function(){
			document.getElementById('input_female').checked = false;
			document.getElementById('input_male').checked = false;
			document.getElementById('input_country').selectedIndex = 0;
			document.getElementById('input_age').value = '';
			document.getElementById('input_grade').selectedIndex = 0;
			document.getElementById('input_rating').selectedIndex = 0;
			document.getElementById('input_experience').value = '';
		},
		util_form_hide:function(){
			self.form.classed('hidden',true);
			self.form_tweet.classed('hidden',true);
		},
		util_form_show:function(){
			self.form.classed('hidden',false);
		},
		util_form_submit:function(){
			var obj = {};

			//gather values into new data object
			obj.subject = self.modes[self.mode];
			obj.gender = document.getElementById('input_female').checked ? 'F' : document.getElementById('input_male').checked ? 'M' : '';
			obj.country = document.getElementById('input_country').value;
			obj.age = document.getElementById('input_age').value;
			obj.grade = document.getElementById('input_grade').value;
			obj.rating = document.getElementById('input_rating').value;
			obj.experience = document.getElementById('input_experience').value;

			//make sure none are blank
			if(	obj.gender === ''
				|| obj.country === ''
				|| obj.age === ''
				|| obj.grade === ''
				|| obj.rating === ''
				|| obj.experience === ''){
				alert('Please fill out form completely.')
			} else{

				//**TODO submit object to database

				self.util_form_clear();
				self.util_form_compose_tweet(obj);

				self.form.classed('hidden',true);
				self.form_tweet.classed('hidden',false);
			}
		},
		util_form_compose_tweet:function(_obj){
			var str,

				str_begin,
				str_mid,
				str_end,
				str_rating,

				char_limit = 140;

			//turn to integer
			_obj.rating = +_obj.rating.split('=')[0];
			
			//compose rating portion
			if(_obj.rating === 1){
				str_rating = 'HATE ' +self.modes[self.mode];
			} else if(_obj.rating === 2){
				str_rating = 'DISLIKE ' +self.modes[self.mode];
			} else if(_obj.rating === 3){
				str_rating = 'find ' +self.modes[self.mode] + ' OK';
			} else if(_obj.rating === 4){
				str_rating = 'LIKE ' +self.modes[self.mode];
			} else if(_obj.rating === 5){
				str_rating = 'LOVE ' +self.modes[self.mode];
			}

			str_begin = 'I ' +str_rating +' because "',
			str_end = '..." Share your story at www.quantamagazine.org. #LoveHateSciMath';

			//if needed, truncate experience blurb
			var str_length = str_begin.length +_obj.experience.length +str_end.length;
			if(str_length >char_limit){
				str_mid = _obj.experience.substring(0,(_obj.experience.length -(str_length -char_limit) -1));
			} else{
				str_mid = _obj.experience;
			}

			str = str_begin +str_mid +str_end;
			document.getElementById('tweet_body').value = str;
		},
		util_form_clear_tweet:function(){
			document.getElementById('tweet_body').value = '';
		},
		util_form_submit_tweet:function(_body){
			var body = _body || document.getElementById('tweet_body').value,
				form = 'text=' +self.util_encode_tweet(body),
				//link = 'url=' +self.util_encode_tweet('http://www.quantamagazine.org'),
				//hand = 'via=QuantaMagazine',
				//twit = 'https://twitter.com/intent/tweet?' +form +'&' +link +'&' +hand;
				twit = 'https://twitter.com/intent/tweet?' +form;

			window.open(twit,'_blank');

			self.util_form_clear_tweet();
			self.form_tweet.classed('hidden',true);
		},	
		util_encode_tweet:function(_text){
			var self = this;
			var text = encodeURIComponent(_text).replace(/'/g,"%27").replace(/"/g,"%22");
			return text;
		},

		//data
		util_get_top_countries:function(){
			/*var arr_countries = {};
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
			}*/
		},
		util_get_unique_countries:function(){
			var data = self.data['dummy_sample_' +self.modes[self.mode]];
			data.forEach(function(d,i){
				if(self.unique_countries.indexOf(d.country) <0){
					self.unique_countries.push(d.country);
				}
			});
		},

		//updating lower right hover annotations
		util_detail_update:function(_d){
			var str_comment,
				str_userDetail;
			if(self.device ==='mobile'){
				str_comment = '';
				str_userDetail = 'Rating: ' +_d.rating +'/5<br/><br/>' + '<span class="comment">&ldquo;' +_d.comment +'&rdquo;</span>';
			} else{
				str_comment = '&ldquo;' +_d.comment +'&rdquo;';
				str_userDetail = 'Grade ' +_d.grade +' rating: ' +_d.rating +'/5 &#124; ' +self.util_resolve_gender(_d.gender) +', ' +_d.age +', ' +_d.country;
			}
			self.anno_comment.html(str_comment);
			self.anno_userDetail.html(str_userDetail);
		},
		util_detail_clear:function(){
			var str_userDetail = self.device === 'default'? 'Hover over a hexagon for detail.' : self.device === 'tablet' ? 'Tap a hexagon for detail.' : 'Swipe to explore!';
			self.anno_comment.html('');
			self.anno_userDetail.html(str_userDetail);
			self.anno_tweet.html('');
		},

		//resolving values to buckets
		util_resolve_age:function(_n){
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
		},
		util_resolve_device:function(_n){
			var device = 'default';
			if(_n >self.device_dimensions.tablet.h){
				device = 'default';
			} else if(_n <=self.device_dimensions.tablet.h && _n >self.device_dimensions.tablet.w){
				device = 'tablet';
			} else if(_n <=self.device_dimensions.tablet.w){
				device = 'mobile';
			}
			return device;
		},
		util_resolve_gender:function(_n){
			return _n.toLowerCase() === 'f' ? 'Female' : 'Male';
		},
		util_resolve_grade:function(_n){
			var g = +_n,
				group;
			if(g >0 && g <=5){
				group = self.buckets_grade[0];
			} else if(g >5 && g <=8){
				group = self.buckets_grade[1];
			} else if(g >8 && g <= 12){
				group = self.buckets_grade[2];
			} else{
				group = self.buckets_grade[3];
			}
			return group;
		},

		//misc. operations
		//thank you, http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
		util_toTitleCase:function(_str){
		    return _str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		}
	}
}

var self = init();
self.setup();
self.getData(self.processData);

window.onresize = function(){

	self.util_form_center();

	var device = self.util_resolve_device(window.innerWidth);
	if(device !== self.device){

		//console.log(self.device +'->' +device);
		self.setup();
		self.generate();
	}
}