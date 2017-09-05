var BASE_URL = 'http://localhost:3000/';
var socket = io.connect(BASE_URL);
var loaded = false;
var isDrawing = false;
var lastX;
var lastY;
var newImage = {
  placing: false
}
var storedLines = [];
var objectID = 0;
var handleMenuAction;

$(function(){

  socket.on('getData', data => {
    if(!data || !data.length) return;
    storedLines = data;
    createFromStorage(storedLines);
  });

  socket.on('getLines', () => {
   socket.emit('data', { room: getParameterByName('room'), storedLines: storedLines});
  });

  socket.on('saved', () => {
    console.log('saved');
  });

  registerButtonHandlers();
  if(getParameterByName('map')){
    loadImage(getParameterByName('map'), function() {
      createListeners();
      joinRoom();
    });  
  }

  function registerButtonHandlers() {
    var modal = document.getElementById('shareModal');
    var btn = document.getElementById("shareModalBtn");
    var span = document.getElementsByClassName("close")[0];
    
    btn.onclick = function() {
      modal.style.display = "block";
      var input = document.getElementById('shareUrl');
      input.value = window.location;
    }
    span.onclick = function() {
      modal.style.display = "none";
    }
    window.onclick = function(event) {
      if (event.target == modal) {
          modal.style.display = "none";
      }
    }

    document.getElementById('saveBtn').addEventListener('click', e => {
      e.preventDefault();
      socket.emit('save', {
        map: getParameterByName('map'),
        token: getParameterByName('room'),
        storedLines: storedLines
      });
    });

    document.getElementById('zoomIn').addEventListener('click', e => {
      e.preventDefault();
      var canvas = document.getElementById('myCanvas');
      var ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      loadImage(getParameterByName('map'), function() {
        createFromStorage(storedLines);
      });
    })

    document.getElementById('kryosis').addEventListener('click', e => {
      e.preventDefault();
      loadMap('kryosis');
    });
  
    document.getElementById('sunset').addEventListener('click', e => {
      e.preventDefault();
      loadMap('sunset cove');
    });
  
  
    document.getElementById('brynhildr').addEventListener('click', e => {
      e.preventDefault();
      loadMap('brynhildr');
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
    socket.emit('newClient', room);
  }

  function createNewRoom(mapName) {
    var newRoom = makeid();
    socket.emit('room', newRoom);
    document.location = BASE_URL +  '?room=' + newRoom + '&map=' + mapName;
    socketHandlers();
  }

  function loadMap(mapName) {
    createNewRoom(mapName);
    loadImage(mapName, function() {
      createListeners();
    });
  }

  function loadImage(mapName, cb) {
    var context = document.getElementById('myCanvas').getContext('2d');
    var img = new Image();
    img.onload = function () {
        img.height = '64px';
        img.width = '64px';
        context.drawImage(img, 0, 0);
        return cb();
    }
    img.src = BASE_URL + "img/maps/" + mapName + ".png";
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
        socket.emit('data', { room: getParameterByName('room'), storedLines: storedLines});
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
        socket.emit('data', { room: getParameterByName('room'), storedLines: storedLines});
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
        socket.emit('data', { room: getParameterByName('room'), storedLines: storedLines});
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
        socket.emit('data', { room: getParameterByName('room'), storedLines: storedLines});
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
    loadImage(getParameterByName('map'), function() {
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

  handleMenuAction = function(evt) {
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
});