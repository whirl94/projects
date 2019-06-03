// -------------------- Puck speed ----------------------
const DECELERATION = 0.001;
const INITIAL_DIVISIONS = 20;
const INITIAL_DX = 8;
// ------------------------------------------------------

const GAME_COUNTDOWN = 3;
const GAME_OVER_POINTS = 3;
const GAME_OVER_MSG = 'Game over';
const GAME_STARTED_MSG = 'Game started';
const GAME_STARTING_MSG = 'Game starts in ';
var io;

// ------------------- Boundaries -----------------------
var containerRect, leftNetRect, rightNetRect, bodyMargin;
var puckWidth, puckHeight, playerWidth, playerHeight;
var posts = [];
// ------------------------------------------------------

// -------------------- Other stuff ---------------------
var isPlayer1 = false;
var players = [];
var p1X, p1Y, p2X, p2Y, puckOffsetLeft, puckOffsetTop;
var player1Score = 0, player2Score = 0;
var gameSuspended = true, gameOver = false;
var playerX = 0, playerY = 0;
var dx, dx_starter, dy, dyDivisions;
var puckCenter = [0,0];
var message = '';
var mover = setInterval(function(){},10000);
var puckSpeed = setInterval(function(){},10000);
// ------------------------------------------------------

module.exports = {
  setIO: (sentIo) => {
    io = sentIo;
  },

  setBoundaries: (socket) => {
    socket.on('setBoundaries', (data) => {
      containerRect = data.containerRect;
      leftNetRect = data.leftNetRect;
      rightNetRect = data.rightNetRect;
      bodyMargin = data.bodyMargin;
      puckWidth = data.puckWidth;
      puckHeight = data.puckHeight;
      playerWidth = data.playerHeight;
      playerHeight = data.playerHeight;
    });
  },

  initializeBoard: (socket, currentPlayers) => {
    initializeBoard(socket, currentPlayers);
  },

  setPostBoundaries: (socket) => {
    socket.on('setPostBoundaries', (data) => {
      if(posts.length === 4){
        // console.log(posts);
        posts = [];
      }else{
        posts.push(data);
      }
    });
  },

  sendPlayerCoordinates: (socket) => {
    socket.on('sendCoordinates', (data) => {
      if(data.isPlayer1){
        if( !(isXOutOfLeftHalf(data.playerX, data.objectWidth) || isYOutOfContainer(data.playerY, data.objectHeight)) ){
          p1X = data.playerX;
          p1X = data.playerY;
          io.emit('sendPlayer1Coordinates', data);
        }
      }else{
        if( !(isXOutOfRightHalf(data.playerX, data.objectWidth) || isYOutOfContainer(data.playerY, data.objectHeight)) ){
          p2X = data.playerX;
          p2Y = data.playerY;
          io.emit('sendPlayer2Coordinates', data);
        }
      }
    });
  },

  checkCollision: (socket) => {
    socket.on('emitCoordinates', (data) => {
      puckOffsetLeft = data.puck.offsetLeft;
      puckOffsetTop = data.puck.offsetTop;

      if(hasCollision(data.p1, data.puck)){
        console.log('collision1');
        clearInterval(mover);
        movePuck(data.p1, data.puck, socket);
      }

      if(hasCollision(data.p2, data.puck)){
        console.log('collision2');
        clearInterval(mover);
        movePuck(data.p2, data.puck, socket);
      }

      for(let i = 0; i < posts.length; i++){
        if(hasCollision(posts[i], data.puck)){
          clearInterval(mover);
          console.log('post colision');
          movePuck(posts[i], data.puck, socket);
        }
      }
    });
  }
};

function isGoalScored(puckData){
	//left net
	if(puckOffsetLeft < leftNetRect.right && puckOffsetTop > leftNetRect.top && puckOffsetTop < leftNetRect.bottom ){
		player2Score++;
		return true;
	}
	//right net
	if(puckOffsetLeft + puckWidth > rightNetRect.left &&
      puckOffsetTop > rightNetRect.top && puckOffsetTop < rightNetRect.bottom ){
		player1Score++;
		return true;
	}
}

function initializeBoard(socket, currentPlayers){
  gameSuspended = true;
  players = currentPlayers;

  if(player1Score >= GAME_OVER_POINTS || player2Score >= GAME_OVER_POINTS){
    gameOver = true;
  }

  socket.emit('initializeBoard', {
    gameOver: gameOver,
    gameSuspended: gameSuspended,
    p1Score: player1Score,
    p2Score: player2Score,
    isPlayer1: players.length === 1
  });

  if(currentPlayers.length === 2){
    if(!gameOver){
      displayCountdown(socket);
      increasePuckSpeed();
    }else{
      clearInterval(puckSpeed);
      displayGameOver(socket);
    }
  }
}

