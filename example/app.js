var bodyParser = require('body-parser'),
methodOverride = require('method-override'),
cors = require('cors'),
express = require('express'),
morgan = require('morgan'),
uuid = require('node-uuid'),
Approxy = require('approxy'),
approxy = new Approxy({
  userAgent: 'Proxied Via Approxy'
});

var multer  = require('multer');

morgan.token('id', function getId(req) {
  return req.id;
});


var app = express();

app.use(cors());

// configure Express
app.use(function(req, res, next){
  req.id = uuid.v4();
  req.headers['x-approxy-request-id'] = req.id;
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
  console.error(err);
  res.send(err.status || 500);
});

var port = Number(process.env.PORT || 3000);

app.listen(port, function() {
  console.log('Approxy server listening on port ' + port);
});