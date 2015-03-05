#!/usr/bin/env node

/* Copyright (C) 2012 Igalia S.L.
*
* Author: Javier Fernandez Garcia-Boente <jfernandez@igalia.com>
*
* Licensed under the MIT license */

var redis_port = '6379';
var redis_ip = '10.200.146.162';
var redis  = require('redis').createClient(redis_port, redis_ip);

var mac = require('getmac');
var ip = require('ip');

var nodestat = require('node-stat');

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
        mac.getMac(function(err,macAddress){
            if (err)  throw err;
            data.mac = macAddress;
        });
        data.ip = ip.address();
        var time = new Date().getTime();

        function write_redis() {
            data.id = data.mac + ':' + time;
            console.log(data);
            redis.zadd(data.mac, time, JSON.stringify(data), function(err, reply) {
                if(err) {
                    console.error('redis: '+ err);
                }
            });
        }
        /* wait for mac.getMac to finish */
        setTimeout(write_redis, 1000);
   });
}, 1000);