function displayCountdown(socket){
	var counter = GAME_COUNTDOWN;
  message = '';
  io.emit('displayCountdown', {message});
	var countdown = setInterval(function(){
		if(counter !== 0){
      message = GAME_STARTING_MSG + counter + '...';
      io.emit('displayCountdown', {message});
			counter--;
		}else{
      message = GAME_STARTED_MSG;
      gameSuspended = false;
      io.emit('gameStarted', {
        message: message,
        gameSuspended: gameSuspended
      });
			clearInterval(countdown);
		}
	}, 1000);
}

function displayGameOver(socket){
  message = GAME_OVER_MSG;
  io.emit('gameOver', {message});
}

function increasePuckSpeed(){
	// every 10 seconds, increase puck speed
	dx_starter = INITIAL_DX;
	dyDivisions = INITIAL_DIVISIONS;
	clearInterval(puckSpeed);
	puckSpeed = setInterval(function(){
		dx_starter += 0.5;
		dyDivisions -= 0.5;
    console.log('speed increased');
	},10000);
}

function isXOutOfLeftHalf(x, objectWidth){
	return (x < containerRect.left || x + objectWidth > containerRect.right/2 + bodyMargin);
}

function isXOutOfRightHalf(x, objectWidth){
	return (x < containerRect.right/2 + bodyMargin || x + objectWidth > containerRect.right);
}

function isYOutOfContainer(y, objectHeight){
	return (y + objectHeight > containerRect.bottom || y < containerRect.top);
}

function isPuckXOutOfContainer(x, objectWidth){
  if(x < containerRect.left){
    puckOffsetLeft = containerRect.left;
    return true;
  }
  if(x + objectWidth > containerRect.right){
    puckOffsetLeft = containerRect.right - objectWidth;
    return true;
  }
}

function isPuckYOutOfContainer(y, objectHeight){
  if(y + objectHeight > containerRect.bottom){
    puckOffsetTop = containerRect.bottom - objectHeight;
    return true;
  }
  if(y < containerRect.top){
    puckOffsetTop = containerRect.top;
    return true;
  }
}

function hasCollision(obj1,obj2){
  return getDistance(obj1,obj2) < obj1.width/2+obj2.width/2;
}

function getDistance(obj1,obj2){
  playerCenter = calculateCenter(obj1);
  puckCenter = calculateCenter(obj2);

  var distance=Math.sqrt( Math.pow( puckCenter[0]-playerCenter[0], 2)  + Math.pow( puckCenter[1]-playerCenter[1], 2) );
  // console.log(distance);
  return distance;
}

function calculateCenter(obj){
	return [obj.offsetLeft + obj.width/2, obj.offsetTop + obj.height/2];
}

function movePuck(playerData, puckData, socket){
	var deceleration=DECELERATION;
	var playerCenter = calculateCenter(playerData);
	var playerXOffset = playerCenter[0] - puckCenter[0];
	var playerYOffset = playerCenter[1] - puckCenter[1];
	var xDirection = yDirection = 1;
	var xOffset, yOffset;

	dx = dx_starter;
	dy = Math.abs(playerYOffset / dyDivisions);

	mover = setInterval(function(){
		if(isGoalScored(puckData)){
      console.log('goal');
			clearInterval(mover);
			initializeBoard(socket, players);
			return;
		}

		if(isPuckXOutOfContainer(puckOffsetLeft, puckData.width)){
			xDirection *= -1;
		}

		if(isPuckYOutOfContainer(puckOffsetTop, puckData.width)){
			yDirection *= -1;
		}

		//player is on the right side of the puck
		if(playerXOffset < 0)
			xOffset = puckOffsetLeft + dx * xDirection;
		else
			xOffset = puckOffsetLeft - dx * xDirection;

		//player is above the puck
		if(playerYOffset < 0)
			yOffset = puckOffsetTop + dy * yDirection;
		else{
			yOffset = puckOffsetTop - dy * yDirection;
		}

		if(dx >= deceleration) dx -= deceleration;
		if(dy >= deceleration) dy -= deceleration;

    io.emit('movePuck', {
      puckLeft: xOffset, puckTop: yOffset
    });

		//stop puck
		if(dx <= deceleration && dy <= deceleration){
      console.log('puck stopped');
			clearInterval(mover);
		}
	}, 10);
}
