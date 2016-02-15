"use strict";

var isWin  = (process.platform == "win32");
var Remote = require("./");

  //not in package dependency, manage this by yourself
var vlc    = require("vlc-player"); 

var map    = require('mout/object/map');
var values = require('mout/object/values');
var mixIn  = require('mout/object/mixIn');


var config  = {
  'ignore-config'    : null,
  'no-plugins-cache' : null,
  'no-media-library' : null,
  'config'           : 'blank',


  'verbose'          : 0,
  'intf'             : 'dummy',

  'rc-host'          : '127.0.0.1:8088',
  'extraintf'        : 'rc',

  'video-on-top'     : null,

  'fullscreen'       : null,
  'loop'             : null,
};

if(isWin) mixIn(config, {
  'no-crashdump'     : null,
  'rc-quiet'         : null,
  'dummy-quiet'      : null,
});





module.exports = function(/*[options,] chain*/){
  var args    = [].slice.apply(arguments),
      chain   = args.pop(),
      options = args.shift() || {};


  var cmdargs = values( map(config, function(v, k){
    return '--' + k + '' +(v === null ? '' : '=' + v);
  } ));

  var recorder = vlc(cmdargs);

  if(false)
    recorder.stderr.pipe(process.stderr);

  var remote = new Remote(options.port, options.host);
  remote.vlc = recorder;

    //we consider everything ready once we can fetch dummy infos
  remote.info(function(err, output){
    chain(); 
  });

  return remote;
}
