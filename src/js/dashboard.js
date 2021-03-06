if (document.URL.startsWith('https://')) {
    // Moving the backend to SSL would cost $20/month on heroku, and
    // attempting to access it unencrypted when the frontend is
    // accessed via SSL results in a mixed-content error.  So
    // downgrade front end http.
    window.location = document.URL.replace('https://', 'http://');
}

var city_week = null;
var all = null;
var timeFormat = d3.time.format("%m/%d/%Y %X");
var dateFormat = d3.time.format("%Y-%m-%d");
var humanFormat = d3.time.format("%b %d, %Y");

var dateList = {}, regionList = {}, typeList = {};
var nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate()+30);

var bernieChartInstance = null;

var query = $.deparam.querystring();
var targetUrl;
switch (query.mode) {
  case "start": targetUrl = 'https://event-counter.herokuapp.com/aggregate?time_type="start_dt"';
    $("#mode-label").text("Stats by Day of Event");

  break;
  case "create":
  default: targetUrl = "https://event-counter.herokuapp.com/aggregate";
    $("#mode-label").text("Stats by Day of Event-Creation");
   break;
};

$.ajax({
  // url: ,
  url: targetUrl,
  headers : {'Accept-Encoding' : 'gzip'},
  dataType: "script",
  success: function() {
    bernieChartInstance = new bernieCharts(window.aggregatedData);
    $("div#loader").hide();
  },
    error: function (xhrObj, statusText, errorThrown) {
	alert('Failure accessing event data: ' + statusText + '.  Error status: ' + String(xhrObj.status));
  }
});


