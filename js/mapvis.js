MapVis = function(_parentElement, _fipsToCountyMap, _usData, _snflData, _currentYear, _startFips, _eventHandler){

    //Years
    this.minYear =2005;
    this.maxYear =2015;

    this.parentElement = _parentElement;
    this.fipsToCountyMap = _fipsToCountyMap;
    this.usData = _usData;
    this.snflDataMap = d3.map();
    this.snflData = this.organizeData(_snflData);

    this.currentYear = _currentYear;
    this.startFips = _startFips;

    this.eventHandler = _eventHandler;
    this.displayData = d3.map();

    // defines constants
    this.margin = {top: 0, right: 0, bottom: 0, left: 0},
    this.width = 960 - this.margin.left - this.margin.right,
    this.height = 600 - this.margin.top - this.margin.bottom;

    //Map zoom var
    this.centered;

    this.proximityStart;
    this.proximityEnd;
    this.proximityRadius;

    //Map scale
    this.mapScale = 1200;

    //Map hover-over
    this.hoverYOffset = -290;
    this.hoverXOffset = -100;

    //Drag Selection
    this.radius = 20;
    this.maxRad = 200;
    this.maxRadZoom = 80;
    this.minRad = 10;

    this.zoomScaleMin = 0.3;
    this.zoomScaleMax = 4.35;

    this.minProximity = 0.25;
    this.maxProximity = 2.5;

    this.selectedCountyFips = new Array();
    this.maxDistInProximity = 0.00;

    //Legend els
    this.legendRectWidth = 20;
    this.legendRectHeight = 20;

    //TODO Update Legend Variables
    this.color_domain = [1, 2, 4, 8, 10, 20, 35, 60, 110];
    this.ext_color_domain = [0, 1, 2, 4, 8, 10, 20, 35, 60];
    this.legend_labels = [
        "< 1in",
        "2in",
        "4in",
        "8in",
        "10in",
        "20in",
        "35in",
        "60in",
        ">110in"
    ];

    this.snflMax = 100;
    this.snflMin = 0;
    this.quantizeRange = 9;

    this.color = d3.scale.linear()
        .domain(this.color_domain)
        .range([
            "#f7fbff",
            "#deebf7",
            "#c6dbef",
            "#9ecae1",
            "#6baed6",
            "#4292c6",
            "#2171b5",
            "#08519c",
            "#08306b"
        ])
        .clamp(true);

   
    //this.colorpow = chroma.scale(['bcbaf2', '9998c5', '767592', '514c76','20194b']).domain([1, 100], 10, 'log');
    this.colorpow = chroma.scale(['eaf1fe', '76a2ee', '3475e4','094cbf','052356']).domain([1, 100], 8, 'log');   
 

    //Global Map Reference
    map_instance = this;

    this.initVis();

}

function getMapInstance(){
    return map_instance;
}

MapVis.prototype.organizeData = function(givenData){

    var snflDataNested = d3.nest()
        .key(function(d) {return d.year; })
        .map(givenData);


    for (var i=this.minYear; i<=this.maxYear; i++) {
        var aggregatedMapping = d3.map();
        var data = snflDataNested[i];

        var res = d3.nest()
            .key(function (d) {
                return d.fips;
            })
            .rollup(function (leaves) {
                return {
                    "aggregatedVal": d3.sum(leaves, function (d) {
                        return d.monthly
                    })
                }
            })
            .entries(data);

        res.map(function (d) {
            aggregatedMapping.set(d.key, d.values.aggregatedVal);
        });

        this.snflDataMap.set(i, aggregatedMapping);
    }

    return snflDataNested;
}

/*
/**
 * Method that sets up the SVG and the variables
 */
