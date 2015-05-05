DailyVis = function(_parentElement, _data, _currentYear, _eventHandler){
    this.parentElement = _parentElement;
    this.data = _data;
    this.organizeData();
    this.eventHandler = _eventHandler;
    this.displayData = [];
    this.year = _currentYear;
    this.month = "12";

    // TODO: define all constants here
    this.margin = {top: 20, right: 20, bottom: 30, left: 30},
        this.width =  350 - this.margin.left - this.margin.right,
        this.height = 300 - this.margin.top - this.margin.bottom;
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
        .orient("bottom");

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left");

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
    this.wrangleData(function(d){ return (d.county == "AROOSTOOK");});
    // call the update method

    this.x.domain([1,31]);

    this.svg.selectAll("dot")
        .data(that.displayData)
        .enter().append("circle")
        .attr("class", "circle")
        .attr("r", 4)
        .attr("cx", function(d) { return that.x(d.day); })

    this.updateVis();
}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
DailyVis.prototype.wrangleData= function(_filterFunction){
//AgeVis.prototype.wrangleData= function(){
    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);


}



/**
 * the drawing function - should use the D3 selection, enter, exit
 */
DailyVis.prototype.updateVis = function(){

    var that = this;

    this.y.domain(d3.extent(this.displayData, function(d) { return d.snowfall; }));

    // updates axis
    this.svg.select(".x.axis")
        .call(this.xAxis);

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
    /*
     this.svg.selectAll(".circle")
     .remove()
     this.svg.selectAll(".line")
     .remove()
     this.svg.append("path")
     .attr("class", "line")
     .attr("fill", "none")
     .attr("stroke", "black")
     .transition()
     .attr("d", that.line(that.displayData));*/
    /*
     this.svg.selectAll(".circle")
     .data(that.displayData)
     .enter().append("circle")
     .attr("class", "circle")
     .attr("fill", that.displayData[0]["color"])
     .attr("r", 3.5)
     .transition()
     .attr("cx", function(d) { return that.x(d.day); })
     .attr("cy", function(d) { return that.y(d.snowfall); });
     */
    /*
     this.svg.selectAll(".graphtitle")
     .remove()
     this.svg.append("text")
     .attr("class", "graphtitle")
     .attr("x", (this.width / 2))
     .attr("y", 0)
     .attr("text-anchor", "middle")
     .style("font-size", "16px")
     .text(that.displayData[0]["county"]);*/


}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
DailyVis.prototype.onBarClicked = function (county,month,year){
    var that = this;

    this.year = year;
    if (month.length < 2)
        month = "0" + month;
    console.log(month);
    this.month = month;

    this.wrangleData(function(d){ return (d.county == county);});
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
    this.data = d3.nest()
        .key(function(d) { return d.year; })
        .key(function(d) {return d.month;})
        .entries(this.data);
}

/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
DailyVis.prototype.filterAndAggregate = function(_filter){


    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    if (_filter != null){
        filter = _filter;
    }
    //Dear JS hipster, a more hip variant of this construct would be:
    // var filter = _filter || function(){return true;}

    var that = this;
    var data = this.data.filter(function(d){ return (d.key == that.year)});
    data = data[0].values;
    data = data.filter(function(d){return (d.key == that.month)});
    data = data[0].values;
    data = data.filter(filter);
    var res = [];
    var new_data = d3.range(31).map(function () {
        return 0;
    });
    var snfls = [];

    for (var i = 0; i<data.length; i++) {
        var temp = ExtractSnflDailyVals(data[i]);
        snfls.push(temp);
    }

    var dailySnfl = ExtractSnflDailyVals(data[0]);

    for (var i = 0; i <= 30; i++){
        for (var j = 0; j < snfls.length; j++) {
            new_data[i] += ((snfls[j][i] > 0) ? snfls[j][i] : 0);
        }
        new_data[i] = new_data[i]/snfls.length;
    }

    new_data.map(function (d,i) {
        obj = {"snowfall": d, "day": i+1};
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
