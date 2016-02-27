queue()
    .defer(d3.csv, "static/csv/sampledata.csv")
    // .defer(d3.csv, "static/csv/JS_input.csv")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, demandJson, statesJson, histJson) {

	/////////
	// http://www.codeproject.com/Articles/693841/Making-Dashboards-with-Dc-js-Part-1-Using-Crossfil
// 	function print_filter(filter){
// 	var f=eval(filter);
// 	if (typeof(f.length) != "undefined") {}else{}
// 	if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
// 	if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
// 	console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
// } 
/////////////////////

	//Clean demandJson data
	var demand = demandJson;
	var dateFormat = d3.time.format("%y-%b-%d");
	var timeFormat = d3.time.format("%H:%M");

	// var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	demand.forEach(function(d) {
		// debugger;
		// d["day"] = dateFormat.parse(d["day"]);
		d["total"] = +d["total"];
		d["DEP_TIME"] = +d["DEP_TIME"];
		d["ARR_TIME"] = +d["ARR_TIME"];
		d["TimeBIn2"] = +d["TimeBIn2"];
		d.hist_total = parseFloat(d.hist_total) ;
		// d.hist_total = +d.hist_total;
		d.travelTime = +(d["ACTUAL_ELAPSED_TIME"]);

		var today = new Date(2015, 12, 25);
		var hrs = 0;
		d.Date = new Date(today.getTime() + hrs*60*60*1000 + d.TimeBIn2*60*60*1000)
		
		// debugger;
	});




	//Create a Crossfilter instance
	var ndx = crossfilter(demand);


	//Define Dimensions
	// var dateDim = ndx.dimension(function(d) { return d["day"]; });
	// var originDim = ndx.dimension(function(d) { return d["origin"] ; });
	var destinationDim = ndx.dimension(function(d) { return d["DEST_STATE_ABR"]  });
	// var arrivalTimeDim = ndx.dimension(function(d) { return d["TimeBIn2"]; });
	var arrivalTimeDim = ndx.dimension(function(d) { return d["Date"]; });
	var totalDim  = ndx.dimension(function(d) { return d["total"]; });
	var stateDim = ndx.dimension(function(d){ return d["DEST_STATE_ABR"]});
	var travelTimeDim = ndx.dimension(function(d){return d["travelTime"];});

	var statusDim = ndx.dimension(function(d){return d["status"]})
	var airlineDim = ndx.dimension(function(d){return d["CARRIER"]})
	


	// debugger;

	//Calculate metrics
	// var numProjectsByDate = dateDim.group(); 
	// var numOrigin = originDim.group();
	var DestinationGroupCount = destinationDim.group().reduceCount(function(d){
		return d.destination;
	});

	var statusGroup = statusDim.group().reduceCount(function(d){ return d.status})
	var airlineGroup = airlineDim.group().reduceCount(function(d){return d.carrier})
	var arrivalPer15min = arrivalTimeDim.group().reduceSum(function(d){
		return d.total;
	});

	var totalDemandByStation = stateDim.group().reduceSum(function(d) {
		return d["total"];
	});

