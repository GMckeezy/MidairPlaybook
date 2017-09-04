var BASE_URL = 'https://mysterious-hamlet-45975.herokuapp.com/';
var socket = io.connect(BASE_URL);
var loaded = false;
var isDrawing = false;
var isDragging = false;
var lastX;
var lastY;
var newImage = {
  placing: false
}
var storedLines = [];
var objectID = 0;
$(function(){

  socket.on('getData', data => {
    storedLines = data;
    createFromStorage(storedLines);
  });

  socket.on('getLines', () => {
    console.log('sending lines');
   socket.emit('data', storedLines);
  });

  if(getParameterByName('map')){
    loadImage(function() {
      createListeners();
      joinRoom();
    });  
  }

  function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  function joinRoom() {
    var room = getParameterByName('room');
    socket.emit('room', room);
    socket.emit('newClient');
  }

  function socketHandlers(){
    socket.on('getData', (data) => {
      console.log(data);
      createFromStorage(data);
    });
  }

  function createNewRoom(mapName) {
    var newRoom = makeid();
    socket.emit('room', newRoom);
    document.location += '?room=' + newRoom + '&map=' + mapName;
    socketHandlers();
  }

  function loadMap(mapName) {
    createNewRoom(mapName);
    loadImage(function() {
      createListeners();
    });
  }

  function loadImage(cb) {
    var context = document.getElementById('myCanvas').getContext('2d');
    var img = new Image();
    img.onload = function () {
        img.height = '64px';
        img.width = '64px';
        context.drawImage(img, 0, 0);
        console.log('loaded')
        return cb();
    }
    img.src = BASE_URL + "img/kryosis.png";
  }

  function addText(x, y, text){
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = "red";
    ctx.font = "bold 24px Arial";
    ctx.fillText(text || newImage.text, x, y);  
    newImage.placing = false;
  }

  function addImage(x, y) {
    switch(newImage.type) {
      case 'turret':
        storedLines.push({
          type: 'turret',
          x: x,
          y: y,
          posX: 0,
          posY: 0,
          id: objectID
        });
        socket.emit('data', storedLines);
        addTurret(x, y);
        break;

      case 'flag':
        storedLines.push({
          type: 'flag',
          x: x,
          y: y,
          posX: 0,
          posY: 0,
          id: objectID
        });
        socket.emit('data', storedLines);
        addFlag(x, y);
        break;

      case 'text':
        storedLines.push({
          type: 'text',
          text: newImage.text,
          x: x,
          y: y,
          id: objectID
        });
        socket.emit('data', storedLines);
        addText(x, y);
        break;

      default: 
        console.log('No type');
    }
  }

  function addTurret(x, y, cb){
    var context = document.getElementById('myCanvas').getContext('2d');
    var img = new Image();
    img.onload = function () {
      context.drawImage(img, x - 32 ||0, y - 32 || 0, 64, 64);
      newImage.placing = false;
    }
    img.src = BASE_URL + "img/turret.png";  
  }

  function addFlag(x, y) {
    var context = document.getElementById('myCanvas').getContext('2d');
    var img = new Image();
    img.onload = function () {      
      context.drawImage(img, x - 32 ||0, y - 32 || 0, 64, 64);
      newImage.placing = false;
    }
    img.src = BASE_URL + "img/flag.png";    
  }

  function createListeners() {
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');

    canvas.onmousemove = function(e) {
      if(isDrawing){
        x = e.pageX - this.offsetLeft;
        y = e.pageY - this.offsetTop;
        var fillColor = '#000';
        storedLines.push({
          type: 'line',
          x1: lastX || x,
          y1: lastY || y,
          x2: x,
          y2: y,
          id: objectID
        });
        socket.emit('data', storedLines);
        if (lastX && lastY && (x !== lastX || y !== lastY)) {
          ctx.fillStyle = "#000000";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
        lastX = x;
        lastY = y; 
      }
    };
    
    canvas.onmousedown = function(e) {
      if(e.button === 2) return;
      x = e.pageX - this.offsetLeft;
      y = e.pageY - this.offsetTop;
      objectID++
      if(newImage.placing) return addImage(x,y );
      isDrawing = true;
    };

    canvas.onmouseup = function(e) {
      lastX = null;
      lastY = null;
      isDrawing = false;
    };  
  }

  function undo() {
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');
    const lines = storedLines.filter(obj => {
      return obj.id !== objectID;
    });
    ctx.clearRect(0,0,1200, 720);
    objectID--;
    loadImage(function() {
      createFromStorage(lines);
    });
  }

  function createFromStorage(lines) {
    var canvas = document.getElementById('myCanvas');
    var ctx = canvas.getContext('2d');
    objectID = 0;
    for(var i=0;i<lines.length;i++){
      if(lines[i].type === 'line'){
        ctx.fillStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(storedLines[i].x1,storedLines[i].y1);
        ctx.lineTo(storedLines[i].x2,storedLines[i].y2);
        ctx.stroke();
      } else if (lines[i].type === 'text'){
        addText(lines[i].x, lines[i].y, lines[i].text);
      } else if (lines[i].type === 'turret'){
        addTurret(lines[i].x, lines[i].y);
      } else if (lines[i].type === 'flag') {
        addFlag(lines[i].x, lines[i].y)
      }

      objectID++;
    }
    storedLines = lines;
  }

  document.getElementById('kryosis').addEventListener('click', e => {
    e.preventDefault();
    loadMap('kryosis');
  });
});

var i = 0;

function handleMenuAction(evt) {
  console.log(i);
  switch (evt) {
    case 'undo':
      undo();
      break;

    case 'turret':
      newImage = {
        placing: true,
        type: 'turret'
      }
      break;

    case 'flag':
      newImage = {
        placing: true,
        type: 'flag'
      };
      break;

    case 'ld':
      newImage = {
        placing: true,
        type: 'text',
        text: 'LD'
      };
      break;

    case 'homed':
      newImage = {
        placing: true,
        type: 'text',
        text: 'HOMED'
      };
      break;   
      
      case 'capper':
      newImage = {
        placing: true,
        type: 'text',
        text: 'CAPPER'
      };
      break;

      case 'lo':
      newImage = {
        placing: true,
        type: 'text',
        text: 'LO'
      };
      break;  

    default: 
    alert("Action required: " + evt);
  }
}