var bernieCharts = function(overallData) {
  this.constant = {
    dateFormat : d3.time.format("%Y-%m-%d")
  };
  this.constant.states = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District Of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VI":"Virgin Islands","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"};
  this.overallData = overallData;
  // This handles the data that is being shown by the charts. It keeps the overallData constant, but the user can  choose to change the viewed data
  this.viewedData = overallData;

  this.chartRegRsvp = null;
  this.regionGrowthEvents = {};
  this.regionGrowthRsvps = {};
  this.typeFilter = null, this.regionFilter = null;
  this.chartRegEvents = null, this.chartTypeEvents = null, this.chartTypeRsvp = null, this.chartRegRsvp;

  // April 1, 2015 - Nov 30, 2016
  this.rawStartDate = "2015-04-01", this.rawEndDate = "2016-11-30";
  this.startDate = moment().subtract(1, 'months')._d,
  this.endDate = moment().add(1, 'months')._d;


  /***/
  this._render = function(params) {
    var that = this;
    params.view = params.view || "chart" ; //default;
    $("#charts").attr("data-mode", params.view);

    that._filterState(params);

    switch (params.view) {
      case "chart" : that.draw(params); break;
      case "tabular" : that.tabulate(params); break;
      default: break;
    }
  };

  this._buildChart = function(target, chartType, dateCol, collatedData, group) {
    // console.log("XXX", [].concat([dateCol], collatedData));
    return c3.generate({
          bindto: target,
          data: {
            x: 'date',
            columns:[].concat([dateCol], collatedData),
            types: group.reduce(function(hash, obj) { hash[obj] = chartType; return hash; }, {}),
            groups:[group],
          },
          axis: {
              x: {
                  type: 'timeseries',
                  tick: {
                      format: 'Week starting %b %d'
                  }
              }
          },
          tooltip: {
            format: {
              value: function(value, ratio, id) {
                if (value > 0) {
                  return value;
                }
              }
            }
          }
        }); //end chartRegRsvp
  };

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
    if (that.regionGrowth ) { that.regionGrowth.remove(); }
    // that.regionGrowthRsvpList.remove();

    // that.typeFilter.remove(); that.typeFilter = null;
    if (that.typeFilter) { that.typeFilter.style("display", "none"); }
    if (that.regionFilter ) { that.regionFilter.remove(); that.regionFilter = null; }

    d3.select(".region-filter .filter-counter").text("");
    d3.select(".type-filter .filter-counter").text("");

    if( that.chartTypeEvents) { that.chartTypeEvents.destroy(); that.chartTypeEvents = null; }
    // that.chartRegRsvp.destroy(); that.chartRegRsvp = null;
    if(that.chartRegEvents) { that.chartRegEvents.destroy(); that.chartRegEvents = null; }
    // that.chartTypeRsvp.destroy(); that.chartTypeRsvp = null;

    delete dateList; delete regionList; delete typeList;
    dateList = {}; regionList = {}; typeList = {};

    /* Clear tabular too */
    d3.select(".tabular-area.tabular-events *").remove();
  };

  //Filter by date range
  this.filterDateRange = function(params) {
    var that = this;

    that.startDate = params.startDate ? that.constant.dateFormat.parse(params.startDate) : that.startDate;
    that.endDate = parse.endDate ? params.endDatethat.constant.dateFormat.parse(params.endDate) : that.endDate;

    //set date boundaries
    that.startDate.setHours(0); that.startDate.setMinutes(0); that.startDate.setSeconds(0);
    that.endDate.setHours(23); that.endDate.setMinutes(59); that.endDate.setSeconds(59);


    // // that.draw(params);
    // for (var regionInd in that.viewedData) {
    //   for (var dateInd in that.viewedData[regionInd]) {
    //     if (that.constant.dateFormat.parse(dateInd) < that.startDate || that.constant.dateFormat.parse(dateInd) > that.endDate) {
    //        delete that.viewedData[regionInd][dateInd];
    //     }
    //   }
    // }

  };

  this.compute_totals = function(overallData) {
    // The totals are not sent through; reconstruct here
    target_state = {};
    for ( state in overallData ) {
        cstate = target_state[state] = target_state[state] || {};
        for ( clregion in overallData[state] ) {
            for ( date in overallData[state][clregion] ) {
                cdate = cstate[date] = cstate[date] || {};
                for ( event_type in overallData[state][clregion][date] ) {
                    cevent_type = cdate[event_type] = cdate[event_type] || {};
                    for ( counttype in overallData[state][clregion][date][event_type] ) {
                        cevent_type[counttype] = cevent_type[counttype] || 0;
                        cevent_type[counttype] += overallData[state][clregion][date][event_type][counttype];
                    }
                }
            }
        }
    }
    return target_state;
  }

  //Filter by state
  this._filterState = function(params) {
    var that = this;
    if (!params.state || params.state == "all") {
      params.state = "all";
      that.viewedData = that.compute_totals(that.overallData);
      $("#state-target").text("All States");
    } else {
      that.viewedData = that.overallData[params.state];
      $("#state-target").text(that.constant.states[params.state]);
    }



    var regions = {};
    var types = {};

    for ( var i in that.viewedData) {
      regions[i] = true;
      for (var j in that.viewedData[i]) {
        for (var k in that.viewedData[i][j]) {
          types[k] = true;
        }
      }
    }

    // console.log(that.viewedData, regions, types);

    //Listing
    var regionGroups = [], typeGroups = [];
    for (var i in regions) { regionGroups.push(i); }
    for (var i in types) { typeGroups.push(i); }


    regionGroups.sort();
    typeGroups.sort();

    // console.log(regionGroups);
      // console.log(regionGroups, typeGroups);

    that._buildFilters(params, regionGroups, typeGroups);
  }

  this._buildFilters = function(params, regionGroup, typeGroup) {
    var that = this;

    // console.log(regionGroup, typeGroup);
    //Region Filters
    //We delete this everytime the user switches state
    d3.select(".region-filter .filter-counter").text("(" + regionGroup.length + ")");

    if ( !that.regionFilter ) {
      that.regionFilter = d3.select("#region-filter-list ul").selectAll("li")
        .data(regionGroup, function(d) { return d; }).enter()
        .append("li")
          .attr("class", "region-filter-item-list filter-item-list")
          .html(function(d) {
            return "<input type='checkbox' value='"+ d +"' name='r' id='" + d + "' " +
              (params.r && params.r.indexOf(d)>=0 ? "" : "checked='checked'" )
              +"/><label for='" + d + "'><span class='checker'></span><span class='namer'>" + that._getStateName(params.state, d) + "</span></label>"
          });
    }

    //We just hide some items if the user switches state, as to maintain the type filters
    d3.select(".type-filter .filter-counter").text("(" + typeGroup.length + ")");
    that.typeFilter = d3.select("#type-filter-list ul").selectAll("li")
      .data(typeGroup, function(d) { return d; });
    that.typeFilter.style("display", "block")
    that.typeFilter.enter()
      .append("li")
        .attr("class", "type-filter-item-list filter-item-list")
        .html(function(d) {
          return "<input type='checkbox' value='"+ d +"' name='t' id='" + d + "' " +
          (params.t && params.t.indexOf(d)>=0 ?  "" : "checked='checked'")
          +"/><label for='" + d + "'><span class='checker'></span><span class='namer'>" + d + "</span></label>"
        })

    that.typeFilter.exit().style("display", "none");

  }

  this.process = function(params) {
    var that = this;
    that._render(params);
  }

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

    var mapOverall = {};
    var mapByRsvp = {};

    params.state = params.state || "all";

    var target_state = that.viewedData;

    // This block arranges the data to be consumable by C3
    var startDate = params.startdate ? dateFormat.parse(params.startdate) : that.startDate, endDate = params.enddate ? dateFormat.parse(params.enddate) : that.endDate;

    for( region in target_state ) {
      regionList[region] = [];

      for ( date in target_state[region] ) {

        //If date is within the date ranges
        var currDate = dateFormat.parse(date);


        if ( currDate < startDate || currDate > endDate )  {


          delete dateList[date];
          continue;
        } else {
          dateList[date] = dateList[date] || true;
        }
        var tRSVP = 0, tEvent = 0;

        mapType[date] = mapType[date] || {};
        for ( type in target_state[region][date] ) {

          if (!mapType[date][type]) { mapType[date][type] = { rsvp: 0, count: 0 }; }

          typeList[type] = [];

          // Filter Type
          if (params.t && params.t.indexOf(type) >= 0) { continue; }
          if (params.r && params.r.indexOf(region) >= 0 )  { continue; }
          tRSVP += target_state[region][date][type].rsvp;
          tEvent += target_state[region][date][type].count;

          mapType[date][type].rsvp += target_state[region][date][type].rsvp;
          mapType[date][type].count += target_state[region][date][type].count;
        }

        if (!mapRegion[date]) {
          mapRegion[date] = {};
        }
        if( !mapRegion[date][region] ) {
          mapRegion[date][region] = {"rsvp" : 0, "count" : 0 };
        }

        if (params.r && params.r.indexOf(region) >= 0 )  { continue; }
        mapRegion[date][region] = {"rsvp": tRSVP, "count" : tEvent};

        //Get total mapping
        mapOverall[date] = mapOverall[date] ? {rsvp: mapOverall[date].rsvp + tRSVP,
                            count: mapOverall[date].count + tEvent} : {rsvp: 0, count: 0};
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


    // }

    //Build Chart for REGION EVENT COUNTS;
    // that._buildChart(that.chartRegEvents, dateCol, regionGroup, regionEvents);
    regionEvents.sort(function(a,b) {
      if (a[0] < b[0]) return -1;
      else if (a[0] > b[0]) return 1;
      return 0;
    });
    if (that.chartRegEvents) {
      that.chartRegEvents.load({
          columns:[].concat([dateCol], regionEvents),
      });
      that.chartRegEvents.show(regionGroup, {withLegend: true});

    } else {
       that.chartRegEvents = that._buildChart('#by-region', 'area-spline', dateCol, regionEvents, regionGroup);

       // that.chartRegEvents.hide(params.r, {withLegend: true});
     } // End of building charts for Region Event Counts

     if(params.r) {
        that.chartRegEvents.hide(params.r, {withLegend: true});
      }

    // Build chart for Event Counts by Type
    if (that.chartTypeEvents) {
      // console.log("chartTypeEvents", [].concat([dateCol], typeEvents));
      that.chartTypeEvents.load( {
        columns:[].concat([dateCol], typeEvents),
      });
      that.chartTypeEvents.show(typeGroup, {withLegend: true});
    } else {
      that.chartTypeEvents = that._buildChart('#by-type', 'area-step', dateCol, typeEvents, typeGroup);
    } //end of Event Counts by Type rendering

    if(params.t) {
      that.chartTypeEvents.hide(params.t, {withLegend: true});
    }

    // Build chart for RSVP count by Region
    // if (that.chartRegRsvp) {
    //   that.chartRegRsvp.load({
    //       columns:[].concat([dateCol], regionRSVP),
    //   });
    // } else {
    //   that.chartRegRsvp = c3.generate({
    //     bindto: '#rsvp-by-region',
    //     data: {
    //       x: 'date',
    //       columns:[].concat([dateCol], regionRSVP),
    //       types: regionGroup.reduce(function(hash, obj) { hash[obj] = 'area-spline'; return hash; }, {}),
    //       groups:[regionGroup],
    //     },
    //     tooltip: {format: {
    //       value: function(value, ratio, id) {
    //         if (value > 0) {
    //           return value;
    //         }
    //       }
    //     }},
    //     axis: {
    //         x: {
    //             type: 'timeseries',
    //             tick: {
    //                 format: 'Week starting %b %d'
    //             }
    //         }
    //     }
    //   }); //end chartRegRsvp
    // } // End of RSVP Count by Region

    // //Build RSVP count by Type charts
    // if (that.chartTypeRsvp) {
    //   that.chartTypeRsvp.load( {
    //     columns:[].concat([dateCol], typeRSVP),
    //   });
    // }
    // else {
    //   that.chartTypeRsvp = c3.generate({
    //     bindto: '#rsvp-by-type',
    //     data: {
    //       x: 'date',
    //       columns:[].concat([dateCol], typeRSVP),
    //       types: typeGroup.reduce(function(hash, obj) { hash[obj] = 'area-step'; return hash; }, {}),
    //       groups:[typeGroup]
    //     },
    //     tooltip: { format: {
    //       value: function(value, ratio, id) {
    //         if (value > 0) {
    //           return value;
    //         }
    //       }
    //     }},
    //     axis: {
    //         x: {
    //             type: 'timeseries',
    //             tick: {
    //                 format: 'Week starting %b %d'
    //             }
    //         }
    //     }
    //   }); //end chartTypeRsvp
    // } // End of RSVP count by type chart


    /**
      Start of showing region growth.
      - Regions that are marked as hidden are just set to `display: none`
    */
    growthRegionEvents = growthRegionEvents.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; });
    growthRegionEvents.sort(function(a,b) {
      if (a[0] < b[0]) return -1;
      else if (a[0] > b[0]) return 1;
      return 0;
    });

    that.regionGrowth = d3.select(".overall-growth.event-region ul")
      .selectAll("li.growth-list-item")
      .data(growthRegionEvents, function(d) { return d[0]; } );

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
	    total_values = d.slice(0);
	    total_values[0] = "Total events to date";
	    weekly_values = growth.slice(0);
	    weekly_values[0] = "Events each week";
            that.regionGrowthEvents[d[0]] = c3.generate({
              size: {
                height: 150
              },
              bindto: $(this).children(".overall-growth-item")[0],
              data: {
                x: 'date',
                columns: [].concat([dateCol], [total_values], [weekly_values]),
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
                          format: 'Week starting %b %d'
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
    // that.regionGrowthRsvpList = d3.select(".overall-growth.rsvp-region ul")
    //   .selectAll("li.growth-list-item")
    //   .data(growthRegionRSVP.filter(function(d) { return params.r ? params.r.indexOf(d[0]) < 0 : true; }), function(d) { return d[0]; } );

    // that.regionGrowthRsvpList.style("display", "inline-block").each(function(d, i) {
    //   var currentAmount = 0;
    //     var growth = null;

    //     growth = d.map(function(item,i) {

    //       if (i == 0) { return "growth"; }

    //       if (i == 1 || item == 0) { currentAmount = item; return null; }
    //       else if (currentAmount == 0 && item != 0 ) {
    //         currentAmount = item;
    //         return item;
    //       } else {

    //         var growthRate = parseFloat(item) - parseFloat(currentAmount);

    //         currentAmount = item;

    //         return growthRate;
    //       }
    //     });

    //     //
    //     d3.select(this).select(".growth-item-title").text(d[0] + " • " + currentAmount);

    //   that.regionGrowthRsvps[d[0]].load({columns: [].concat([dateCol], [d], [growth])});
    // });

    // var regionGrowthRsvpEnter = that.regionGrowthRsvpList.enter()
    //     .append("li")
    //       .attr("class", "growth-list-item")
    //       .attr("data-region", function(d) { return d[0]; })
    //       .attr("id", function(d) { return d[0]; })
    //       .html(function(d) {
    //         return "<div class='growth-item-title'>" + d[0] + " • " + d[d.length-1] + "</div><div class='overall-growth-item rsvp-region-item " + d[0] + "'></div>"
    //       })
    //       .each(function(d,i) {
    //         var currentAmount = 0;
    //         // var copy = d;
    //         var growth = null;

    //         growth = d.map(function(item,i) {

    //           if (i == 0) { return "growth"; }

    //           if (i == 1 || item == 0) { currentAmount = item; return null; }
    //           else if (currentAmount == 0 && item != 0 ) {
    //             currentAmount = item;
    //             return item;
    //           } else {

    //             var growthRate = parseFloat(item) - parseFloat(currentAmount);

    //             currentAmount = item;

    //             return growthRate;
    //           }
    //         });

    //         // d[0] = "total events";
    //         that.regionGrowthRsvps[d[0]] = c3.generate({
    //           size: {
    //             height: 150
    //           },
    //           bindto: $(this).children(".overall-growth-item")[0],
    //           data: {
    //             x: 'date',
    //             columns: [].concat([dateCol], [d], [growth]),
    //             type: 'area',
    //             axes: {
    //               growth: 'y2'
    //             }
    //             // groups:[typeGroup]
    //           },
    //           axis: {
    //               x: {
    //                   show: false,
    //                   type: 'timeseries',
    //                   tick: {
    //                       format: 'Week starting %b %d'
    //                   }
    //               },
    //               y: {
    //                 show: false
    //               },
    //           }
    //         });
    //       });

    //   that.regionGrowthRsvpList.exit().style("display", "none");

    /* Show Growth.. */

    // $(".chart-group").show();

  }; // end of draw()

  this.tabulate = function(params) {
    var that = this;

    // console.log(that.viewedData);
    var regional = [];
    var regionList = [];
    var typeList = {};

    var startDate = params.startdate ? dateFormat.parse(params.startdate) : that.startDate, endDate = params.enddate ? dateFormat.parse(params.enddate) : that.endDate;

    for(var i in that.viewedData) {
      regionList.push(i);
      var copy = that.viewedData[i];
      var obj = {data: jQuery.extend(true, {}, copy)}; obj.id = i; regional.push(obj);
    }
    d3.selectAll("div.tabular-region").remove();

    regional.sort(function(a,b) {
      if (a.id < b.id) return -1;
      else if (a.id > b.id) return 1;
      return 0;
    });

    var regions = d3.select(".tabular-events.tabular-area").selectAll("div.tabular-region")
        .data(regional, function(d) { return d.id; })
        .style("display", function(d) {
              // console.log(d);
              return params.r && params.r.indexOf(d.id) >= 0 ? "none" : null;
            })
        .enter()
          .append("div").attr("class", "tabular-region")
            .style("display", function(d) {
              // console.log(d);
              return params.r && params.r.indexOf(d.id) >= 0 ? "none" : null;
            })
          .html(function(d) { return "<h5>" + that._getStateName(params.state, d.id) + "</h5>"; })
          .each(function(d) {
            var that = this;
              var __regionArray = [];
              var __typeArray = [];
              for(var i in d.data) {

                //i is the date...
                var currDate = dateFormat.parse(i);

                if ( currDate < startDate || currDate > endDate )  {
                  continue;
                }

                var obj = d.data[i];

                for (var j in d.data[i]) {
                  typeList[j] = true; //to be arranged later.

                  if (__typeArray.indexOf(j) < 0) {
                    __typeArray.push(j);
                  }
                }

                obj.date = i;
                __regionArray.push(obj);
              };

              __typeArray = __typeArray.sort(function(a,b) {
                    if(a < b) return -1;
                    if(a > b) return 1;
                    return 0;

              });

              //Convert from object to array
              var cellData = __regionArray.map(function(d) {
                return [humanFormat(dateFormat.parse(d.date))].concat(__typeArray.map(function(g) {
                    return d[g] ? d[g].count : "-";
                }));
              });

              //Sort from latest to earliest
              cellData = cellData.sort(function(a, b) {
                var aDate = humanFormat.parse(a[0]);
                var bDate = humanFormat.parse(b[0]);

                return bDate - aDate;
              });

              // console.log(cellData);

              //Collate Region Array

              var tables = d3.select(that).append("table");
              var header = tables.append("thead").append("tr")
                              .selectAll("th").data(["Week Start Date"].concat(__typeArray))
                              .style("max-width", 100/(__typeArray.length+1) + "%")
                              .style("display", function(d, i) {
                                      // console.log(__typeArray, d, i);
                                      return params.t && params.t.indexOf(__typeArray[i-1]) >= 0 ? "none" : null;})
                              .enter().append("th").text(function(d){ return d; })
                                      .style("max-width", 100/(__typeArray.length+1) + "%")
                                      .style("display", function(d, i) {
                                        // console.log(__typeArray, d, i);
                                        return params.t && params.t.indexOf(__typeArray[i-1]) >= 0 ? "none" : null;
                                      });;

              var tableBody = tables.append("tbody");

              var bodyRows = tableBody.selectAll("tr")
                                  .data(cellData).enter().append("tr");

              var bodyCells = bodyRows.selectAll("td")
                                  .data(function(data) { return data; })
                                  .style("max-width", 100/(__typeArray.length+1) + "%")
                                  .style("display", function(d, i) {
                                    // console.log(d, i);
                                    // console.log("BODY", __typeArray, d, i);
                                      return params.t && params.t.indexOf(__typeArray[i-1]) >= 0 ? "none" : null;})
                                  .enter("td")
                                    .append("td").text(function(d) { return d; })
                                    .style("max-width", 100/(__typeArray.length+1) + "%")
                                    .style("display", function(d, i) {
                                      return params.t && params.t.indexOf(__typeArray[i-1]) >= 0 ? "none" : null;
                                    });
              // var cels = rows.selectAll("td").dataenter
          });

      // var typeGroup = [];
      // for (var i in typeList) { typeGroup.push(i); }
      // that._buildFilters(params, regionList, typeGroup);
  }; //end of tabulate();

  this.initialize = function () {
    var that = this;


    that.startDate.setDate(that.startDate.getDate() - that.startDate.getDay());
    that.endDate.setDate(that.endDate.getDate() -1 - that.endDate.getDay());


    var params = $.deparam(window.location.hash.substring(1));

    //Load states...
    $("select#states").append($("<option/>").val("all").text("All States"));
    for (var i in that.constant.states) {
      $("select#states").append(
        $("<option/>").prop("selected", i == params.state).val(i).text(that.constant.states[i]));
    }

    $("#global-filters input[name='state']").val(params.state);

    //Set view
    params.view = params.view || "chart";
    $("input[name='view']").val(params.view);

    //Set date ranges
    if (params.enddate && params.startdate) {
      $("#global-filters input[name='startdate']").val(params.startdate);
      $("#global-filters input[name='enddate']").val(params.enddate);

      $("#date-filter input[name='date-range-picker']").val(humanFormat(dateFormat.parse(params.startdate)) + " - " + humanFormat(dateFormat.parse(params.enddate)));
    } else {
      $("#date-filter input[name='date-range-picker']").val(humanFormat(that.startDate) + " - " + humanFormat(that.endDate));
    }

    //Filter state
    // that._filterState(params);
    that.process(params);

    //initialize Show/hide
    $(".filter-item-container").each(function() {
      var target = $(this);
        var that = $("[data-target='#" + target.attr("id") + "']");

        // console.log(target, target.find("input[type='checkbox']:checked").length, target.find("input[type='checkbox']").length);

      if( target.find("input[type='checkbox']:checked").length < target.find("input[type='checkbox']").length ) {
        that.text("Show All");
      } else {
        that.text("Hide All");
      }
    });




  };

  this._getStateName = function(isAll, d) { return isAll=="all" ? this.constant.states[d] : d; };

  this.initialize();
}


/* Set event listeners*/
$(function() {

   /* Initialize datepicker */
  $("#date-filter input[name=date-range-picker]").dateRangePicker({
    separator : ' - ',
    format: 'MMM DD, YYYY',
    batchMode: 'week-range',
    showShortcuts: false
  }).bind('datepicker-change', function(event, obj) {
    $("#global-filters input[name='startdate']").val(dateFormat(obj.date1));
    $("#global-filters input[name='enddate']").val(dateFormat(obj.date2));
    $("#global-filters").submit();
  });

  $("#global-filters").on("change", "input[type='checkbox']", function() {
    // alert("XXXX");

      var target = $(this).closest(".filter-item-container");
      var that = $("[data-target='#" + target.attr("id") + "']");


    if( target.find("input[type='checkbox']:checked").length < target.find("input[type='checkbox']").length ) {
      that.text("Show All");
    } else {
      that.text("Hide All");
    }

    //submit
    $("#global-filters").submit();
  });

  $("#global-filters").on("submit", null, function() {

      window.location.hash = $.param($("#global-filters input[type='checkbox']:not(:checked), #global-filters input[type='hidden']"));
    return false;
  });

  $("#global-filters input[name='view']").on("change", null, function() {
    $("#global-filters").submit();
  });

  $("#states").on("change", null, function() {
    $("#global-filters input[name='state']").val($("#states").val());
    bernieChartInstance.clearAll();
    $("#global-filters").submit();
  });

  $(".show-hide-all").on("click", function(e) {
    var that = $(this);
    var target = $(that.data().target);

    if( target.find("input[type='checkbox']:checked").length < target.find("input[type='checkbox']").length ) {

      target.find("input[type='checkbox']").prop("checked", true);
      that.text("Hide All");
    } else {
      target.find("input[type='checkbox']").prop("checked", false);
      that.text("Show All");
    }

    $("#global-filters").submit();
  });

  $(window).on("hashchange", function() {
      $("div#loader").show();

      setTimeout(function() {
        var parameters = $.deparam(window.location.hash.substring(1));
        bernieChartInstance.process(parameters);

        $("div#loader").hide();
      }, 10);
  });

  //Mark


});

/****
Bernie Sanders events analytics
Credits:
- http://c3js.org/
- http://d3js.org/
- https://jquery.com/
- http://momentjs.com/
- http://benalman.com/projects/jquery-bbq-plugin/
- https://github.com/longbill/jquery-date-range-picker
*/