MapVis.prototype.initVis = function(){

    var that = this;

    //INIT EVENTS
    this.dragBool = false;
    this.dragOnCounty = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", that.dragCountyStart)
        .on("drag", that.dragCountyMove)
        .on("dragend", that.dragCountyEnd);

    this.dragProximityCircle = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", that.dragProximityStart)
        .on("drag", that.dragProximityMove)
        .on("dragend", that.dragProximityEnd);

    this.zoom = d3.behavior.zoom()
        .scaleExtent([0.3,4.35])
        .on("zoom", that.zoomOnCounty);

    //INIT Thresholds
    /*
    this.quantize = d3.scale.quantize()
        .domain([that.snflMin, that.snflMax])
        .range(d3.range(that.quantizeRange).map(function(i) { return "q" + i + "-9"; }));*/

    //INIT MAP
    this.projection = d3.geo.albersUsa()
        .scale(that.mapScale)
        .translate([that.width / 2, that.height / 2]);

    this.path = d3.geo.path()
        .projection(that.projection);

    //CONSTRUCT SVG
    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)

    this.mapGroup = this.svg.append("g");

    this.mapGroup.append( "rect" )
        .attr("width",that.width)
        .attr("height",that.height)
        .attr("fill","white")
        .attr("opacity",0)
        .on("mouseover",function(){
            //that.hoverData = null;
            if ( that.probe ) that.probe.style("display","none");
        });

    this.map = this.mapGroup.append("g")
        .attr("id","map");

    this.counties = this.map.append("g")
        .attr("id","counties");

    this.stateBoundaries = this.map.append("g")
        .attr("id","state-boundaries");

    //BUILD MAP
    this.counties.selectAll("path")
        .data(topojson.feature(that.usData, that.usData.objects.counties).features)
        .enter()
        .append("path")
        .attr("vector-effect","non-scaling-stroke")
        .attr("d", that.path)
        .on("mousemove",function(d){
            that.setProbeContent(d);
            that.probe
                .style( {
                    "display" : "block",
                    "top" : d3.event.pageY + that.hoverYOffset + "px",
                    "left" : d3.event.pageX + that.hoverXOffset + "px"
                });
        })
        .on("mouseout",function(){
            that.probe.style("display","none");
        })
        .call(that.dragOnCounty);


    this.counties.selectAll("path")
        .each( function(d){
            d["XY"] = that.getMapCoordOfCounty(d);
        });

    this.stateBoundaries.selectAll("path")
        .datum(topojson.mesh(that.usData, that.usData.objects.states, function(a, b) { return a !== b; }))
        .append("path")
        .attr("class", "state-boundary")
        .attr("vector-effect","non-scaling-stroke")
        .attr("d", that.path);

    this.proximityCircle = this.map.selectAll("circle")
        .data( [{x: 0, y: 0}] )
        .enter()
        .append("circle")
        .attr("id", "proximity-circle")
        .attr("r", that.radius)
        .attr("cx", function(d) {return d.x;})
        .attr("cy", function(d) {return d.y;})
        .classed("proximity-hidden", true)
        .on("mousemove",function(d){
            that.setProximityProbeContent();
            that.probe
                .style( {
                    "display" : "block",
                    "top" : d3.event.pageY + that.hoverYOffset + "px",
                    "left" : d3.event.pageX + that.hoverXOffset + "px"
                });
        })
        .on("mouseout",function(){
            that.probe.style("display","none");
        })
        .call(that.dragProximityCircle)
        .call(that.zoom);

    this.probe = this.parentElement.append("div")
        .attr("id","probe")
        .attr("class","probe");

    //MAP CONSTANTS
    this.snflMax = 30;
    this.snflMin = 0;
    this.snflInvalid = -9999.000;


    //LEGEND
    this.legend = d3.select("#legend-container").append("svg").attr("height", that.height)
        .selectAll("g.legend")
        .data(that.ext_color_domain)
        .enter().append("g")
        .attr("class", "legend");

    this.legend.append("rect")
        .attr("x", 65)
        .attr("y", function(d, i){ return that.height*.75 - (i*that.legendRectHeight) - 2*that.legendRectHeight;})
        .attr("width", that.legendRectWidth)
        .attr("height", that.legendRectHeight)
        .style("fill", function(d, i) { return that.color(d); });
        //.style("opacity", 0.8);

    this.legend.append("text")
        .attr("x", 90)
        .attr("y", function(d, i){ return that.height*.75 - (i*that.legendRectHeight) - that.legendRectHeight - 4;})
        .text(function(d, i){ return that.legend_labels[i]; });

    //UPDATES
    this.wrangleData(that.currentYear);
    //this.wrangleData(function(d){ return d.year == that.currentYear;});
    this.updateVis();
}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
MapVis.prototype.wrangleData= function(_filterFunction){

    this.displayData = this.filterAndAggregate(_filterFunction);
}


/**
 * the drawing function - should use the D3 selection, enter, exit
 */
MapVis.prototype.updateVis = function(){

    var that = this;

    this.counties.selectAll("path")
        .attr("class", function(d) {
            var val = that.displayData.get(d.id);
            if (val != undefined) {
                return "q" + ((that.colorpow(val).hex()).slice(1));
            }
            else{
                return "qNone-9";
            }
        });
        /*.attr("class", function(d) {
            var val = that.displayData.get(d.id);
            if (val != undefined) {
                return that.quantize(val);
            }
            else{
                return "qNone-9";
            }

        });*/

    if (that.selectedCountyFips.length>0){
        that.UpdateSelectedCounties();
    }

}

/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
MapVis.prototype.onSelectionChange = function (year){

    //this.wrangleData(function(d){ return d.year == year;});
    this.currentYear = year;
    this.wrangleData(year);
    this.updateVis();
}

/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */
MapVis.prototype.filterAndAggregate = function(yearNum){

    return this.snflDataMap.get(yearNum);
}

