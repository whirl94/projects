// ---------------------- sockets -----------------------
var socket = io.connect('http://localhost:80');
// ------------------------------------------------------

// ------------------ Page objects ----------------------
var container = $('#container');
var p1 = $("#player1");
var p2 = $("#player2");
var puck = $("#puck");
var post = $(".post");
var score1 = $("#score1");
var score2 = $("#score2");
var message = $("#message");
// ------------------------------------------------------

var gameSuspended = false, gameOver = false, isPlayer1 = false;

$(window).on('resize', function(){
  setBoundaries();
});

$(document).ready(function(){
  let roomInput = prompt('Create room:');
  let playerName = prompt('Player name:');
  socket.emit('join', {room: roomInput, player: playerName});

	setBoundaries();

	// collision detecter
  //puck.offset().left puck.offset().top obj1.width() obj2.width() obj.offset() obj.height()

  var coordinatesEmitter = setInterval( () => {
    socket.emit('emitCoordinates', {
      puck:{
        offsetLeft: puck.offset().left,
        offsetTop: puck.offset().top,
        width: puck.width(),
        height: puck.height()
      },
      p1:{
        offsetLeft: p1.offset().left,
        offsetTop: p1.offset().top,
        width: p1.width(),
        height: p1.height()
      },
      p2:{
        offsetLeft: p2.offset().left,
        offsetTop: p2.offset().top,
        width: p2.width(),
        height: p2.height()
      }
    });
  }, 13);

  socket.on('initializeBoard', (data) => {
    initializeBoard(data.gameOver, data.gameSuspended, data.p1Score, data.p2Score, data.isPlayer1);
  });

  socket.on('sendPlayer1Coordinates', (data) => {
    p1.css({top: data.playerY, left: data.playerX});
  });
  socket.on('sendPlayer2Coordinates', (data) => {
    p2.css({top: data.playerY, left: data.playerX});
  });
  socket.on('displayCountdown', (data) => {
    message.text(data.message);
  });
  socket.on('gameStarted', (data) => {
    gameSuspended = data.gameSuspended;
    message.css({ left:'43.8%', top: '12%'});
    message.text(data.message);
  });
  socket.on('gameOver', (data) => {
    message.css({ left:'43.9%', top: '12%'});
    message.text(data.message);
  });
  socket.on('movePuck', (data) => {
    console.log('moving puck');
    puck.offset({ left: data.puckLeft, top: data.puckTop });
  });
});

function setBoundaries(){
	containerRect = document.getElementById("container").getBoundingClientRect();
	leftNetRect = document.getElementById("leftNet").getBoundingClientRect();
	rightNetRect = document.getElementById("rightNet").getBoundingClientRect();
	bodyMargin = ($('body').innerWidth() - containerRect.right)/2;

  socket.emit('setBoundaries', {
    containerRect: containerRect,
    leftNetRect: leftNetRect,
    rightNetRect: rightNetRect,
    bodyMargin: bodyMargin,
    puckWidth: puck.width(),
    puckHeight: puck.height(),
    playerWidth: p1.width(),
    playerHeight: p1.height()
  });

  post.each( function(){
    console.log('zzzzzz');
    socket.emit('setPostBoundaries', {
      offsetLeft: $(this).offset().left,
      offsetTop: $(this).offset().top,
      width: $(this).width(),
      height: $(this).height()
    });
  });
}

function initializeBoard(isOver, isSuspended, p1Score, p2Score, isP1){
  gameOver = isOver;
  gameSuspended = isSuspended;
  isPlayer1 = isP1;
  console.log(isPlayer1);

	p1.css({ left: '20%', top: '47%' });
	p2.css({ left: '75%', top: '47%' });
	puck.css({ left: '48.7%', top: '49.2%' });
	message.css({ left:'42%', top: '12%'});
	score1.text(p1Score);
	score2.text(p2Score);
}

function setPosition(player, value){
	player.css({ position: value});
}

// ------------------ Events ---------------------
container.mouseover(function(e){
  if(!gameSuspended || !gameOver)
	 container.css('cursor', 'none');
});

container.mousemove(function(e){
	playerX = e.clientX;
	playerY = e.clientY;

  //send coordinates to backend ?

	if(!gameSuspended){
    if(isPlayer1){
      emitPlayerCoordinates(p1, playerX, playerY);
    }else{
      emitPlayerCoordinates(p2, playerX, playerY);
    }
  }
});

function emitPlayerCoordinates(player, px, py) {
  socket.emit('sendCoordinates',{
    objectWidth: player.innerWidth(),
    objectHeight: player.innerHeight(),
    playerX: px,
    playerY: py,
    isPlayer1: player.is(p1)
  });
}
// -----------------------------------------------
