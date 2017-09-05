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
var mongoose = require('mongoose');
var playbook = require('./models/playbook');

var runningPortNumber = process.env.PORT;

mongoose.connect('mongodb://localhost/playbook');


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
	socket.on('room', (socketRoom) => {
		socket.join(socketRoom);
	});

	socket.on('data', data => {
		console.log(data);
		socket.broadcast.to(data.room).emit('getData', data.storedLines);
	});

	socket.on('newClient', socketRoom => {
		var roster = io.sockets.clients(socketRoom);
		if(roster.length === 1) {
			return playbook.findOne({token: socketRoom})
				.then(doc => {
					if(!doc) return;
					return socket.emit('getData', doc.storedLines);
				})
		} else {
			socket.broadcast.to(socketRoom).emit('getLines');
		}
	});

	socket.on('save', data => {
		playbook.findOne({token: data.token})
			.then(doc => {
				if(!doc) {
					var newDoc = new playbook({
						map: data.map,
						token: data.token,
						storedLines: data.storedLines
					});
					return newDoc.save();
				} else {
					doc.storedLines = data.storedLines;
					return doc.save();
				}
			})
			.then(() => {
				return socket.emit('saved');
			})
			.catch(err => console.log(err));
	})

});


server.listen(runningPortNumber);

