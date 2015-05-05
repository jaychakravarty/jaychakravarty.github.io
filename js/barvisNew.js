/*
 *
 * ======================================================
 * We follow the vis template of init - wrangle - update
 * ======================================================
 *
 * */

/**
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _eventHandler -- the Eventhandling Object to emit data to (see Task 4)
 * @constructor
 */
BarVis = function(_parentElement, _data, _currentYear, _startFips, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    this.currentYear = _currentYear;
    this.fips = _startFips;

    // defines constants
    this.margin = {top: 20, right:0, bottom: 80, left: 40},
        this.width = 350 - this.margin.left - this.margin.right,
        this.height = 300 - this.margin.top - this.margin.bottom;

    this.initVis();
}

/*
 /**
 * Method that sets up the SVG and the variables
 */
BarVis.prototype.initVis = function(){

    var that = this;
    // constructs SVG layout
    this.svg = this.parentElement.select("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // creates axis and scales
    this.y = d3.scale.linear()
        .range([this.height,0]);

    this.x = d3.scale.ordinal()
        .rangeRoundBands([0, this.width], .1);

    //this.color = d3.scale.category20();

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .ticks(12)
        .orient("bottom");


    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left")
        .tickFormat(function(d) { return d + "\""; });

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")");

    this.svg.append("g")
        .attr("class", "y axis")
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")

    this.probe = this.parentElement.append("div")
        .attr("id","probe_bar")
        .attr("class", "probe")
   
    // filter, aggregate, modify data
    this.wrangleData(that.fips,that.currentYear);

    // call the update method
    this.updateVis();
}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
BarVis.prototype.wrangleData= function(fips,year){

    // displayData should hold the data whiche is visualized
    this.displayData = this.filterAndAggregate(fips,year);
 
}



/**
 * the drawing function - should use the D3 selection, enter, exit
 */
BarVis.prototype.updateVis = function(){


    var that = this;
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // updates axis

    this.x.domain(months);

    var range = d3.extent(this.displayData, function(d) { return d.values.snow_fall; });
    range[1] = (parseFloat(range[1]) + 3.0).toString();
    this.y.domain(range);
    // updates graph

    // Data join
    var bar = this.svg.selectAll(".bar")
        .data(this.displayData, function(d,i) { return months[(parseInt(d.key))-1]; })

    // Append new bar groups, if required
    var bar_enter = bar.enter().append("g")
        //.on('mouseover', that.tip.show)
        //.on('mouseout', that.tip.hide);


    // Append a rect and a text only for the Enter set (new g)
    bar_enter.append("rect")


    // Add attributes (position) to all bars
    bar
        .attr("class", "bar")
        .transition()
        .attr("transform", function(d, i) { return "translate(" + that.x(months[(parseInt(d.key))-1]) + ",0)"; })


    // Remove the extra bars
    bar.exit()
        .remove();

    // Update all inner rects and texts (both update and enter sets)

    bar.select("rect")
        .attr("x", 0)
        .attr("width", this.x.rangeBand())
        .transition()
        .attr("y", function(d){ return that.y(d.values.snow_fall);})
        .attr("height", function(d) {
            return that.height - that.y(d.values.snow_fall)
        })

    var yaxis = this.svg.select(".y.axis")
        .call(this.yAxis)




    var xaxis = this.svg.select(".x.axis")
        .call(this.xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.50em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
            return "rotate(-65)"
        });

    bar_enter
        .on("click", function(d,i ) {
            $(that.eventHandler).trigger("barClicked",d);
        })
        .on("mousemove",function(d){
            that.setProbeContent(d);
            that.probe
                .style( {
                    "display" : "block",
                    "top" : (that.y(d.values.snow_fall)) - 38 + "px",
                    "left": (that.x.rangeBand()*parseInt(d.key)) + "px"
                });
        })
        .on("mouseout",function(){
            //that.hoverData = null;
            that.probe.style("display","none");
        })

    this.svg.selectAll(".graphtitle")
      .remove() 

    this.svg.append("text")
        .attr("class", "graphtitle")
        .attr("x", (this.width / 2))             
        .attr("y", -5)
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("fill", "#999")
        .style("font-weight", "bold") 
        .text("Monthly Snowfall in" + this.currentYear);


}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
BarVis.prototype.onSelectionChange = function (fips,year){

    /*this.wrangleData(function(d){
     return (fips == d.fips && year == d.year);});*/
    if (fips.length > 0) {
        this.fips = fips;
        this.currentYear = year;
        this.wrangleData(fips,year);
        this.updateVis();
    }
}


/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
BarVis.prototype.filterAndAggregate = function(fips,year){


    var that = this;

    var data = this.data.filter(function(d){return d.year == year});

    var res = [];
    for (i = 0; i<fips.length; i++) {
        data.map(function(d) {
            if (d.fips == fips[i])
                res.push(d);
        })
    }

    var aggregated_data = [];
    if (res.length < 1)
    {
        for (var i = 1; i < 13; i ++) {
        aggregated_data.push({ key: i.toString() , values: {"snow_fall" : 0, "fips": that.fips}})
        }
    }
    else{
    
        aggregated_data = d3.nest()
            .key(function(d) { return d.month; })
            .rollup(function(leaves) { return {"snow_fall": d3.sum(leaves, function(d) {
                return d.monthly}), "fips": that.fips}})
            .entries(res);
    }

    return aggregated_data;

}

BarVis.prototype.setProbeContent = function(d){

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var html =  "<strong>" + months[(parseInt(d.key))-1] + "</strong>" + "<br/>" + d.values.snow_fall + "\"";
    this.probe
        .html( html );
}