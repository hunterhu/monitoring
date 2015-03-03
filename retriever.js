#!/usr/bin/env node

/* Copyright (C) 2012 Igalia S.L.
*
* Author: Javier Fernandez Garcia-Boente <jfernandez@igalia.com>
*
* Licensed under the MIT license */

var nodestat = require('node-stat');
var redis  = require('redis').createClient();

/*
function insert(data) {
  var sysInfo = JSON.parse(data);
  var time = new Date().getTime();
  var stat = JSON.stringify(sysInfo.stat);
  var net = JSON.stringify(sysInfo.net);
  var load = JSON.stringify(sysInfo.load);

  redis.multi()
    .zadd('stat', time, stat)
    .zadd('net', time, net)
    .zadd('load', time, load)
    .exec(function(err, reply) {
      if(err) {
        console.error('redis: '+ err);
      }
    });
}
*/

setInterval(function() {
    nodestat.get('net', function(err, data) {
      console.log(data);
      var time = new Date().getTime();
      /* TODO: localhost will be replaced by MAC Address for data.id and key */
      data.id = 'localhost:'+time;
      /* TODO: key: localhost, score: time, value: JSON.stringify(data)
       *       with time goes by, the set key localhost's data will increase,
       *       how do we maintain that so that we won't fill up disk space?
       *       it would be better to delete from Redis old data scores/values,
       *       and how long would a key's data will be kept for reference?
       */
      redis.zadd('localhost', time, JSON.stringify(data), function(err, reply) {
        if(err) {
          console.error('redis: '+ err);
        }
      });
    });
}, 1000);
