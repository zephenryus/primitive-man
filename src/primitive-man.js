function PrimitiveMan () {
	var d = new Date();

	this.time = {
		fpsTimer: 0,
		lastTime: 0,
		thisTime: d.getTime(),
		deltaTime: 0
	}
	this.frames = 0;

	var that = this;
	this.states = {
		running: false,
		isLoaded: false,
		game: {
			running: false,
			paused: false
		},
		menu: {
			running: false,
			paused: false
		}
	}
	this.stack = [];

	this.canvas = new Canvas( "canvas" );

	this.inputHandler = new InputHandler( this );

	this.stack.push( mainMenu );
	console.log( this.stack[this.stack.length - 1] );
	this.load();
	this.start();
}

PrimitiveMan.prototype.load = function () {
	console.log( "Loading Primitive Man" )
	this.stack[this.stack.length - 1].load();
}

PrimitiveMan.prototype.loop = function () {
	this.update( this.time );
	this.render( this.canvas );

	if ( this.time.fpsTimer >= 1 ) {
		console.log( this.frames + " fps" );
		this.time.fpsTimer = 0;
		this.frames = 0;
	}

	var that = this;
	if ( this.states.running ) {
		window.requestAnimationFrame( function () {
			that.loop();
		} );
	}
}

PrimitiveMan.prototype.render = function ( canvas ) {
	canvas.clear();
	this.stack[this.stack.length - 1].render( canvas );
	this.frames++
}

PrimitiveMan.prototype.start = function () {
	this.states.running = true;
	this.loop();
}

PrimitiveMan.prototype.stop = function () {
	this.states.running = false;
}

PrimitiveMan.prototype.update = function ( time ) {
	var d = new Date();
	time.lastTime = time.thisTime;
	time.thisTime = d.getTime();
	time.deltaTime = ( time.thisTime - time.lastTime ) / 1000;
	time.fpsTimer += time.deltaTime;

	this.stack[this.stack.length - 1].update( time );
}



function Canvas ( id ) {
	this.elem = document.getElementById( id );
	this.ctx = this.elem.getContext( "2d" );
}

Canvas.prototype.clear = function () {
	this.elem.width = this.elem.width;
}

Canvas.prototype.drawImage = function ( img, x, y ) {
	this.ctx.drawImage( img, x, y );
}



function Menu ( obj ) {
	this.name = obj.name;
	this.background = new Image();
	this.background.src = obj.background;
	this.backgroundOffsetX = ( obj.backgroundOffsetX ) ? obj.backgroundOffsetX : 0;
	this.backgroundOffsetY = ( obj.backgroundOffsetY ) ? obj.backgroundOffsetY : 0;
	this.links = obj.links;
	console.log( this.links );
}

Menu.prototype.click = function ( x, y ) {
	for ( var link in this.links ) {
		if ( this.links[link].boundingBox.isPointInBox( x, y ) ) {
			this.links[link].click();
		}
	}
}

Menu.prototype.update = function ( time ) {}

Menu.prototype.render = function ( canvas ) {
	canvas.drawImage( this.background, this.backgroundOffsetX, this.backgroundOffsetY );
}

Menu.prototype.load = function () {
	console.log( "Loading " + this.name );
}



function MenuLink ( bb, action ) {
	this.boundingBox = bb;
	this.action = action;
}

MenuLink.prototype.click = function () {
	document.dispatchEvent( new CustomEvent( "primitiveManStartGame", {
		detail: {
			gameType: this.action
		}
	} ) );
}

var mainMenu = new Menu( {
	name: "Main Menu",
	background: "main-menu-background.png",
	links: {
		normalGame: new MenuLink( new BoundingBox( 469, 360, 812, 431 ), "normalGame" ),
		mode2: new MenuLink( new BoundingBox( 469, 458, 812, 529 ), "mode2" ),
		mode3: new MenuLink( new BoundingBox( 469, 553, 812, 624 ), "mode3" )
	},
} );

var gameUI = new Menu( {
	name: "Game UI",
	background: "game-ui.png",
	backgroundOffsetY: 570,
	links: {

	}
} );



