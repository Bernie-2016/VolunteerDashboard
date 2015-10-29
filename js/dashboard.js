var city_week = null;
var all = null;
var timeFormat = d3.time.format("%m/%d/%Y %X");
var dateFormat = d3.time.format("%Y-%m-%d");
var dateList = {}, regionList = {}, typeList = {};

var bernieChartInstance = null;

d3.csv("./d/data2.csv", function(d) {

  city_week = d.reduce(function(hash, obj) {

    //set boundaries
    // if (obj.Official == "yes") { return hash; }

    var parsedTime = timeFormat.parse(obj.EventDate);

    parsedTime.setDate(parsedTime.getDate()-parsedTime.getDay());

    var date = dateFormat(parsedTime);
    hash[obj.VenueState] = hash[obj.VenueState] || {};
    hash[obj.VenueState][obj.region] = hash[obj.VenueState][obj.region] || {};
    hash[obj.VenueState][obj.region][date] = hash[obj.VenueState][obj.region][date] || {};

    hash[obj.VenueState][obj.region][date][obj.EventType] = hash[obj.VenueState][obj.region][date][obj.EventType] || { "rsvp" : 0, "count": 0};

    hash[obj.VenueState][obj.region][date][obj.EventType].rsvp += parseInt(obj.RSVPS);
    hash[obj.VenueState][obj.region][date][obj.EventType].count ++;

    return hash;

  }, {});

  bernieChartInstance = new bernieCharts(city_week);
  $("div#loader").hide();



});


var bernieCharts = function(overallData) {
  this.overallData = overallData;

  this.chartRegRsvp = null;
  this.draw = function(params) {

    //Show loader...


    params = params || {}; //null check

    var that = this;
    //Arrange New York Data
    //get dates
    var dates = [];
    var regionTally = {};
    var typeTally = {};

    var mapRegion = {};
    var mapType = {};

    var target_state = that.overallData[window.global_state];
    for( region in target_state ) {
      regionList[region] = [];

      //Filter Region
      // if ((params.r && params.r.indexOf(region)) >= 0 )  { continue; }


      for ( date in target_state[region] ) {
        var tRSVP = 0, tEvent = 0;
        dateList[date] = dateList[date] || true;
        mapType[date] = mapType[date] || {};
        for ( type in target_state[region][date] ) {

          typeList[type] = [];

          //Filter Type
          if (params.t && params.t.indexOf(type) >= 0) { continue; }



          mapType[date][type] = mapType[date][type] || {rsvp : 0, count : 0};

          if ((params.r && params.r.indexOf(region)) >= 0 )  { continue; }
          tRSVP += target_state[region][date][type].rsvp;
          tEvent += target_state[region][date][type].count;
          mapType[date][type].rsvp += target_state[region][date][type].rsvp;
          mapType[date][type].count += target_state[region][date][type].count;
        }

        if ((params.r && params.r.indexOf(region)) >= 0 )  { continue; }
        mapRegion[date] = mapRegion[date] || {};
        mapRegion[date][region] = {"rsvp": tRSVP, "count" : tEvent};
        //mapRegion.push({"region" : region, "date": date, "rsvp" : tRSVP, "events" : tEvent});
      }
    }

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


    for ( region in regionList) {
      regionGroup.push(region);
      regionRSVP.push([].concat(region, regionList[region].map(function(d) { return d.rsvp; })));
      regionEvents.push([].concat(region, regionList[region].map(function(d) { return d.count; })));


      var sumRegRSVP = 0, sumRegEvent = 0;
      var regGrowthListEvents = regionList[region].map(function(d) { sumRegEvent += d.count; return sumRegEvent; });
      var regGrowthListRSVP = regionList[region].map(function(d) { sumRegRSVP += d.rsvp; return sumRegRSVP; });

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

    //Region
    d3.select(".region-filter .filter-counter").text("(" + regionGroup.length + ")");
    d3.select("#region-filter-list ul").selectAll("li").remove();
    d3.select("#region-filter-list ul").selectAll("li").data(regionGroup)
      .enter()
        .append("li")
          .attr("class", "region-filter-item-list filter-item-list")
          .html(function(d) {
            return "<input type='checkbox' value='"+ d +"' name='r' id='" + d + "' " +
              (params.r && params.r.indexOf(d)>=0 ? "" : "checked='checked'" )
              +"/><label for='" + d + "'><span class='checker'>&#9673;</span><span class='namer'>" + d + "</span></label>"
          });

    d3.select(".type-filter .filter-counter").text("(" + typeGroup.length + ")");
    d3.select("#type-filter-list ul").selectAll("li").remove();
    d3.select("#type-filter-list ul").selectAll("li").data(typeGroup)
      .enter()
        .append("li")
          .attr("class", "type-filter-item-list filter-item-list")
          .html(function(d) {
            return "<input type='checkbox' value='"+ d +"' name='t' id='" + d + "' " +
            (params.t && params.t.indexOf(d)>=0 ?  "" : "checked='checked'")
            +"/><label for='" + d + "'><span class='checker'>&#9673;</span><span class='namer'>" + d + "</span></label>"
          });

    // //Build Chart for REGION EVENT COUNTS;
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
     }

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
    }

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
    }

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
    }


    // growthRegionRSVP = [], growthRegPercRSVP = [],
    // growthRegionEvents = [], growthRegPercEvents = [],

    d3.selectAll(".overall-growth.event-region ul li").remove();
    d3.select(".overall-growth.event-region ul")
      .selectAll("li.growth-list-item")
      .data(growthRegionEvents.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; }))
        .enter()
        .append("li")
          .attr("class", "growth-list-item")
          .attr("data-region", function(d) { return d[0]; })
          .attr("id", function(d) { return d[0]; })
          .html(function(d) {
            return "<div class='growth-item-title'>" + d[0] + " • " + d[d.length-1] + "</div><div class='overall-growth-item event-region-item " + d[0] + "'></div>"
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

            d[0] = "total events";
            c3.generate({
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
          })



    d3.selectAll(".overall-growth.rsvp-region ul li").remove();
    d3.select(".overall-growth.rsvp-region ul")
      .selectAll("li.growth-list-item")
      .data(growthRegionRSVP.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; }))
        .enter()
        .append("li")
          .attr("class", "growth-list-item")
          .attr("data-region", function(d) { return d[0]; })
          .attr("id", function(d) { return d[0]; })
          .html(function(d) {
            return "<div class='growth-item-title'>" + d[0]  + " • " + d[d.length-1] + "</div><div class='overall-growth-item rsvp-region-item " + d[0] + "'></div>"
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
                // growthRate = (growthRate - 1) * 100;

                currentAmount = item;

                return growthRate;
              }
            });

            d[0] = "total RSVPs";
            c3.generate({
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
          })

    /* Show Growth.. */


  }; // end of draw()

  this.initialize = function () {
    var that = this;
    that.draw($.deparam(window.location.hash.substring(1)));
  };

  this.initialize();
}


/* Set event listeners*/
var hashchangeManager = null;
$(function() {
  $("#global-filters").on("change", "input[type='checkbox']", function() {
    $("div#loader").show();

    setTimeout(function() {
      window.location.hash = $.param($("#global-filters input:not(:checked)"));
    }, 10);
  });

  $(window).on("hashchange", function() {
      var parameters = $.deparam(window.location.hash.substring(1));
      bernieChartInstance.draw(parameters);
      $("div#loader").hide();
  });
});
