var city_week = null;
var all = null;
var timeFormat = d3.time.format("%m/%d/%Y %X");
var dateFormat = d3.time.format("%Y-%m-%d");
var dateList = {}, regionList = {}, typeList = {};
var nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate()+30);

var bernieChartInstance = null;

$.ajax({
    url: "./js/aggregated-data.js",
    dataType: "script",
    success: function() {
      bernieChartInstance = new bernieCharts(window.aggregatedData);
      $("div#loader").hide();
    }
  });


var bernieCharts = function(overallData) {
  this.states = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District Of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VI":"Virgin Islands","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"};
  this.overallData = overallData;
  this.chartRegRsvp = null;
  this.regionGrowthEvents = {};
  this.regionGrowthRsvps = {};
  this.typeFilter = null, this.regionFilter = null;
  this.chartRegEvents = null, this.chartTypeEvents = null, this.chartTypeRsvp = null, this.chartRegRsvp;

  /***
    clearAll - removes / destroys all elements in preparation for switching states
    other solutions, cache it.
  */
  this.clearAll = function() {

    var that = this;

    $("#state-target").text("Loading");

    for(var i in that.regionGrowthEvents) { that.regionGrowthEvents[i].destroy(); that.regionGrowthEvents[i] = null;}
    that.regionGrowthEvents = {};

    for(var i in that.regionGrowthRsvps) { that.regionGrowthRsvps[i].destroy(); that.regionGrowthRsvps[i] = null;}
    that.regionGrowthRsvps = {};
    that.regionGrowth.remove();
    that.regionGrowthRsvpList.remove();

    // that.typeFilter.remove(); that.typeFilter = null;
    that.typeFilter.style("display", "none");
    that.regionFilter.remove(); that.regionFilter = null;

    d3.select(".region-filter .filter-counter").text("");
    d3.select(".type-filter .filter-counter").text("");

    that.chartTypeEvents.destroy(); that.chartTypeEvents = null;
    that.chartRegRsvp.destroy(); that.chartRegRsvp = null;
    that.chartRegEvents.destroy(); that.chartRegEvents = null;
    that.chartTypeRsvp.destroy(); that.chartTypeRsvp = null;

    delete dateList; delete regionList; delete typeList;
    dateList = {}; regionList = {}; typeList = {};


    // $(".chart-group").hide();
  };

  /***
    draw(params) - draws the filters and charts
  */
  this.draw = function(params) {

    params = params || {}; //null check

    var that = this;
    var dates = [];
    var regionTally = {};
    var typeTally = {};

    var mapRegion = {};
    var mapType = {};

    params.state = params.state || "all";


    // Take data and set name
    if (params.state == "all") {
      target_state = that.overallData.total;
      $("#state-target").text("All States");
    } else {
      target_state = that.overallData[params.state];
      $("#state-target").text(that.states[params.state]);
    }

    // This block arranges the data to be consumable by C3
    for( region in target_state ) {
      regionList[region] = [];

      for ( date in target_state[region] ) {
        var tRSVP = 0, tEvent = 0;
        dateList[date] = dateList[date] || true;
        mapType[date] = mapType[date] || {};
        for ( type in target_state[region][date] ) {

          if (!mapType[date][type]) { mapType[date][type] = { rsvp: 0, count: 0 }; }

          typeList[type] = [];

          // Filter Type
          if (params.t && params.t.indexOf(type) >= 0) { continue; }
          if (params.r && params.r.indexOf(region) >= 0 )  { continue; }
          tRSVP += target_state[region][date][type].rsvp;
          tEvent += target_state[region][date][type].count;
          mapType[date][type].rsvp = mapType[date][type].rsvp
                                        ? target_state[region][date][type].rsvp
                                        : (mapType[date][type].rsvp + target_state[region][date][type].rsvp);
          mapType[date][type].count = mapType[date][type].count
                                        ? target_state[region][date][type].count
                                        : (mapType[date][type].count + target_state[region][date][type].count);
        }

        if (!mapRegion[date]) {
          mapRegion[date] = {};
        }
        if( !mapRegion[date][region] ) {
          mapRegion[date][region] = {"rsvp" : 0, "count" : 0 };
        }

        if (params.r && params.r.indexOf(region) >= 0 )  { continue; }
        mapRegion[date][region] = {"rsvp": tRSVP, "count" : tEvent};
        //mapRegion.push({"region" : region, "date": date, "rsvp" s: tRSVP, "events" : tEvent});
      }
    } // end of arranging data

    var dateArray = [];
    for(date in dateList) { dateArray.push(date); }
    dateArray = dateArray.sort(function(a, b) { var d1 = new Date(a), d2  = new Date(b); return d1 - d2; });

    for( i in dateArray ) {

      if ( mapRegion[dateArray[i]] ) {
        for (region in regionList) { regionList[region].push(mapRegion[dateArray[i]][region] ? mapRegion[dateArray[i]][region] : {rsvp: 0, count: 0}); }
      }

      if ( mapType[dateArray[i]] ) {
        for (type in typeList) {
          typeList[type]
                .push(mapType[dateArray[i]][type] ? mapType[dateArray[i]][type] : {rsvp: 0, count: 0} ); }
      }
    }

    //Build per region
    var regionRSVP = [], regionEvents = [], typeRSVP = [], typeEvents = [];
    var dateCol = [].concat("date", dateArray);

    var regionGroup = [], typeGroup = [];
    var growthRegionRSVP = [], growthRegPercRSVP = [],
        growthRegionEvents = [], growthRegPercEvents = [],
        growthTypePercRSVP = [], growthTypePercEvents = [];

    // Build region growth for RSVP and Event counts
    for ( region in regionList) {
      regionGroup.push(region);
      regionRSVP.push([].concat(region, regionList[region].map(function(d) { return d.rsvp; })));
      regionEvents.push([].concat(region, regionList[region].map(function(d) { return d.count; })));

      var sumRegRSVP = 0, sumRegEvent = 0;
      var regGrowthListEvents = regionList[region].map(function(d) { sumRegEvent += d.count; return sumRegEvent; });
      var regGrowthListRSVP = regionList[region].map(function(d) { sumRegRSVP += d.rsvp; return sumRegRSVP; });

      //This is for C3 consumption
      growthRegionEvents.push([].concat(region, regGrowthListEvents));
      growthRegionRSVP.push([].concat(region, regGrowthListRSVP));

    }

    for ( type in typeList) {
      typeGroup.push(type);
      typeRSVP.push([].concat(type, typeList[type].map(function(d) { return d.rsvp; })));
      typeEvents.push([].concat(type, typeList[type].map(function(d) { return d.count; })));
    }

    /**
    Since we now have the list of regions and type, we setup the filters
    */

    //Region Filters
    //We delete this everytime the user switches state
    d3.select(".region-filter .filter-counter").text("(" + regionGroup.length + ")");

    if ( !that.regionFilter ) {
      that.regionFilter = d3.select("#region-filter-list ul").selectAll("li").data(regionGroup).enter()
        .append("li")
          .attr("class", "region-filter-item-list filter-item-list")
          .html(function(d) {
            return "<input type='checkbox' value='"+ d +"' name='r' id='" + d + "' " +
              (params.r && params.r.indexOf(d)>=0 ? "" : "checked='checked'" )
              +"/><label for='" + d + "'><span class='checker'>&#9673;</span><span class='namer'>" + d + "</span></label>"
          });
    }

    //We just hide some items if the user switches state, as to maintain the type filters
    d3.select(".type-filter .filter-counter").text("(" + typeGroup.length + ")");
    that.typeFilter = d3.select("#type-filter-list ul").selectAll("li").data(typeGroup);
    that.typeFilter.style("display", "block")
    that.typeFilter.enter()
      .append("li")
        .attr("class", "type-filter-item-list filter-item-list")
        .html(function(d) {
          return "<input type='checkbox' value='"+ d +"' name='t' id='" + d + "' " +
          (params.t && params.t.indexOf(d)>=0 ?  "" : "checked='checked'")
          +"/><label for='" + d + "'><span class='checker'>&#9673;</span><span class='namer'>" + d + "</span></label>"
        })

    that.typeFilter.exit().style("display", "none");
    // }

    //Build Chart for REGION EVENT COUNTS;
    if (that.chartRegEvents) {
      that.chartRegEvents.load({
          columns:[].concat([dateCol], regionEvents),
      });
    } else {

       that.chartRegEvents = c3.generate({
          bindto: '#by-region',
          data: {
            x: 'date',
            columns:[].concat([dateCol], regionEvents),
            types: regionGroup.reduce(function(hash, obj) { hash[obj] = 'area-spline'; return hash; }, {}),
            groups:[regionGroup],
          },
          axis: {
              x: {
                  type: 'timeseries',
                  tick: {
                      format: 'Week of %b %d'
                  }
              }
          }
        }); //end chartRegRsvp
     } // End of building charts for Region Event Counts

    // Build chart for Event Counts by Type
    if (that.chartTypeEvents) {
      that.chartTypeEvents.load( {
        columns:[].concat([dateCol], typeEvents),
      });
    } else {
      that.chartTypeEvents = c3.generate({
        bindto: '#by-type',
        data: {
          x: 'date',
          columns:[].concat([dateCol], typeEvents),
          types: typeGroup.reduce(function(hash, obj) { hash[obj] = 'area-step'; return hash; }, {}),
          groups:[typeGroup]
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: 'Week of %b %d'
                }
            }
        }
      }); //end chartTypeEvents
    } //end of Event Counts by Type rendering

    // Build chart for RSVP count by Region
    if (that.chartRegRsvp) {
      that.chartRegRsvp.load({
          columns:[].concat([dateCol], regionRSVP),
      });
    } else {
      that.chartRegRsvp = c3.generate({
        bindto: '#rsvp-by-region',
        data: {
          x: 'date',
          columns:[].concat([dateCol], regionRSVP),
          types: regionGroup.reduce(function(hash, obj) { hash[obj] = 'area-spline'; return hash; }, {}),
          groups:[regionGroup],
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: 'Week of %b %d'
                }
            }
        }
      }); //end chartRegRsvp
    } // End of RSVP Count by Region

    //Build RSVP count by Type charts
    if (that.chartTypeRsvp) {
      that.chartTypeRsvp.load( {
        columns:[].concat([dateCol], typeRSVP),
      });
    }
    else {
      that.chartTypeRsvp = c3.generate({
        bindto: '#rsvp-by-type',
        data: {
          x: 'date',
          columns:[].concat([dateCol], typeRSVP),
          types: typeGroup.reduce(function(hash, obj) { hash[obj] = 'area-step'; return hash; }, {}),
          groups:[typeGroup]
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: 'Week of %b %d'
                }
            }
        }
      }); //end chartTypeRsvp
    } // End of RSVP count by type chart


    /**
      Start of showing region growth.
      - Regions that are marked as hidden are just set to `display: none`
    */
    that.regionGrowth = d3.select(".overall-growth.event-region ul")
      .selectAll("li.growth-list-item")
      .data(growthRegionEvents.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; }), function(d) { return d[0]; } );

    that.regionGrowth.style("display", "inline-block").each(function(d, i) {
      var currentAmount = 0;
        var growth = null;

        growth = d.map(function(item,i) {

          if (i == 0) { return "growth"; }

          if (i == 1 || item == 0) { currentAmount = item; return null; }
          else if (currentAmount == 0 && item != 0 ) {
            currentAmount = item;
            return item;
          } else {

            var growthRate = parseFloat(item) - parseFloat(currentAmount);

            currentAmount = item;

            return growthRate;
          }
        });

        //
        d3.select(this).select(".growth-item-title").text(d[0] + " • " + currentAmount);

      that.regionGrowthEvents[d[0]].load({columns: [].concat([dateCol], [d], [growth])});
    });

    /**
      Append items
    */
    var regionGrowthEnter = that.regionGrowth.enter()
        .append("li")
          .attr("class", "growth-list-item")
          .attr("data-region", function(d) { return d[0]; })
          .attr("id", function(d) { return d[0]; })
          .html(function(d) {
            return "<div class='growth-item-title'>" + d[0] + " • " + d[d.length-1] + "</div><div class='overall-growth-item event-region-item " + d[0] + "'></div>"
          })
          .each(function(d,i) {

            /* For each LI, we build the data to be consumable by C3, and then we build C3 */
            var currentAmount = 0;
            var growth = null;

            // Mapping for Chart data
            growth = d.map(function(item,i) {

              if (i == 0) { return "growth"; }

              if (i == 1 || item == 0) { currentAmount = item; return null; }
              else if (currentAmount == 0 && item != 0 ) {
                currentAmount = item;
                return item;
              } else {

                var growthRate = parseFloat(item) - parseFloat(currentAmount);

                currentAmount = item;

                return growthRate;
              }
            });

            // Building the chart
            that.regionGrowthEvents[d[0]] = c3.generate({
              size: {
                height: 150
              },
              bindto: $(this).children(".overall-growth-item")[0],
              data: {
                x: 'date',
                columns: [].concat([dateCol], [d], [growth]),
                type: 'area',
                axes: {
                  growth: 'y2'
                }
                // groups:[typeGroup]
              },
              axis: {
                  x: {
                      show: false,
                      type: 'timeseries',
                      tick: {
                          format: 'Week of %b %d'
                      }
                  },
                  y: {
                    show: false
                  },
              }
            });
          });

      that.regionGrowth.exit().style("display", "none");



    /* RSVP Growth - Essentially the same as region event count, this time focused on RSVP*/
    that.regionGrowthRsvpList = d3.select(".overall-growth.rsvp-region ul")
      .selectAll("li.growth-list-item")
      .data(growthRegionRSVP.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; }), function(d) { return d[0]; } );

    that.regionGrowthRsvpList.style("display", "inline-block").each(function(d, i) {
      var currentAmount = 0;
        var growth = null;

        growth = d.map(function(item,i) {

          if (i == 0) { return "growth"; }

          if (i == 1 || item == 0) { currentAmount = item; return null; }
          else if (currentAmount == 0 && item != 0 ) {
            currentAmount = item;
            return item;
          } else {

            var growthRate = parseFloat(item) - parseFloat(currentAmount);

            currentAmount = item;

            return growthRate;
          }
        });

        //
        d3.select(this).select(".growth-item-title").text(d[0] + " • " + currentAmount);

      that.regionGrowthRsvps[d[0]].load({columns: [].concat([dateCol], [d], [growth])});
    });

    var regionGrowthRsvpEnter = that.regionGrowthRsvpList.enter()
        .append("li")
          .attr("class", "growth-list-item")
          .attr("data-region", function(d) { return d[0]; })
          .attr("id", function(d) { return d[0]; })
          .html(function(d) {
            return "<div class='growth-item-title'>" + d[0] + " • " + d[d.length-1] + "</div><div class='overall-growth-item rsvp-region-item " + d[0] + "'></div>"
          })
          .each(function(d,i) {
            var currentAmount = 0;
            // var copy = d;
            var growth = null;

            growth = d.map(function(item,i) {

              if (i == 0) { return "growth"; }

              if (i == 1 || item == 0) { currentAmount = item; return null; }
              else if (currentAmount == 0 && item != 0 ) {
                currentAmount = item;
                return item;
              } else {

                var growthRate = parseFloat(item) - parseFloat(currentAmount);

                currentAmount = item;

                return growthRate;
              }
            });

            // d[0] = "total events";
            that.regionGrowthRsvps[d[0]] = c3.generate({
              size: {
                height: 150
              },
              bindto: $(this).children(".overall-growth-item")[0],
              data: {
                x: 'date',
                columns: [].concat([dateCol], [d], [growth]),
                type: 'area',
                axes: {
                  growth: 'y2'
                }
                // groups:[typeGroup]
              },
              axis: {
                  x: {
                      show: false,
                      type: 'timeseries',
                      tick: {
                          format: 'Week of %b %d'
                      }
                  },
                  y: {
                    show: false
                  },
              }
            });
          });

      that.regionGrowthRsvpList.exit().style("display", "none");

    /* Show Growth.. */

    // $(".chart-group").show();

  }; // end of draw()

  this.initialize = function () {
    var that = this;
    //Load states...
    $("select#states").append($("<option/>").val("all").text("All States"));
    for (var i in that.states) {
      $("select#states").append($("<option/>").val(i).text(that.states[i]));
    }

    var params = $.deparam(window.location.hash.substring(1));
    that.draw(params);
    $("select#states,#global-filters input[name='state']").val(params.state);

  };

  this.initialize();
}


/* Set event listeners*/
$(function() {
  $("#global-filters").on("change", "input[type='checkbox']", function() {
    // alert("XXXX");
    $("#global-filters").submit();
  });

  $("#global-filters").on("submit", null, function() {
    // alert("XXXX");
    $("div#loader").show();
    // setTimeout(function() {
      window.location.hash = $.param($("#global-filters input[type='checkbox']:not(:checked), #global-filters input[name='state']"));
    // }, 10);
    // alert("XX");
    return false;
  });

  $("#states").on("change", null, function() {
    $("#global-filters input[name='state']").val($("#states").val());
    // alert("XXXXX");
    bernieChartInstance.clearAll();
    $("#global-filters").submit();
    // var newState = document.getElementById("states").value;
    // window.location.href = window.location.pathname + "?state=" + newState
    // $("#global-filters").
  });

  $(window).on("hashchange", function() {
      var parameters = $.deparam(window.location.hash.substring(1));
      bernieChartInstance.draw(parameters);
      $("div#loader").hide();
  });
});