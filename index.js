'use strict';

var Url = require('url'),
util = require('util'),
EventEmitter = require('events').EventEmitter,
validator = require('validator'),
httpProxy = require('http-proxy'),
proxy = new httpProxy.createProxyServer(),
Approxy;

Approxy = function(customOptions){
  var self = this;

  self.options = {};

  if(customOptions){
    for(var i in customOptions){
      self.options[i] = customOptions[i];
    }
  }

  self.getValueByString = function (o, s) {
    var a = s.split('.');
    while (a.length) {
      var n = a.shift();
      if (n in o) {
          o = o[n];
      } else {
          return false;
      }
    }
    return o;
  };

  self.middleware = function (req, res, next) {
    var error, endpointInfo, target, proxyUrl, validUrl;

    // Handle body parser issues (not needed for multipart content)
    if(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') < 0){
      req.removeAllListeners('data');
      req.removeAllListeners('end');

      process.nextTick(function () {
        if(req.body) {
          req.emit('data', JSON.stringify(req.body));
        }
        req.emit('end');
      });
    }

    // set proxyUrl
    proxyUrl = req.headers['x-approxy-url'];

    // check for proxy url
    if (!proxyUrl) {
      error = new Error('Missing Proxy Url');
      self.emit('proxyError', error);
      return next(error);
    }

    // validate url
    proxyUrl = validator.trim(proxyUrl);
    validUrl = validator.isURL(proxyUrl, {protocols: ['https', 'http']});

    if(!validUrl){
      error = new Error('Error Reading Proxy Url');
      self.emit('proxyError', error);
      return next(error);
    }

    // url.parse creates an object
    endpointInfo = Url.parse(proxyUrl);
    target = endpointInfo.protocol + '//' + endpointInfo.host;
    req.url = endpointInfo.pathname;

    // Fix "Error: socket hang up" by removing content-length headers
    delete req.headers['content-length'];
    delete req.headers['keep-alive'];

    if (self.options.userAgent){
      req.headers['user-agent'] = self.options.userAgent;
    }

    proxy.on('start', function(req, res, target){
      self.emit('proxyStart', req, res, target);
    });

    proxy.on('end', function(req, res, proxyRes){
      self.emit('proxyEnd', req, res, proxyRes);
    });

    proxy.on('error', function (err) {
      self.emit('proxyError', err);
      next(err);
    });

    proxy.web(req, res, {
      target: target
    });
  };

};

util.inherits(Approxy, EventEmitter);

module.exports = Approxy;