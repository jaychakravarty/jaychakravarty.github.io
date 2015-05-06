
DailyVis = function(_parentElement, _dailyfall,_dailydepth, _currentYear, _eventHandler){
    this.parentElement = _parentElement;
    this.fall = _dailyfall;
    this.depth = _dailydepth
    this.organizeData();
    this.data = this.fall;
    this.eventHandler = _eventHandler;
    this.displayData = [];
    this.fips = [25025];
    this.year = _currentYear;
    this.month = "12";

    // TODO: define all constants here
    this.margin = {top: 20, right: 20, bottom: 30, left: 35},
        this.width =  350 - this.margin.left - this.margin.right,
        this.height = 300 - this.margin.top - this.margin.bottom;


    this.hoverYOffset = -290;
    this.hoverXOffset = -100;

    this.initVis();

}


/**
 * Method that sets up the SVG and the variables
 */
DailyVis.prototype.initVis = function(){


    var that = this; // read about the this

    this.svg = this.parentElement.select("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    //TODO: implement the slider -- see example at http://bl.ocks.org/mbostock/6452972

    this.x = d3.time.scale()
        .range([0, this.width]);

    this.y = d3.scale.linear()
        .range([this.height, 0]);

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom")
        .tickFormat(function(d) { return (d*1); });

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left")
        .tickFormat(function(d) { return d + "\""; });

    this.line = d3.svg.line()
        .x(function(d) { return that.x(d.day); })
        .y(function(d) { return that.y(d.snowfall); })
        .interpolate('linear');

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")

    this.svg.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")

    this.svg.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "black")

    // filter, aggregate, modify data
    this.wrangleData(that.fips);
    // call the update method

    this.x.domain([1,31]);

    this.svg.selectAll("dot")
        .data(that.displayData)
        .enter().append("circle")
        .attr("class", "circle")
        .attr("r", 4)
        .attr("cx", function(d) { return that.x(d.day); })
        .on("mousemove",function(d){
            that.setProbeContent(d);
            that.probe
                .style( {
                    "display" : "block",
                    "top" : (that.y(d.snowfall)) + 290 + "px",
                    "left": (that.x(d.day)) + 5 + "px"
                });
        })
        .on("mouseout",function(){
            that.probe.style("display","none");
        })

    this.probe = this.parentElement.append("div")
        .attr("id","probe_circle")
        .attr("class", "probe");
   

    this.updateVis();
}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
DailyVis.prototype.wrangleData= function(fips){
//AgeVis.prototype.wrangleData= function(){
    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(fips);


}



/**
 * the drawing function - should use the D3 selection, enter, exit
 */
DailyVis.prototype.updateVis = function(){

    var that = this;

    //this.y.domain(d3.extent(this.displayData, function(d) { return d.snowfall; }));
    var range = d3.extent(this.displayData, function(d) { return d.snowfall; });
    range[1] = (parseFloat(range[1]) + 3.0).toString();
    this.y.domain(range);
    //this.y.domain([0,30]);

    // updates axis
    this.svg.select(".x.axis")
        .call(this.xAxis)

    this.svg.select(".y.axis")
        .call(this.yAxis)

    var path = this.svg.select(".line")
        .transition()
        .duration(500)
        .attr("d", that.line(that.displayData));

    this.svg.selectAll(".circle") // change the circle
        .data(that.displayData)
        .transition()
        .duration(750)
        .attr("cy", function(d){return that.y(d.snowfall)});
    
    this.svg.selectAll(".graphtitle")
      .remove() 

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    this.svg.append("text")
        .attr("class", "graphtitle")
        .attr("x", (this.width / 2))             
        .attr("y", -5)
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("fill", "#999")
        .style("font-weight", "bold") 
        .text("Daily Snowfall in " + months[this.month-1]);

}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
DailyVis.prototype.onBarClicked = function (fips,month,year){
    var that = this;

    this.year = year; 
    this.month = month;
    this.fips = fips;
    this.wrangleData(this.fips);
    this.updateVis();
}

DailyVis.prototype.onSelectionChange = function (fips,year){
    var that = this;

    this.year = year; 
    if (fips.length > 0) {
        this.fips = fips;
        this.wrangleData(this.fips);
        this.updateVis();
    }
}

DailyVis.prototype.toggle= function(){
// toggles dataset between depth and fall
    val = $('input[name="scale"]:checked').val();
    if (val == "depth")
        this.data = this.depth;
    else
        this.data = this.fall;
    this.wrangleData(this.fips);
    this.updateVis();
}


/*
 *
 * ==================================
 * From here on only HELPER functions
 * ==================================
 *
 * */

/**Organizes data by year for easy filtering**/
DailyVis.prototype.organizeData = function(){
    this.fall = d3.nest()
        .key(function(d) { return d.year; })
        .key(function(d) {return d.month;})
        .entries(this.fall);

    this.depth = d3.nest()
        .key(function(d) { return d.year; })
        .key(function(d) {return d.month;})
        .entries(this.depth);
}

/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */

DailyVis.prototype.setProbeContent = function(d){

    var html =  "<strong>" + "Day: " + d.day + "</strong>" + "<br/>" + d.snowfall + "\"";
    this.probe
        .html( html );
}

DailyVis.prototype.filterAndAggregate = function(fips){


    var that = this;
    var data = this.data.filter(function(d){ return (d.key == that.year)});

    data = data[0].values;
    data = data.filter(function(d){return (d.key == that.month)});

    data = data[0].values;
    var all_counties = [];
    for (i = 0; i<fips.length; i++) {
        data.map(function(d) {
            if (d.fips == fips[i])
                all_counties.push(d);
        })
    }
    var new_data = d3.range(31).map(function () {
        return 0;
    });
    var snfls = [];

    for (var i = 0; i<all_counties.length; i++) {
        var temp = ExtractSnflDailyVals(all_counties[i]);
        snfls.push(temp);
    }

    for (var i = 0; i <= 30; i++){
        for (var j = 0; j < snfls.length; j++) {
            if (!isNaN(snfls[j][i]))
                new_data[i] += ((snfls[j][i] > 0) ? snfls[j][i] : 0);
        }
        new_data[i] = new_data[i]/snfls.length;
    }

    if (isNaN(new_data[0])) {
        new_data = d3.range(31).map(function () {
        return 0;
        });
    }
    var res = [];
    new_data.map(function (d,i) {
        obj = {"snowfall": (Math.round( d * 10 ) / 10), "day": i+1};
        res.push(obj);
    })
    
    return res;

}

function ExtractSnflDailyVals(row){
    var monthlySnfl = [];
    for (var i=1; i<=31; i++){
        var dailySnfl = +row["day" + i.toString()];
        monthlySnfl.push( (dailySnfl >= 0) ? dailySnfl : 0 );
    }
    return monthlySnfl;
}