//Helpers for dragging
///////////////////////////////////////////////////////////////
MapVis.prototype.dragCountyMove = function(d) {

    var that = getMapInstance();

    that.dragBool = true;
    that.proximityEnd = d3.mouse(this);

    that.radius = Math.sqrt(
        Math.pow(that.proximityEnd[0] - that.proximityStart[0], 2) +
        Math.pow(that.proximityEnd[1] - that.proximityStart[1], 2)
    );

    //New
    var maxRadToUse = (that.centered == null) ? that.maxRad : that.maxRadZoom;
    that.radius = Math.min(that.radius, maxRadToUse);

    d3.select("#proximity-circle")
        .attr("r", that.radius)
        .classed("proximity-hidden", false);

    that.maxDistInProximity = that.radius;
    that.UpdateSelectedCounties();
    //console.log("still dragging");
}

MapVis.prototype.dragCountyStart = function(d) {

    d3.event.scale = 1;

    var that = getMapInstance();

    that.dragBool = false;
    that.proximityStart = d3.mouse(this);

    that.radius = 0;

    d3.select("#proximity-circle")
        .attr("r", that.radius)
        .attr("cx", that.proximityStart[0])
        .attr("cy", that.proximityStart[1])
        .classed("proximity-hidden", true);

    that.maxDistInProximity = that.radius;
    that.UpdateSelectedCounties();



}

MapVis.prototype.dragCountyEnd = function(d){


    var that = getMapInstance();
    var county = d;

    that.selectedCountyFips = new Array();

    that.proximityEnd = d3.mouse(this);
    that.radius = Math.sqrt(
        Math.pow(that.proximityEnd[0] - that.proximityStart[0], 2) +
        Math.pow(that.proximityEnd[1] - that.proximityStart[1], 2)
    );

    //New
    var maxRadToUse = (that.centered == null) ? that.maxRad : that.maxRadZoom;
    that.radius = Math.min(that.radius, maxRadToUse);

    d3.select("#proximity-circle")
        .attr("r", that.radius);

    that.maxDistInProximity = that.radius;

    if(!that.dragBool) {

        that.selectedCountyFips.push(county.id);

        that.setZoomCounty(d);

        d3.event.sourceEvent.stopPropagation();
        $(that.eventHandler).trigger("selectionChanged", {values: that.selectedCountyFips});

    }
    else{
        that.UpdateSelectedCounties();
    }
}

MapVis.prototype.dragProximityStart = function(d) {
    var that = getMapInstance();

    that.dragProximityBool = true;

}

MapVis.prototype.dragProximityEnd = function(d) {
    var that = getMapInstance();

    that.dragProximityBool = false;
}

MapVis.prototype.dragProximityMove = function(d) {

    var that = getMapInstance();


    d3.select("#proximity-circle")
        .attr("cx", d3.mouse(this)[0])
        .attr("cy", d3.mouse(this)[1]);

    that.proximityStart = d3.mouse(this);

    that.UpdateSelectedCounties();
}
///////////////////////////////////////////////////////////////

//Brushing
///////////////////////////////////////////////////////////////
MapVis.prototype.UpdateSelectedCounties = function() {

    var that = getMapInstance();

    //
    //that.counties.selectAll("path")
    //    .each( function(d){
    //        //console.log(d);
    //        var dist = Math.sqrt(
    //            Math.pow(d["XY"][0] - that.proximityStart[0], 2) +
    //            Math.pow(d["XY"][1] - that.proximityStart[1], 2)
    //        );
    //        d3.select(this).classed("active", (dist <= maxDist));
    //        if (dist <= maxDist){
    //            countyArray.push(d.id);
    //        }
    //});
    ////
    that.selectedCountyFips = new Array();
    var stillMatching = true;


    that.counties.selectAll("path").sort(function (a, b) {
        var distA = Math.sqrt(
            Math.pow(a["XY"][0] - that.proximityStart[0], 2) +
            Math.pow(a["XY"][1] - that.proximityStart[1], 2)
        );

        var distB = Math.sqrt(
            Math.pow(b["XY"][0] - that.proximityStart[0], 2) +
            Math.pow(b["XY"][1] - that.proximityStart[1], 2)
        );

        return distA - distB;
    })
        .classed("active", false)

        //that.counties.selectAll("path")
        .each(function (d) {
            //console.log(d);
            if (stillMatching) {
                var dist = Math.sqrt(
                    Math.pow(d["XY"][0] - that.proximityStart[0], 2) +
                    Math.pow(d["XY"][1] - that.proximityStart[1], 2)
                );
                if (dist <= that.maxDistInProximity) {
                    d3.select(this).classed("active", true);
                    that.selectedCountyFips.push(d.id);
                }
                else {
                    stillMatching = false;
                }
            }
        });


    if (d3.event.sourceEvent == !undefined) {
        d3.event.sourceEvent.stopPropagation();
    }

    $(that.eventHandler).trigger("selectionChanged", {values: that.selectedCountyFips});

}