//http://stackoverflow.com/questions/29438515/uniformly-spaced-histogram-bins-with-dc-js
	var binwidth = 10;
	var travelTimeGroup = travelTimeDim.group().reduceCount(function(d){
		return   Math.floor(d["travelTime"]/binwidth);
	});
	var all = ndx.groupAll();
	var totalDemand = ndx.groupAll().reduceSum(function(d) {return d["total"];});
	var max_state = totalDemandByStation.top(1)[0].value; // what is this?



	//Define values (to be used in charts)
	var minDate = arrivalTimeDim.bottom(1)[0]["Date"];
	var maxDate = arrivalTimeDim.top(1)[0]["Date"];

	var maxTravelTime = travelTimeDim.top(1)[0]["travelTime"];
	var minTravelTime = travelTimeDim.bottom(1)[0]["travelTime"];
	var maxDemand = totalDim.top(1)[0]["total"];

    //Charts
	var timeChart = dc.lineChart("#time-chart");
	var travelTimeChart = dc.barChart("#resource-type-row-chart");
	var carrierChart = dc.barChart("#poverty-level-row-chart");
	var usChart = dc.geoChoroplethChart("#us-chart");
	// var totalHistDemandND = dc.numberDisplay("#number-projects-nd");
	var totalDemandND = dc.numberDisplay("#total-donations-nd");
	var statusChart = dc.barChart("#second_time_chart");
	// debugger;
	timeChart
		.width(800)
		.height(230)
		.margins({top: 10, right: 30, bottom: 30, left: 50})
		.dimension(arrivalTimeDim)
		.group(arrivalPer15min, "Observed")
		// .ordinalColors(["orange"])
		// .stack(histArrivalPer15min, "historical")
		.transitionDuration(500)
		.renderArea(true)
		// .elasticX(true)
		.elasticY(true)
		// .x(d3.scale.linear().domain([minDate, maxDate+.5]))
		.x(d3.time.scale().domain([minDate, maxDate]))
		.xUnits(d3.time.min)
	    .renderHorizontalGridLines(true)
		// .legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
		.xAxisLabel("Time")
		.yAxis().ticks(4);
		// .xAxis().ticks(5);


	statusChart
	 	.width(350)
		.height(300)
		.dimension(statusDim)
        .group(statusGroup)
		.margins({top: 10, right: 10, bottom: 30, left: 50})
        .gap(1)
        // .x(d3.scale.ordinal().domain(["Bank", "victoria"]))
        .x(d3.scale.ordinal().domain(["on time", "late"]))
    	.y(d3.scale.linear().domain([0, 18700]))
		.elasticY(true)
		.elasticX(false)
		.centerBar(false)
		// .ordinalColors(["red"])
		// .xAxisLabel("Minutes")
		.xUnits(dc.units.ordinal)
		.brushOn(false)
	    .xAxis().tickFormat();  

		// .xUnits(function(d){return 30;})
		// .xUnits(dc.units.fp.precision(binwidth))
		// .on("preRedraw", function (chart) {
	 //        chart.rescale();
		// 	})
	
		

	// number of days i.e. 28
	//http://bl.ocks.org/zanarmstrong/05c1e95bf7aa16c4768e
	// totalHistDemandND
	// 	.formatNumber(d3.format(".0f"))
	// 	.valueAccessor(function(d){return d; })
	// 	.group(totalHistoricalDemand)
		// .formatNumber(d3.format(",d"));
	// works fine
	totalDemandND
		.formatNumber(d3.format(".0f"))
		.valueAccessor(function(d){return d; })
		.group(totalDemand)
		// .formatNumber(d3.format(",d"))

		// .formatNumber(d3.format(".3s"));
	//works
	

 	travelTimeChart
	 	.width(450)
		.height(300)
		.dimension(travelTimeDim)
        .group(travelTimeGroup)
		.margins({top: 10, right: 10, bottom: 30, left: 30})
        // .gap(10)
        // .x(d3.scale.ordinal().domain(["Bank", "victoria"]))
        .x(d3.scale.linear().domain([minTravelTime, maxTravelTime+1]))
    	.y(d3.scale.linear().domain([0, 800]))
		.elasticY(true)
		.elasticX(false)
		.centerBar(false)
		.ordinalColors(["red"])
		.xAxisLabel("Minutes")

		// .xUnits(function(d){return 30;})
		// .xUnits(dc.units.fp.precision(binwidth))
		// .on("preRedraw", function (chart) {
	 //        chart.rescale();
		// 	})
		// travelTimeChart.on("preRender", function (chart) {
		//     chart.rescale();
		// 	})
		.xAxis().tickFormat();

	// destinationChart
	// 	.width(1850)
	// 	.height(230)
	// 	.margins({top: 10, right: 10, bottom: 20, left: 50})
 //        .dimension(destinationDim)
 //        .group(DestinationGroupCount)
 //        // .stack(historicalDestination)
 //        // .x(d3.scale.ordinal().domain([ "Victoria", "Vauxhall", "Stratford", "Whitechapel", "Woodford"]))
 //        .x(d3.scale.ordinal())
 //    	.y(d3.scale.linear().domain([0, 15]))
	// 	.elasticY(true)
	// 	.elasticX(false)
	// 	.centerBar(false)
	// 	.xUnits(dc.units.ordinal)
	// 	.xAxisLabel("Stations")
 //        .xAxis().tickFormat(function(v) { return ""; });

    carrierChart
		.width(1850)
		.height(230)
		.margins({top: 10, right: 10, bottom: 20, left: 50})
        .dimension(airlineDim)
        .group(airlineGroup)
        // .stack(historicalDestination)
        // .x(d3.scale.ordinal().domain([ "Victoria", "Vauxhall", "Stratford", "Whitechapel", "Woodford"]))
        .x(d3.scale.ordinal())//.domain([ "American Airlines", "Alaska Airlines", "JetBlue", "Delta", "ExpressJet", "Spirit", "SkyWest" , "United", "US Airways", "Virgin America", "Southwest"]))
    	.y(d3.scale.linear().domain([0, 11000]))
		.elasticY(true)
		.elasticX(false)
		.centerBar(false)
		.xUnits(dc.units.ordinal)
		// .xAxisLabel("Carriers")
        // .xAxis().tickFormat(function(v) { return ""; });




	s = [[51.692322, 0.33403], [51.286839, -0.51035]]

    var projection = d3.geo.albersUsa()
    // .center([ -0.143229499999988, 51.4963585 ])
    .scale(1070) //40000
    .translate([1000 / 2, 500 / 2]);

