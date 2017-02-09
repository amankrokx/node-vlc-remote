"use strict";

const net          = require('net');
const EventEmitter = require('events').EventEmitter;


class Remote extends EventEmitter {

  constructor(port, host) {
    super();
    this.playlist = [];

    this._port = port || 8088;
    this._host = host || "127.0.0.1";
  }

  info(chain) { this._send("info", chain); }
  stop(chain) { this._send("stop", chain); }
  pause(chain) { this._send("pause", chain); }
  fullscreen(chain) { this._send("fullscreen ", chain); }

  vratio(ratio, chain) {
    if(ratio)
      this._send("vratio " + ratio, chain);
  }

  getLength(chain) {
          //first call to get_length always return 0
    this._send("get_length\r\nget_length", function (err, length) {
      if(err)
        return chain(err);

      chain(null, Number(length.split("\n")[1]));
    });
  }


  playonce(file, chain) {
    var self = this,
        meta_delay = 1000; //time to wait for metadata to be ready

    if(self.firstTimeout)
      clearTimeout(self.firstTimeout);
   if(self.secondTimeout)
    clearTimeout(self.secondTimeout);

    self._send("add "+file, function(err) {
      var dateStart = Date.now();
      self.firstTimeout = setTimeout(function(){
        self.getLength(function(err, length) {
          var videoRemainingTime = length * 1000 - (Date.now() - dateStart); 
          self.secondTimeout = setTimeout(function () {
            self.play(self.playlist, chain)
          }, videoRemainingTime  - 500)
        })
      } , meta_delay)
    })
  }

  enqueue(files, chain) {
    if(typeof files == "string")
      files = [files];

    if(!files.length)
      return chain();

    var verbs = files.map( file => `enqueue ${file}`).join("\r\n");

    this._send(verbs, chain);
  }

  play(/*files, [options,] chain*/) {
    
    var self = this;
    var args    = [].slice.apply(arguments),
      chain   = args.pop(),
      files = args.shift() || [];

    if(typeof files == "string")
      files = [files];

    if(!files.length)
      return this.stop(chain);

    this.playlist = files.slice(0);//clone it

    this._send("clear\r\nadd " + files.shift(), function(err){
      if(err)
        return chain(err);
      self.enqueue(files, chain);
    });
  }

  _send(str, chain) {
    //console.log('i send :' , str, chain);
   // chain = once(chain);
    chain = chain || Function.prototype;
    var dst  = { port: this._port, host:this._host};

    var sock = net.connect(dst, function(){
      sock.setNoDelay();

      var body = "";

      sock.on("data", function(buf){
        body += buf;
      });

      sock.once("end", function(){
        //trim vlc verbosity
        body = body.replace(/status change:.*\r?\n/g, '');
        body = body.replace(/^[\s\S]*?>/, '');
        body = body.replace(/> Bye-bye!.*/, '');
        chain(null , body.trim());
      });

      sock.once("error", /* istanbul ignore next */ function(err){
        chain(err)
      });

      try{
        sock.write(str + "\r\n", function(){
          sock.end();
        });
      }catch (e){  /* istanbul ignore next */ chain(e) }
    });

    sock.on("error", chain);
  }

}


module.exports = Remote;
