var bodyParser = require('body-parser'),
methodOverride = require('method-override'),
cors = require('cors'),
express = require('express'),
morgan = require('morgan'),
multer  = require('multer'),
uuid = require('node-uuid'),
Approxy = require('approxy'),
approxy = new Approxy();

approxy.on('proxyError',function(err){
  console.log('PROXY ERROR', err.message);
});

morgan.token('id', function getId(req) {
  return req.id;
});

var app = express();

app.use(cors());

// configure Express
app.use(function(req, res, next){
  // add request id
  req.id = uuid.v4();
  res.set('x-approxy-id', req.id);

  // set the right ip
  if (req.headers['x-forwarded-for']) {
      var list = req.headers['x-forwarded-for'].split(",");
      req.ip = list[list.length-1];
   } else if (req.socket && req.socket.remoteAddress) {
      req.ip = req.socket.remoteAddress;
   } else if (req.socket && req.socket.socket && req.socket.socket.remoteAddress) {
      req.ip = req.socket.socket.remoteAddress;
   } else {
    req.ip = req.connection.remoteAddress;
   }

  next();
});

app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":id" ":req[x-approxy-url]" ":response-time"'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());
app.use('/bin', multer({ dest: './uploads/'}));

app.use(methodOverride());

app.use(app.router);

app.all('/proxy', approxy.middleware);

app.all('/bin', function(req, res){
  res.json({
    headers: req.headers,
    body: req.body
  });
});

app.get('/*', function(req, res){
  res.send(200);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  console.error(err.status);
  if (!err.status){
    err.status = 500;
  }
  res.status(err.status).send(err.message || 'Internal Error');
});

var port = Number(process.env.PORT || 3000);

app.listen(port, function() {
  console.log('Approxy server listening on port ' + port);
});