function Game ( obj ) {
	this.gameType = obj.gameType;
	this.level = level1;
	this.holeBuffer = document.createElement( "canvas" );
	this.holeBuffer.width = this.level.width;
	this.holeBuffer.height = this.level.height;
	this.holeBufferCtx = this.holeBuffer.getContext( "2d" );

	this.men = [];
	var that = this;

	document.addEventListener( "addMan", function ( e ) {
		if ( that.men.length - 1 < that.level.numberOfMen ) {
			that.men.push( new Man( {
				x: that.level.spawnPoint.x,
				y: that.level.spawnPoint.y
			} ) );
		}
	} );

	document.addEventListener( "clearMask", function ( e ) {
		that.level.clearPattern( e.detail.x, e.detail.y, e.detail.clearPattern );
		that.holeBufferCtx.fillStyle = "black";
		// I'm trying to figure out why my clearning pattern will not clear the level mask
		// I'm also trying to figure out why my hole buffer is not displaying. :(
		// I need to add an additional image to the hole buffer to help make sure it is working
		// I need to output the mask so I can evaluate it better
		for ( point in e.detail.clearPattern ) {
			that.holeBufferCtx.fillRect(
				20 * ( ~~( e.detail.x / 20 ) + e.detail.clearPattern[point].x ),
				20 * ( ~~( e.detail.y / 20 ) + e.detail.clearPattern[point].y ), 20, 20 );
		}
	} );
}

Game.prototype.click = function ( x, y ) {
	for ( man in this.men ) {
		if ( this.men[man].boundingBox.isPointInBoxWithOffset( x, y, this.men[man].x, this.men[man].y ) ) {
			this.men[man].active = true;
			this.men[man].type = "digger";
			this.men[man].x = ~~( this.men[man].x / 20 ) * 20;
		}
	}
}

Game.prototype.load = function () {}
Game.prototype.loadLevel = function () {}
Game.prototype.start = function () {}
Game.prototype.pause = function () {}

Game.prototype.render = function ( canvas ) {
	this.level.render( canvas );
	canvas.drawImage( this.holeBuffer, 0, 0 );
	for ( man in this.men ) {
		this.men[man].render( canvas );
	}
	gameUI.render( canvas );
}

Game.prototype.update = function ( time ) {
	this.level.update( time );
	for ( man in this.men ) {
		this.men[man].update( time, this.level );
	}
	// gameUI.update( time );
}



function InputHandler ( pm ) {
	pm.canvas.elem.addEventListener( "click", function ( e ) {
		var click = {
			x: e.offsetX,
			y: e.offsetY
		}
		document.dispatchEvent( new CustomEvent( "canvasClick", {
			detail: {
				clickX: click.x,
				clickY: click.y
			}
		} ) );
	} );
	document.addEventListener( "canvasClick", function ( e ) {
		pm.stack[pm.stack.length - 1].click( e.detail.clickX, e.detail.clickY );
	} );
	document.addEventListener( "primitiveManStartGame", function ( e ) {
		console.log( e.detail );
		pm.stack.push( new Game( e.detail.gameType ) );
	} )
}



function AudioHandler () {

}



function Level ( obj ) {
	this.background = new Image();
	this.background.src = obj.background;

	this.background2 = new Image();
	this.background2.src = "level-background.png";

	this.width = 1280;
	this.height = 560;

	this.levelMask = new LevelMask( obj.levelMask );

	this.spawnPoint = obj.spawnPoint;

	this.time = 5 * 60 * 1000;
	this.numberOfMen = 10;
	this.releaseRate = 5;
	this.releaseTimer = this.releaseRate;
}

Level.prototype.clearPattern = function ( x, y, clearPattern ) {
	x = ~~( x / 20 );
	y = ~~( y / 20 );
	for ( var i = 0; i < clearPattern.length; i++ ) {
		this.clearPoint( x + clearPattern[i].x, y + clearPattern[i].y );
	}
}

Level.prototype.clearPoint = function ( x, y ) {
	this.levelMask.mask[y * this.levelMask.width + x] = 0;
}

Level.prototype.getCollision = function ( x, y ) {
	x = ~~( x / 20 );
	y = ~~( y / 20 );
	return this.levelMask.getPoint( x, y );
}

Level.prototype.update = function ( time ) {
	this.releaseTimer += time.deltaTime;
	if ( this.releaseTimer > this.releaseRate ) {
		document.dispatchEvent( new CustomEvent( "addMan" ) );
		this.releaseTimer = 0;
	}
}

Level.prototype.render = function ( canvas ) {
	canvas.drawImage( this.background, 0, 0 );
}

Level.prototype.load = function () {}



function LevelMask ( obj ) {
	this.height = obj.height;
	this.width = obj.width;
	this.cellSize = 20;
	this.mask = obj.mask;
}

LevelMask.prototype.getPoint = function ( x, y ) {
	return this.mask[y * this.width + x];
}



