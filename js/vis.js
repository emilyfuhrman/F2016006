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

		freeze:false,
		form_visible:false,

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

		pressTimer:0,

		hex_file_w:30,
		hex_file_h:30,
		hex_sideLength:15,

		//mobile comments visible?
		comments_on:false,

		colors:[
			'#6698b1',
			'#8fb292'
		],
		colors_legend:[
			'#52849d',
			'#7b9e7e'
		],

		getData:function(_callback){
			var datasets = ['math','science','countries'];
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

				//cycle through data to add values to their accordant arrays
				self.data[self.modes[self.mode]].forEach(function(_d){
					var hash = f === 'country' ? _d[f].split(' ').join('_').toLowerCase() : _d[f];
					if(d[hash]){
						_d.idx = d3.keys(d).indexOf(hash);
						d[hash].push(_d);
					}
				});

			//if more than one filter is selected (must be gender + {something})
			} else{
				f = self.filters.filter(function(d){ return d !== 'gender'; })[0];
				f = f === 'grade' ? 'grade_bucket' : f;

				//get buckets that correspond to filter
				b = self[(f === 'grade_bucket' ? 'buckets_grade' : 'buckets_' +f)];

				b.forEach(function(_b){
					d[_b +'_M'] = [];
					d[_b +'_F'] = [];
				});

				self.data[self.modes[self.mode]].forEach(function(_d){
					var hash = f === 'country' ? _d[f].split(' ').join('_').toLowerCase() : _d[f];
					if(d[hash +'_' +_d.gender]){
						_d.idx = d3.keys(d).indexOf(hash +'_' +_d.gender);
						d[hash +'_' +_d.gender].push(_d); 
					}
				});
			}

			//convert back to array
			d = d3.entries(d);

			var length_tot = d3.sum(d,function(_d){ return _d.value.length; });

			d.forEach(function(_d,_i){ 

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
					if(self.freeze){ self.freeze = false; }
					self.util_form_hide();
					self.legend.classed('show',false);
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

			//initialize hexbin
			self.hexbin = d3.hexbin();

		/*	---------------------------------------------------------------------- 
			LEGEND
			---------------------------------------------------------------------- */

			var legend_body,
				legend_bg;
			var legend_g,
				legend_g_txt,
				legend_g_line;
			var legend_hexes,
				legend_hexes_txt,
				legend_hexes_arr;

			//grab legend, add interaction
			self.legend = d3.selectAll('.btn.legend')
				.on('click',function(){
					var show = d3.select(this).classed('show');
					d3.select(this).classed('show',!show);
				});
			
			//legend SVG container
			legend_body = d3.selectAll('.legend_body').selectAll('svg.legend')
				.data([self]);
			legend_body.enter().append('svg')
				.classed('legend',true);
			legend_body.exit().remove();

			//legend background path
			legend_bg = legend_body.selectAll('rect.legend_bg')
				.data([self]);
			legend_bg.enter().append('rect')
				.classed('legend_bg',true);
			legend_bg
				.attr('x',1)
				.attr('y',1)
				.attr('width',180)
				.attr('height',90);
			legend_bg.exit().remove();

			//legend hexagon groups
			legend_g = legend_body.selectAll('g.legend_g')
				.data([[1,2]]);
			legend_g.enter().append('g')
				.classed('legend_g',true);
			legend_g
				.attr('transform',function(d,i){
					var x = 24,
						y = 30;
					return 'translate(' +x +',' +y +')';
				});
			legend_g.exit().remove();

			//legend hexagon group captions
			legend_g_txt = legend_g.selectAll('text.legend_g_txt')
				.data(function(d){ return [d]; });
			legend_g_txt.enter().append('text')
				.classed('legend_g_txt',true);
			legend_g_txt
				.attr('x',-9)
				.attr('y',48)
				.text('Hexagon shading: rating');
			legend_g_txt.exit().remove();

			//legend hexagon group dividers
			legend_g_line = legend_g.selectAll('line.legend_g_line')
				.data(function(d){ return [d]; });
			legend_g_line.enter().append('line')
				.classed('legend_g_line',true);
			legend_g_line
				.attr('x1',-9)
				.attr('y1',33)
				.attr('x2',139)
				.attr('y2',33);
			legend_g_line.exit().remove();

			//legend specifics
			legend_hexes = legend_g.selectAll('path.legend_hex')
				.data(function(d,i){ return d; });
			legend_hexes.enter().append('path')
				.classed('legend_hex',true);
			legend_hexes
				.attr('d',function(d,i){ return self.hexbin.hexagon(8); })
				.attr('transform',function(d,i){
					var x = i*120,
						y = 9;
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('fill-opacity',function(d,i){ return i === 0 ? 0.2 : 1; });
			legend_hexes.exit().remove();
			legend_hexes_txt = legend_g.selectAll('text.legend_hex_txt')
				.data(function(d,i){ return d; });
			legend_hexes_txt.enter().append('text')
				.classed('legend_hex_txt',true);
			legend_hexes_txt
				.attr('transform',function(d,i){
					var x = i*120 +1,
						y = -9;
					return 'translate(' +x +',' +y +')';
				})
				.text(function(d,i){ return i === 0 ? 'Hate' : 'Love'; });
			legend_hexes_txt.exit().remove();
			legend_hexes_arr = legend_g.selectAll('line.legend_hex_arr')
				.data(function(d,i){ return d; });
			legend_hexes_arr.enter().append('line')
				.classed('legend_hex_arr',true);
			legend_hexes_arr
				.attr('marker-end','url(#arrow)')
				.attr('x1',20)
				.attr('y1',-12)
				.attr('x2',102)
				.attr('y2',-12);
			legend_hexes_txt.exit().remove();

		/*	---------------------------------------------------------------------- 
			FILTERS
			---------------------------------------------------------------------- */

			//grab filters, add click handlers
			self.btn_filters = self.menu.selectAll('.btn.filter').on('click',function(){
				d3.event.stopPropagation();

				//check to make sure it's not a dropdown 
				if(!d3.select(this).classed('dd')){ 
					self.filter(this); 
				} else if(d3.select(this).classed('selected')){
					self.filter(this);
				}
			});

		/*	---------------------------------------------------------------------- 
			MOBILE NAV
			---------------------------------------------------------------------- */

			//grab mobile hamburger menu, add click handler
			self.mobile_ham = d3.select('#hamburger').on('click',function(){
				var display_style = self.menu.style('display');
				if(display_style === 'none'){
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

			//hide legend if needed
			self.legend.classed('show',false);
			
			//reset tooltip functionality
			self.anno.style('display',function(){
				return self.device !== 'mobile' ? 'none' : 'block';
			});
			d3.select('.hexTT').style('stroke-width',3);
			self.freeze = false;

			//remove comments panel if needed
			if(self.device !== 'mobile' || (self.device === 'mobile' && !self.comments_on)){ self.comments_hide(); }
			
			d3.select('body').attr('class',self.modes[self.mode]);

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
					if(d3.select(this).classed('selected') || self.buckets_country.length <5){
						self.filter(this.parentNode.parentNode,this);
						d3.select('#country_count').text(5 -self.buckets_country.length);
					}
				});
			countries_menu_items.exit().remove();

			//update all mode spans to reflect current mode
			d3.select('#title .mode').text(self.util_toTitleCase(self.modes[self.mode]));
			d3.selectAll('#form .mode').text(self.modes[self.mode]);

			d3.selectAll('.mobile.solid').style('background-color',function(){
				return d3.select(this).classed('mobile') ? self.colors_legend[self.mode] : 'transparent';
			});

			//update switch buttons to reflect current/opposite modes
			d3.selectAll('.mode_cur').text(self.modes[self.mode]);
			d3.selectAll('.mode_opp').text(self.util_toTitleCase(self.modes[1 -self.mode]));

			//update form options
			var sel_ops_country,
				sel_ops_rating,
				sel_ops_grade;
			var data_rating = d3.entries(self.buckets_rating).map(function(d){ return d.value; });

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
			var hex_display_length = filters_off ? self.data_display.length : self.data_display.filter(function(d){ return d.value.length >0; }).length,

				hex_pad = device_off ? 60 : 30,
				hex_pad_sub = self.filters.length === 2 ? (device_off ? 15 : 6) : 0,

				hex_area_w = self.device === 'default' ?
					( self.filters.length === 2 ? self.w*0.75 -((hex_display_length -1)*hex_pad +(hex_display_length*hex_pad_sub))
					: self.filters.length === 1 ? self.w*0.75 -((hex_display_length -1)*hex_pad)
					: 0)
					: self.w*0.45,
				hex_area_h = self.device === 'default' ?
					self.h*0.45 :
					( self.filters.length === 2 ? self.h*0.65 -((hex_display_length -1)*hex_pad -(hex_display_length*hex_pad_sub))
					: self.filters.length === 1 ? self.h*0.65 -((hex_display_length -1)*hex_pad)
					: 0),
				hex_area = hex_area_w*hex_area_h;

			//thank you, https://en.wikipedia.org/wiki/Centered_hexagonal_number
			var num_rings = self.calc_hex_rings(self.data[self.modes[self.mode]].length),

				//calculate radius for hexagon group based on height of screen and number of rings to be drawn
				hex_h = Math.floor(self.h/(num_rings*(self.device === 'mobile' ? 0.75 : 2))),
				hex_w,

				hex_rad = filters_off ? hex_h/2 : self.calc_hex_linear_radius(d3.sum(self.data_display,function(d){ return d.value.length; }),hex_area),
				hex_rad_hov = hex_rad*2.25;

			hex_h = (Math.sqrt(3)/2)*(2*hex_rad);
			hex_w = hex_rad*2;

			//adjust hex group padding, in case it's smaller than the size of a hexagon
			hex_pad_sub = hex_pad_sub <hex_rad*2 ? hex_rad*2 : hex_pad_sub;

			var	hex_row_h = Math.floor( hex_area_h/hex_h ),
				hex_col_w = Math.floor( hex_area_w/(hex_w*0.75) );
 
			//INITIALIZE VARIABLES
			var hexTTG,
				hexTTback,
				hexTT;
			var hexG,
				hexesG,
				hexes,
				hexesLabels,
				hexesLabels_;

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

			var padding = {
				'top':self.h*0.175,
				'right':0,
				'bottom':0,
				'left':(self.w*0.25)/2
			};

			//UPDATE HEXAGONS
			//hexagon coordinates container
			var hex_coords = { x:self.w/2, y:self.h/2 };

			//set up drag behavior on mobile for hexagon group
			//thank you, https://bl.ocks.org/mbostock/9669633
			var drag = d3.behavior.drag()
			    .origin(function(d) { return hex_coords; })
			    .on("dragstart", dragstarted)
			    .on("drag", dragged)
			    .on("dragend", dragended);

			function dragstarted() {
			}

			function dragged(e) {
				if(self.device === 'mobile' && filters_off){
					hexTTG.classed('hidden',true);
					self.util_detail_clear();
					
					hex_coords.x = d3.event.x;
					hex_coords.y = d3.event.y;

					d3.select(this).attr('transform', function(d) { return "translate(" + hex_coords.x + ',' + hex_coords.y + ')'; });
				}

			}

			function dragended() {
			}

			//for mobile longpress text selection
			//thank you, http://stackoverflow.com/questions/985272/selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
			function selectElementText(el, win) {
			    win = win || window;
			    var doc = win.document, sel, range;

			    if (win.getSelection && doc.createRange) {
			        sel = win.getSelection();
			        range = doc.createRange();
			        range.selectNodeContents(el);
			        sel.removeAllRanges();
			        sel.addRange(range);
			    } else if (doc.body.createTextRange) {
			        range = doc.body.createTextRange();
			        range.setSelectionRange(0, 99999);
			        range.moveToElementText(el);
			        range.select();
			        range.focus();
			        // range.selectionStart=0;
			        // range.selectionEnd=range.value.length;
			    }
			    //el.focus();
			}

			//store tooltip height
			var tt_h = self.anno.node().getBoundingClientRect().height;

			hexG = self.svg.selectAll('g.hexG')
				.data([self.data_display]);
			hexG.enter().append('g')
				.classed('hexG',true);
			hexG
				.attr('transform',function(d){
					var x = filters_off ? hex_coords.x : device_off ? padding.left : (self.w -hex_area_w)/3,
						y = filters_off ? hex_coords.y : device_off ? (self.h -hex_area_h)/1.75 : padding.top;
					return 'translate(' +x +',' +y +')';
				})
				.call(drag);
			hexG
				.on('click',function(){
					d3.event.stopPropagation();
					self.freeze = !self.freeze;
					self.legend.classed('show',false);
					return false;
				})
				.on('mousedown',function(){
					if(hexTTG.classed('hidden',false)){
						self.pressTimer = window.setTimeout(function(){
	        				selectElementText(document.getElementById("user_comment"));
						},1000);
					}
					return false;
				})
				.on('mouseup',function(){
					clearTimeout(self.pressTimer);
					return false;
				})
				.on('mouseout',function(d){
					if(!self.freeze){
						hexTTG.classed('hidden',true);
						self.util_detail_clear();
					}
					return false;
				})
				//.on('touchstart',function(d){ d3.event.preventDefault(); })
				//.on('touchmove',function(d){ d3.event.preventDefault(); })
				;
			hexG.exit().remove();

			//hexagon sub-containers
			hexesG = hexG.selectAll('g.hexesG')
				.data(function(d){ return d; });
			hexesG.enter().append('g')
				.classed('hexesG',true);
			hexesG
				.attr('transform',function(d,i){
					var x = d.ratio_agg ? device_off ? (d.ratio_agg*hex_area_w) +(i*hex_pad) +(i*hex_pad_sub) : 0 : 0,
						y = d.ratio_agg ? device_off ? 0 : (d.ratio_agg*hex_area_h) +(i*hex_pad) +(i*hex_pad_sub) : 0;
					return 'translate(' +x +',' +y +')';
				});
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
				.data(function(d){ return filters_off ? d : d.value; });
			hexes.enter().append('path')
				.classed('hex',true);
			hexes
				.style('opacity',0)
				.attr('d',function(d){ return self.hexbin.hexagon(hex_rad); })
				.attr('transform',function(d,i){
					var row_num = device_off ? i%hex_row_h : Math.floor(i/hex_col_w),
						col_num = device_off ? Math.floor(i/hex_row_h) : i%hex_col_w;
					var x = filters_off ? d.pos.y : col_num*(hex_w*0.75),
						y = filters_off ? d.pos.x : row_num*(hex_h) +((col_num%2)*(hex_h/2));
					return 'translate(' +x +',' +y +')rotate(90)';
				})
				.style('stroke',self.colors[self.mode])
				.style('fill-opacity',function(d){ return d.rating/5; })
				.transition()
				.duration(0)
				.delay(function(d,i){
					if(self.device !== 'mobile'){
						var factor = self.filters.length === 0 ? 3 : self.filters.length === 1 ? 1 : 0.5;
						return Math.random()*i/factor +30;
					} else{
						return 0;
					}
				})
				.style('opacity',1)
				;
			hexes
				.on('mousedown',function(){
					hexTT.style('stroke-width',6);
				})
				.on('mouseup',function(){
					hexTT.style('stroke-width',3);
				})
				.on('mousemove',function(d,i){

					if(!self.freeze && !self.form_visible){
						var x, y;
						var o = d.rating/5;
						var row_num = device_off ? i%hex_row_h : Math.floor(i/hex_col_w),
							col_num = device_off ? Math.floor(i/hex_row_h) : i%hex_col_w;
						var p = self.data_display[d.idx],

							x_trans = filters_off ? hex_coords.x : device_off ? padding.left : (self.w -hex_area_w)/3,
							y_trans = filters_off ? hex_coords.y : device_off ? (self.h -hex_area_h)/1.75 : padding.top,

							x_trans_micro = filters_off ? 0 : device_off && p.ratio_agg ? (p.ratio_agg*hex_area_w) +(d.idx*hex_pad) +(d.idx*hex_pad_sub) : 0,
							y_trans_micro = filters_off ? 0 : device_off && p.ratio_agg ? 0 : (p.ratio_agg*hex_area_h) +(d.idx*hex_pad) +(d.idx*hex_pad_sub);

						x = filters_off ? d.pos.y : col_num*(hex_w*0.75);
						y = filters_off ? d.pos.x : row_num*(hex_h) +((col_num%2)*(hex_h/2));

						x +=(x_trans +x_trans_micro);
						y +=(y_trans +y_trans_micro);

						hexTTG
							.classed('hidden',false)
							.attr('transform',function(){ return 'translate(' +x +',' +y +')rotate(90)'; });
						hexTT.style('fill-opacity',o);

						if(self.device !== 'mobile'){

							//get screen coordinates of tooltip
							var coords = hexTTG.node().getBoundingClientRect();
							var tt_pad = hex_rad_hov*2,
								tt_w = 300,
								tt_h_new = self.anno.node().getBoundingClientRect().height,
								tt_x = coords.left +tt_pad,
								tt_y = coords.top +tt_pad;

							tt_h = tt_h_new !== 0 ? tt_h_new : tt_h;

							tt_x = tt_x +tt_w >self.w ? tt_x -tt_w -tt_pad : tt_x;
							tt_y = tt_y >self.h/2 ? tt_y -tt_h -tt_pad : tt_y;

							self.anno
								.style('left',tt_x +'px')
								.style('top',tt_y +'px');
						}
						self.util_detail_update(d);
					}
				});
			hexes
				.style('opacity',0)
				.exit()
				.remove();

			//labels under groups
			hexesLabels = hexesG.selectAll('text.hexLabel')
				.data(function(d){ return !filters_off ? [d] : false; });
			hexesLabels.enter().append('text')
				.classed('hexLabel',true);
			hexesLabels
				.classed('sub',function(){ return self.filters.length === 2; })
				.attr('x',function(d){ return d.ratio ? device_off ? (self.filters.length <2 ? 0 : 0) : hex_area_w +30 : 0; })
				.attr('y',function(d){ return d.ratio ? device_off ? hex_area_h +30 : 0 : 0; })
				.text(function(d){ 
					var t;
					var split = d.key.split('_');
					if(self.filters.length === 1){
						t = d.value.length >0 ? split.join(' ') : '';
						t = self.filters[0] === 'gender' ? self.util_resolve_gender(t) : t;
					} else if(self.filters.length === 2){
						t = self.util_toTitleCase(split[split.length -1]);
					} else{
						t = '';
					}
					return d.value.length === 0 ? '' : self.util_toTitleCase(t); 
				})
				.style('text-anchor',function(){ return device_off ? (self.filters.length <2 ? 'start' : 'middle') : 'start'; });
			hexesLabels.exit().remove();

			//labels for when double-filters are showing
			hexesLabels_ = hexesG.selectAll('text.hexLabel_')
				.data(function(d){ return self.filters.length === 2 ? [d] : false; });
			hexesLabels_.enter().append('text')
				.classed('hexLabel_',true);
			hexesLabels_
				.attr('x',function(d){ 
					return d.ratio ? device_off ? d.ratio_agg +(hex_area_w*d.ratio) +hex_pad_sub/2 : hex_area_w +60 : 0; 
				})
				.attr('y',function(d){ return d.ratio ? device_off ? hex_area_h +60 : 0 : 0; })
				.text(function(d,i){
					var split = d.key.split('_');
					return d.value.length === 0 ? '' : (split[split.length -1] === 'M' ? self.util_toTitleCase(d.key.substring(0,d.key.length -2).split('_').join(' ')) : ''); 
				})
				.style('text-anchor',function(){ return device_off ? (self.filters.length <2 ? 'start' : 'middle' ) : 'start'; });
			hexesLabels_.exit().remove();

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
				.attr('d',self.hexbin.hexagon(hex_rad_hov))
				.style('fill',self.colors[self.mode]);
			hexTTback.exit().remove();
			hexTT = hexTTG.selectAll('path.hexTT')
				.data(function(d){ return [d]; });
			hexTT.enter().append('path')
				.classed('hexTT',true);
			hexTT
				.attr('d',self.hexbin.hexagon(hex_rad_hov))
				.style('stroke',self.colors[self.mode]);
			hexTT.exit().remove();

			self.menu
				.style('display',function(){
					return self.device !== 'mobile' ? 'block' : 'none';
				});
			self.anno.style('background',function(){
				return self.mode === 0 ? 'rgba(82, 132, 157, 0.75)' : 'rgba(123, 158, 126, 0.75)';
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
					if(btn_id === 'country'){
						self.buckets_country = [];
						d3.selectAll('#country .option').classed('selected',false);
						d3.select('#country_count').text(5);
					}
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
			}
			
			self.mobile_ham.classed('xout',false);
			self.generate();
		},

		/*	====================================================================== 
			UTILITY FUNCTIONS
			====================================================================== */

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
					data = self.data_display[0];
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
			
			d3.select('#country_count').text(5);

			self.btn_filters
				.classed('selected',false)
				.classed('deactivated',false);

			//deselect all dropdown menu selections
			d3.selectAll('li.option').classed('selected',false);

			self.mobile_ham.classed('xout',false);
		},

		//forms
		util_form_center:function(){
			self.form.style('left',window.innerWidth/2 -250 +'px');
			self.form_tweet.style('left',window.innerWidth/2 -250 +'px');
		},
		util_form_clear:function(){
			document.getElementById('input_name').value = '';
			document.getElementById('input_female').checked = false;
			document.getElementById('input_male').checked = false;
			document.getElementById('input_country').selectedIndex = 0;
			document.getElementById('input_age').value = '';
			document.getElementById('input_grade').selectedIndex = 0;
			document.getElementById('input_rating').selectedIndex = 0;
			document.getElementById('input_experience').value = '';
		},
		util_form_hide:function(){
			self.form_visible = false;
			self.form.classed('hidden',true);
			self.form_tweet.classed('hidden',true);
		},
		util_form_show:function(){
			self.form_visible = true;
			self.form.classed('hidden',false);
		},
		util_form_submit:function(){
			var obj = {};

			//gather values into new data object
			obj.subject = self.modes[self.mode];
			obj.name = document.getElementById('input_name').value;
			obj.gender = document.getElementById('input_female').checked ? 'F' : document.getElementById('input_male').checked ? 'M' : '';
			obj.country = document.getElementById('input_country').value;
			obj.age = document.getElementById('input_age').value;
			obj.grade = document.getElementById('input_grade').value;
			obj.rating = self.util_resolve_rating_to_number(document.getElementById('input_rating').value);
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
			_obj.rating = +_obj.rating;

			str_begin = 'I' +self.util_resolve_rating_to_sentence(_obj.rating) +' because "',
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
			self.form_visible = false;
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
			var data = self.data[self.modes[self.mode]];
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
				str_userDetail = (_d.name ? _d.name : self.util_resolve_gender(_d.gender)) +', ' +_d.age +', from ' +_d.country +', has' +self.util_resolve_rating_to_sentence(_d.rating,true) +' since ' +self.util_resolve_grade(_d.grade).toLowerCase() + '<br/><br/><span class="comment" id="user_comment"><p>&ldquo;' +_d.comment +'&rdquo;</p></span>';
			} else{
				str_comment = '&ldquo;' +_d.comment +'&rdquo;';
				str_userDetail = (_d.name ? _d.name : self.util_resolve_gender(_d.gender)) +', ' +_d.age +', from ' +_d.country +', has' +self.util_resolve_rating_to_sentence(_d.rating,true) +' since ' +self.util_resolve_grade(_d.grade).toLowerCase();
			}
			self.anno.style('display','block');
			self.anno_comment.html(str_comment);
			self.anno_userDetail.html(str_userDetail);
		},
		util_detail_clear:function(){
			var str_userDetail = self.device === 'default'? 'Hover over a hexagon for detail.' : self.device === 'tablet' ? 'Tap a hexagon for detail.' : 'Swipe to explore!';
			self.anno_comment.html('<p></p>');
			self.anno_userDetail.html(str_userDetail);
			self.anno.style('display',function(){ return self.device === 'mobile' ? 'block' : 'none' });
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
		util_resolve_rating_to_number:function(_n){
			return (d3.values(self.buckets_rating).indexOf(_n) +1);
		},
		util_resolve_rating_to_sentence:function(_n,_t){
			var n = !isNaN(_n) ? _n : self.util_resolve_rating_to_number(_n),
				tense_past = _t,
				sentence_str;
			if(n === 1){
				sentence_str = (tense_past ? ' hated ' : ' HATE ') +self.modes[self.mode];
			} else if(n === 2){
				sentence_str = (tense_past ? ' disliked ' : ' DISLIKE ') +self.modes[self.mode];
			} else if(n === 3){
				sentence_str = tense_past ? ' been OK with ' +self.modes[self.mode] : ' find ' +self.modes[self.mode] +' OK ';
			} else if(n === 4){
				sentence_str = (tense_past ? ' liked ' : ' LIKE ') +self.modes[self.mode];
			} else if(n === 5){
				sentence_str = (tense_past ? ' loved ' : ' LOVE ') +self.modes[self.mode];
			}
			return sentence_str;
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
		self.mobile_ham.classed('xout',false);
		self.util_detail_clear();
		self.generate();
	}
}