// ////////////////
// 	function zoomed() {
// 	    projection
// 	    .translate(d3.event.translate)
// 	    .scale(d3.event.scale);
// 	    usChart.render();
// 	}
// 	var zoom = d3.behavior.zoom()
//     .translate(projection.translate())
//     .scale(projection.scale())
//     .scaleExtent([450/2, 8 * 450])
//     .on("zoom", zoomed);

// var svg = d3.select("#us-chart")
//     .attr("width", 1000)
//     .attr("height", 450)
//     .call(zoom);
// ////////////////
	usChart.width(1000)
		.height(450)
		.dimension(stateDim)
		.group(totalDemandByStation)

		.colors(d3.scale.quantize().range(['#fdd49e', '#fdae6b','#fd8d3c','#f16913','#d94801','#8c2d04']))
        .colorDomain([0, max_state])
        .colorCalculator(function (d) { return d ? usChart.colors()(d) : '#fef0d9'; })


		// .colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
		// .colorDomain([0, max_state])
		// .colors(['#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000'])

		//https://github.com/dc-js/dc.js/issues/419
		usChart.on("preRender", function(chart) {
            chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
        })
        usChart.on("preRedraw", function(chart) {
            chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
        })


		.overlayGeoJson(statesJson.features, "states", function (d) {
			return d.properties.name;
		})
		// .overlayGeoJson(linesJson.features, "lines").colors(['#81C5FF']) 
		.projection(projection)
	
		

		.title(function (p) {
			return "Station: " + p["key"]
					+ "\n"
					+ "Total Demand: " + Math.round(p["value"]) + " passengers";
		})


	// var geondx = crossfilter(statesJson); 	
	// var facilities = geondx.dimension(function(d){ return d.geometry.coordinates;});
	// var facilitiesGroup = facilities.group().reduceCount();
	// dc.leafletMarkerChart("#us-chart","marker-select")
	//   .dimension(facilities)
	//   .group(facilitiesGroup)
	//   .width(1000)
	//     .height(300)
	//   .center([42.69,25.42])
	//   .zoom(7)
	//   .renderPopup(true)
	//   .popup(function(d, marker){
	//     return d.key + " : " + d.value;
	//   })
	//   .cluster(false);
	

	// canary wharf with the most long (delayed) travel times
    dc.renderAll();

};