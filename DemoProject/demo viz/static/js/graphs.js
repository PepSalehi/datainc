queue()
    .defer(d3.csv, "static/csv/sample3.csv")
    .defer(d3.json, "static/geojson/tfl_stations.json")
    .defer(d3.json, "static/geojson/tfl_lines.json")
    .await(makeGraphs);

function makeGraphs(error, demandJson, statesJson) {

	//Clean demandJson data
	var demand = demandJson;
	var dateFormat = d3.time.format("%y-%b-%d");


	// var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	demand.forEach(function(d) {
		// debugger;
		d["day"] = dateFormat.parse(d["day"]);
		d["day"].setDate(1); // don't know that this does
		d["total"] = +d["total"];
		d["arr_time"] = +d["arr_time"];
		d["exit_time"] = +d["exit_time"];
		d.hist_total = +d.hist_total;
		d.travelTime = +(d["exit_time"] - d["arr_time"]);
		d.hist_total = +d.hist_total;
		// debugger;
	});
	//Create a Crossfilter instance
	var ndx = crossfilter(demand);

	//Define Dimensions
	var dateDim = ndx.dimension(function(d) { return d["day"]; });
	var originDim = ndx.dimension(function(d) { return d["origin"]; });
	var destinationDim = ndx.dimension(function(d) { return d["destination"]; });
	// var arrivalTimeDim = ndx.dimension(function(d) { return d["arr_time"]; });
	var totalDim  = ndx.dimension(function(d) { return d["total"]; });
	var stateDim = ndx.dimension(function(d){ return d["destination"]});
	var travelTimeDim = ndx.dimension(function(d){return d["travelTime"];});

	var arrivalTimeDim = ndx.dimension(function(d){return d.arr_time;});

	//Calculate metrics
	var numProjectsByDate = dateDim.group(); 
	var numOrigin = originDim.group();
	var DestinationGroupCount = destinationDim.group().reduceCount(function(d){
		return d.destination;
	});
	// var historicalDestination = destinationDim.group().reduceCount(function(d){
	// 	return d.hist_dest;
	// })
	var arrivalPer15min = arrivalTimeDim.group().reduceSum(function(d){
		return d.total;
	});
	// var arrivalTimeGroup = arrivalTimeDim.group().reduceSum(function(d){
	// 	return d.hist_total;
	// })

	var histArrivalPer15min = arrivalTimeDim.group().reduceSum(function(d){
		return d.hist_total;
	})
	var totalDemandByStation = stateDim.group().reduceSum(function(d) {
		return d["total"];
	});
	var travelTimeGroup = travelTimeDim.group().reduceCount(function(d){
		return  d["travelTime"];
	});
	var all = ndx.groupAll();
	var totalDemand = ndx.groupAll().reduceSum(function(d) {return d["total"];});
	var totalHistoricalDemand = ndx.groupAll().reduceSum(function(d) {return d["hist_total"];});
	var max_state = totalDemandByStation.top(1)[0].value; // what is this?

	//Define values (to be used in charts)
	var minDate = arrivalTimeDim.bottom(1)[0]["arr_time"];
	var maxDate = arrivalTimeDim.top(1)[0]["arr_time"];
	var maxTravelTime = travelTimeDim.top(1)[0]["travelTime"];
	var minTravelTime = travelTimeDim.bottom(1)[0]["travelTime"];
	var maxDemand = totalDim.top(1)[0]["total"];
    //Charts
	var timeChart = dc.lineChart("#time-chart");
	var travelTimeChart = dc.barChart("#resource-type-row-chart");
	var destinationChart = dc.barChart("#poverty-level-row-chart");
	var usChart = dc.geoChoroplethChart("#us-chart");
	var totalHistDemandND = dc.numberDisplay("#number-projects-nd");
	var totalDemandND = dc.numberDisplay("#total-donations-nd");
	// var histOverview = dc.lineChart("#second_time_chart");
	// debugger;
	timeChart
		.width(800)
		.height(230)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.dimension(arrivalTimeDim)
		.group(arrivalPer15min, "Observed")
		.ordinalColors(["orange"])
		// .stack(histArrivalPer15min, "historical")
		.transitionDuration(500)
		.renderArea(true)
		.elasticY(false)
		.x(d3.scale.linear().domain([minDate, maxDate+.5]))
		// .legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
		.xAxisLabel("Time")
		.yAxis().ticks(4);

	///////////
	// composite brushing does not work yet, a bug in api.
	//////////
	var time1 = dc.lineChart("#second_time_chart")
				.dimension(arrivalTimeDim)
				.group(arrivalPer15min, "Observed")
				.x(d3.scale.linear().domain([minDate, maxDate]))
				.y(d3.scale.linear().domain([0, maxDemand]))
				// .renderHorizontalGridLines(true);
	var time2 = dc.lineChart("#second_time_chart")
				.dimension(arrivalTimeDim)
				.group(histArrivalPer15min, "Historical")
				.x(d3.scale.linear().domain([minDate, maxDate]))
				.y(d3.scale.linear().domain([0, maxDemand]))
				// .renderHorizontalGridLines(true);


	var histOverview = dc.compositeChart("#second_time_chart")
		.width(800)
		.height(180)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.transitionDuration(500)
		.dimension(arrivalTimeDim)
		.brushOn(false)
		.elasticY(false)
		.x(d3.scale.linear().domain([minDate, maxDate]))
		.y(d3.scale.linear().domain([0, maxDemand]))
		.legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
		.compose([
			time1,
			time2
            .ordinalColors(["orange"])

			])
		.xAxisLabel("Time")
		.yAxis().ticks(6);
		

	// number of days i.e. 28
	totalHistDemandND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(totalHistoricalDemand)
		.formatNumber(d3.format(".3s"));
	// works fine
	totalDemandND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(totalDemand)
		.formatNumber(d3.format(".3s"));
	//works
	
	// replace with name
	// originChart
 //        .width(300)
 //        .height(250)
 //        .dimension(originDim)
 //        .group(numOrigin)
 //        .xAxis().ticks(4);
 	travelTimeChart
	 	.width(400)
		.height(230)
		.dimension(travelTimeDim)
        .group(travelTimeGroup)
        // .gap(10)
        // .x(d3.scale.ordinal().domain(["Bank", "victoria"]))
        .x(d3.scale.linear().domain([minTravelTime, maxTravelTime+1]))
    	.y(d3.scale.linear().domain([0, 5]))
		.elasticY(false)
		.elasticX(false)
		.centerBar(false)
		.ordinalColors(["red"])
		// .xUnits(dc.units.ordinal)
		.xAxis().tickFormat();

	destinationChart
		.width(500)
		.height(230)
        .dimension(destinationDim)
        .group(DestinationGroupCount)
        // .stack(historicalDestination)
        .x(d3.scale.ordinal().domain([ "Victoria", "Vauxhall", "Stratford", "Whitechapel", "Woodford"]))
    	.y(d3.scale.linear().domain([0, 15]))
		.elasticY(false)
		.elasticX(false)
		.centerBar(false)
		.xUnits(dc.units.ordinal)
        // .xAxis().ticks(4);


	s = [[51.692322, 0.33403], [51.286839, -0.51035]]

    var projection = d3.geo.mercator()
    .center([ -0.143229499999988, 51.4963585 ])
    .scale(40000) //40000
    .translate([1000 / 2, 600 / 2]);

	usChart.width(1000)
		.height(500)
		.dimension(stateDim)
		.group(totalDemandByStation)
		.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
		// .colorDomain([100, max_state])
		// .colors(["#0061B5"])

		.overlayGeoJson(statesJson.features, "states", function (d) {
			return d.properties.name;
		})
		.projection(projection)
	
		

		.title(function (p) {
			return "Station: " + p["key"]
					+ "\n"
					+ "Total Demand: " + Math.round(p["value"]) + " pax";
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
	


    dc.renderAll();

};