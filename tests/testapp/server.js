var getApp = require('./app'),
    http = require('http'),
    middleware = require('../../index');

var app =  getApp(middleware({
    maxInstances: 1
}));
server = http.Server(app);
server.listen(3000);
console.log('server started at http://localhost:3000/');