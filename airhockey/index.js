const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const gl = require('./public/js/game_logic.js');

const rooms = ["First", "Second", "Third"];
var players = [];

//static files
app.use(express.static('public'));

console.log('Initializing server...');

server.listen(80, () =>
{
  console.log('listening to requests on port 80')
});

app.get('css/style.css', (req,res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(__dirname + '/public/css/style.css');
  res.status(200);
});
app.get('js/functions.js', (req,res) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.sendFile(__dirname + '/public/js/functions.js');
  res.status(200);
});

app.get('/', (req,res) => {
    console.log('A intrat in \'/\'');
    res.sendFile(__dirname + '/public/templates/index.html');
});

// Expose the list of available ROOMS
app.get('/rooms', (req,res) => {
    console.log('List of  rooms requested..');
    // let rooms = io.sockets.adapter.rooms;
    res.status(200).send(rooms);
    console.log('List of Rooms sent.', rooms);
});

app.get('/room/:id', (req, res) => {
  var id = req.params.id;
  console.log('room id:' + id);
  res.status(200).send(rooms[id - 1]);
});

// Expose the list of PLAYERS
app.get('/players', (res,req) => {
    console.log('List of players requested..');
    req.status(200).send(players);
    console.log('List of players sent: ', players);
});

// New client connected
io.on('connect', (socket) => {
    gl.setIO(io);
    console.log('User connected: ', socket.id, socket.adapter.rooms);
    socket.emit('news', {hello: 'world'});
    // socket.join(roomInput);

    socket.on('my other event', (data) => {
        console.log(data);
    });

    socket.on('join', (data) => {
      if(players.length !== 2){
        var pname = players.length + 1;
        players.push(new Player("Player " + pname));
        console.log(players);
        socket.emit('playerConnected', "You have connected to the server.");
        gl.initializeBoard(socket, players);
        if(players.length === 2){
          gl.setBoundaries(socket);
          gl.setPostBoundaries(socket);
          gl.sendPlayerCoordinates(socket);
          gl.checkCollision(socket);
        }
      }
    });
});

// Client disconnected
io.on('disconnect', (socket) => {
    console.log('User disconnected: ', socket.id);
});

class Player{

  constructor(name){
    this.name = name;
  }
}
