/*************************************
//
// playbook app
//
**************************************/

// express magic
var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var device  = require('express-device');

var runningPortNumber = process.env.PORT;


app.configure(function(){
	// I need to access everything in '/public' directly
	app.use(express.static(__dirname + '/public'));

	//set the view engine
	app.set('view engine', 'ejs');
	app.set('views', __dirname +'/views');

	app.use(device.capture());
});


// logs every request
app.use(function(req, res, next){
	// output every request in the array
	console.log({method:req.method, url: req.url, device: req.device});

	// goes onto the next function in line
	next();
});

app.get("/", function(req, res){
	res.render('index', {});
});


io.sockets.on('connection', function (socket) {
	var room;
	socket.on('room', (socketRoom) => {
		room = socketRoom;
		console.log(socketRoom);
		socket.join(socketRoom);
	});

	socket.on('data', data => {
		console.log(room);
		socket.broadcast.to(room).emit('getData', data);
	});

	socket.on('newClient', () => {
		console.log('new client');
		socket.broadcast.to(room).emit('getLines');
	})

});


server.listen(runningPortNumber);