//Pop-up
///////////////////////////////////////////////////////////////
MapVis.prototype.setProbeContent = function(d){

    var that = getMapInstance();

    var snowNotRecorded = that.displayData.get(d.id) == undefined;
    var fipsNotLocated = that.fipsToCountyMap.get(d.id) == undefined;
    var html = "<strong>" + ((fipsNotLocated) ? d.id : that.fipsToCountyMap.get(d.id)) + "</strong><br/>" +
        ((!snowNotRecorded) ? (parseFloat(that.displayData.get(d.id)).toFixed(2) +  " in") : "Not Recorded") + "<br/>" +
        "<span>" + that.currentYear + "</span>";
    this.probe
        .html( html );
}

MapVis.prototype.setProximityProbeContent = function(){

    var that = getMapInstance();

    var sourceCountyName = undefined;

    var sourceCountyExists = (that.selectedCountyFips.length>0);
    if (sourceCountyExists){
        sourceCountyName = that.fipsToCountyMap.get(that.selectedCountyFips[0]);
    }

    var fipsNotLocated = (sourceCountyName == undefined || !sourceCountyExists) ;

    var html = "<strong>" + ((fipsNotLocated) ? "None" : sourceCountyName) + "</strong><br/>" +
        (that.maxDistInProximity).toFixed(2) + " mi" + "<br/>" +
        "<span>" + that.currentYear + "</span>";
    this.probe
        .html( html );
}

///////////////////////////////////////////////////////////////
MapVis.prototype.zoomOnCounty = function(d){

    var that = getMapInstance();

    //var minValue = Math.max(that.radius * 0.001, 0.05);
    //var maxValue = Math.min(that.radius * 5, 400);

    if (!that.dragProximityBool) {

        if (d3.event.scale >= that.zoomScaleMax) {
            d3.event.scale = that.zoomScaleMax;
        }
        else if (d3.event.scale <= that.zoomScaleMin) {
            d3.event.scale = that.zoomScaleMin;
        }
        else {

            //New
            var maxRadToUse = (that.centered == null) ? that.maxRad : that.maxRadZoom;

            var factor = Math.max(that.zoomScaleMin, Math.min(d3.event.scale, that.zoomScaleMax));
            var deltaRad = Math.max(that.minRad, Math.min(that.radius * factor, maxRadToUse));
            //console.log(factor);

            d3.select("#proximity-circle")
                .attr("r", deltaRad);

            that.maxDistInProximity = deltaRad;
            that.UpdateSelectedCounties();
        }
    }
}

//Zoom when select/deselect county
///////////////////////////////////////////////////////////////
MapVis.prototype.setZoomCounty =  function(d) {

    var that = this;
    var x, y, k;

    if (d && that.centered !== d) {
        var centroid = that.path.centroid(d);
        x = centroid[0];
        y = centroid[1];
        k = 4;
        that.centered = d;

    } else {
        x = that.width / 2;
        y = that.height / 2;
        k = 1;
        that.centered = null;

    }

    this.map.selectAll("path")
        .classed("active", that.centered && function(d) { return d === that.centered; });

    this.map.transition()
        .duration(750)
        .attr("transform", "translate(" + that.width / 2 + "," + that.height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px");
}

//Map county paths to screen location
///////////////////////////////////////////////////////////////
MapVis.prototype.getMapCoordOfCounty =  function(d) {

    var that = this;

    var county = d;
    var isMultiPoly = (county.geometry["type"] == "MultiPolygon");

    var xCoords = [];
    var yCoords = [];

    if (isMultiPoly) {
        for (var i = 0; i < county.geometry.coordinates.length; i++) {
            var countyCoords = county.geometry.coordinates[i][0];
            for (var j = 0; j < countyCoords.length; j++) {
                //Ignore geometries outside US
                try {
                    var x = that.projection(countyCoords[j])[0];
                    var y = that.projection(countyCoords[j])[1];
                }
                catch(e){
                    continue;
                }
                xCoords.push(x);
                yCoords.push(y);
            }
        }
    }

    //Regular Polygon
    else {
        var countyCoords = county.geometry.coordinates[0];
        for (var j = 0; j < countyCoords.length; j++) {
            //Ignore geometries outside US
            try {
                var x = that.projection(countyCoords[j])[0];
                var y = that.projection(countyCoords[j])[1];
            }
            catch(e){
                continue;
            }
            xCoords.push(x);
            yCoords.push(y);
        }
    }
    var coords = [(d3.sum(xCoords) / xCoords.length), (d3.sum(yCoords) / yCoords.length)];
    return coords;
}







