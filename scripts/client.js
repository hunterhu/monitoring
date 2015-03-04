/* Copyright (C) 2012 Igalia S.L.
*
* Author: Javier Fernandez Garcia-Boente <jfernandez@igalia.com>
*
* Licensed under the MIT license */

"use strict";

jQuery(document).ready(function() {

  var socket = io.connect();

  var updates = {};

  var list = [];
  var net1 = [];
  var net2 = [];

  function sortUpdates() {
    /* reset the list[] */
    list = [];
    var k;
    for (k in updates) { list.push([k, updates[k].t]);}
    // Sort descending as X axis is descending too.
    list.sort(function(a, b) {
      return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0;
    });
  }

  function getNetData() {
    /* reset the net1/2[] */
    net1 = [];
    net2 = [];
    var len = list.length;
    var i;
    for (i=0; i < len; i++) {
      var u = updates[list[i][0]];
      var data = u.data;
      if (data) {
        net1.push(u.data.net.total.receive/1000);
        net2.push(u.data.net.total.send/1000);
      }
    }
  }

  function displayGraph(id, data, displayData, shiftData, domain) {

    var color = d3.scale.category10();
    //color.domain(['1-minute', '5-minute', '15-minute']);
    color.domain(Object.keys(data));

    var series = color.domain().map(function(name) {
      return {
        name: name,
        values: data[name]
      };
    });

    var margin = {top: 10, right: 50, bottom: 20, left: 10},
    width = 600 - margin.left - margin.right,
    height = 250 - margin.top - margin.bottom;

    var x = d3.scale.linear()
      .domain([0, 60])
      .range([width, 0]);
    var y = d3.scale.linear()
      .range([height, 0]);

    if (domain !== undefined) {
      y.domain(domain);
    } else {
      y.domain([
        d3.min(series, function(l) { return d3.min(l.values, function(v) { return v*0.75; }); }),
        d3.max(series, function(l) { return d3.max(l.values, function(v) { return v*1.25; }); })
      ]);
    }

    var line = d3.svg.line()
      .x(function(d, i) { return x(i); })
      .y(function(d) { return y(d); });

    // create an SVG element inside the #graph div that fills 100% of the div
    //var graph = d3.select(id).append("svg:svg").attr("width", "100%").attr("height", "100%");
    var graph = d3.select(id).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xAxis = graph.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.svg.axis().scale(x).orient("bottom"));

    var yAxis = graph.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + width + ",0)")
      .call(d3.svg.axis().scale(y).orient("right"));

    var ld = graph.selectAll(".series")
      .data(series)
      .enter().append("g")
      .attr("class", "series");

    // display the line by appending an svg:path element with the data line we created above
    var path = ld.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.name); });

    displayData(color);

    function redraw() {
      // static update without animation
      if (domain === undefined) {
        y.domain([
          d3.min(series, function(l) { return d3.min(l.values, function(v) { return v*0.75; }); }),
          d3.max(series, function(l) { return d3.max(l.values, function(v) { return v*1.25; }); })
        ]);
      }
      yAxis.call(d3.svg.axis().scale(y).orient("right"));

      path
        //.data([load]) // set the new data
        //.attr("d", line); // apply the new data values
        .attr("d", function(d) { return line(d.values); })

      displayData(color);
    }

    /* this is the other end of the socket
     * StreamAssembler.js Line 177 socket.emit()
     */
    socket.on('dUpdates', function(newUpdates) {
      console.log(newUpdates);
      /*
       * new data for running time redrawing
       * Note that the shiftData() passed in as an argument, it could be any of
       * the 3: shiftCpuData, shiftNetData, shiftLoadData.
       */
      shiftData(newUpdates);
      redraw();
    });
  }

  function displayNetData (color) {
    $('#net1')[0].innerText = net1[0].toFixed(2) + ' Kb';
    $('#net2')[0].innerText = net2[0].toFixed(2) + ' Kb';

    $('.net1')[0].style.color = color('Received');
    $('.net2')[0].style.color = color('Sent');
  }

  function shiftNetData (newUpdates) {
    var i;
    for (i=0; i < newUpdates.length; i += 2) {
      var u = newUpdates[i];
      net1.pop()
      net1.splice(0, 0, u.net.total.receive/1000);
      net2.pop()
      net2.splice(0, 0, u.net.total.send/1000);
    }
  }

  function drawNetGraph (id) {
    console.log('initial updates for:',id);
    var title = 'Net usage';
    var data = {'Received': net1, 'Sent': net2};

    displayGraph(id, data, displayNetData, shiftNetData);
  }

  socket.on('connect', function() {
    console.log('connected');
  });
  socket.on('disconnect', function() {
    console.log('disconnected');
  });
  socket.on('error', function(err) {
    if(err === 'handshake error') {
      console.log('handshake error', err);
    } else {
      console.log('io error', err);
    }
  });
  /* initial update only to start drawing all elements
   * The calls in the initial update setup all later runtime updates "dUpdate"
   * event for each id;  and so far, the id is hardcoded as #cpu, #net, #load
   * which are meant for only 3 graphs
   */
  socket.on('updates', function(newUpdates) {
    console.log(newUpdates);
    updates = newUpdates;
    /* save updates into list[] and sort the list[] */
    sortUpdates();
    var len=list.length;
    var u=updates[list[len-1][0]];
    /* Get net data out of updates and put them into net1/2[] */
    getNetData();
    drawNetGraph(u.data.id);
  });

});