var level1 = new Level( {
	background: "level1-background.png",
	spawnPoint: { x: 80, y: 220 },
	levelMask: {
		mask: [
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,
			1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
		],
		width: 64,
		height: 28
	}
} );



function Man ( obj ) {
	this.spritesheet = new Image();
	this.spritesheet.src = "man.png";

	this.x = ( obj.x ) ? obj.x : 0;
	this.y = ( obj.y ) ? obj.y : 0;
	this.width = 20;
	this.height = 40;

	this.speedX = 80;
	this.speedY = 200;
	this.direction = 1;
	this.lastDirection = this.direction;
	this.freeFallDist = 0;

	this.boundingBox = new BoundingBox( 0, 0, this.width, this.height );

	this.type = "normal";
	this.active = false;
	this.dead = false;
	this.falling = false;

	this.digger = {
		timer: 1,
		rate: 1,
		clearPattern: [	{ x: 0, y: 2 },	{ x: 1, y: 2 } ]
	}
}

Man.prototype.action = function ( time ) {
	switch ( this.type ) {
		case "dead":
			this.dead = true;
			break;
		case "digger":
			this.direction = 0;
			this.digger.timer += time.deltaTime;
			if ( this.digger.timer > this.digger.rate ) {
				document.dispatchEvent( new CustomEvent( "clearMask", {
					detail: {
						x: this.x,
						y: this.y,
						clearPattern: this.digger.clearPattern
					}
				} ) );
				this.digger.timer = 0;
			}
			break;
		case "normal":
		default:
			return;
	}
}

Man.prototype.update = function ( time, level ) {
	var currX = this.x;
	var currY = this.y;
	if ( !this.falling ) {
		if ( this.direction != 0 ) {
			this.lastDirection = this.direction;
		}
	}

	// Move to next horizontal position
	this.x += time.deltaTime * this.speedX * this.direction;

	// check for vertical collisions
	if ( !this.isCollidingY( level ) ) {
		this.y += time.deltaTime * this.speedY;
		this.falling = true;

		if ( this.falling ) {
			this.direction = 0;
			this.freeFallDist += this.y - currY;

			if ( this.freeFallDist > 5 * level.levelMask.cellSize ) {
				this.type = "normal";
				this.falling = false;
				this.active = false;
			}

			if ( this.freeFallDist > 20 * level.levelMask.cellSize ) {
				this.type = "dead";
				this.active = false;
			}
		}

		if ( this.y > level.height ) {
			this.type = "dead";
			this.active = false;
		}

	} else {
		this.falling = false;
		this.direction = this.lastDirection;
		this.y = ~~( ( this.y + this.boundingBox.bottom + 1 ) / 20 ) * 20 - this.boundingBox.bottom;
	}

	// Check for horizontal collisions
	if ( this.isCollidingX( level ) ) {
		this.x = currX;
		this.direction *= -1;
	}

	if ( this.isOffLevelX( level ) ) { 
		this.direction *= -1;
	}

	// Perform action if active
	if ( this.active ) {
		this.action( time );
	}
}

Man.prototype.render = function ( canvas ) {
	if ( !this.dead ) {
		canvas.drawImage( this.spritesheet, ~~this.x, ~~this.y );
	}
}

Man.prototype.isOffLevelX = function ( level ) {
	return ( this.x > level.width - this.boundingBox.right || this.x < 0 );
}

Man.prototype.isCollidingX = function ( level ) {
	var x = ( this.direction == 1 ) ? this.x + this.boundingBox.right : this.x + this.boundingBox.left;
	return ( level.getCollision( x, this.y ) == 1 );
}

Man.prototype.isCollidingY = function ( level ) {
	return ( level.getCollision( this.x, this.y + this.boundingBox.bottom + 1 ) == 1 );
}



function BoundingBox ( left, top, right, bottom ) {
	this.top = top;
	this.left = left;
	this.bottom = bottom;
	this.right = right;
}

BoundingBox.prototype.isPointInBox = function ( x, y ) {
	return ( x >= this.left && x < this.right && y >= this.top && y < this.bottom );
}

BoundingBox.prototype.isPointInBoxWithOffset = function ( x, y, offX, offY ) {
	return ( x - offX >= this.left && x - offX < this.right && y - offY >= this.top && y - offY < this.bottom );
}

BoundingBox.prototype.isIntersecting = function ( top, right, bottom, left ) {}



document.addEventListener( "DOMContentLoaded", function( e ) {
    var pm = new PrimitiveMan();
} );
