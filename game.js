var WIDTH = 40;
var HEIGHT = 24;
var LEVEL = 1;
var TREASURES = 0;
var MAX_BLOB_COUNT = 10;
var BLOB_SPEED = 40;

var getRandomInt = function(max) {
    return Math.ceil(Math.random() * Math.floor(max));
}

var sound = {
    treasure: document.getElementById('sound-treasure'),
    lose: document.getElementById('sound-decline'),
    step_1: document.getElementById('sound-stepdirt_1'),
    step_2: document.getElementById('sound-stepdirt_2'),
    step_3: document.getElementById('sound-stepdirt_3'),
    step_4: document.getElementById('sound-stepdirt_4'),
}

var tileSet = document.createElement("img");

tileSet.src = "fantasy-tileset.png";
var options = {
    layout: "tile",
    bg: "#36473d",
    tileWidth: 32,
    tileHeight: 32,
    tileSet: tileSet,
    tileMap: {
        "@": [128, 576],
        "P": [32, 672],
        ".": [64, 32],
        "*": [0, 128]
    },
    width: WIDTH,
    height: HEIGHT
}

var display = new ROT.Display(options);

var Game = {
    display: display,
    map: {},
    engine: null,
    player: null,
    blobbers: Array(LEVEL).fill(null),
    treasure: null,
    
    init: function() {
        document.body.appendChild(this.display.getContainer());
        this._generateMap();
        
        var scheduler = new ROT.Scheduler.Speed();
        scheduler.add(this.player, true);

        this.blobbers.forEach(function(blobber) {
            scheduler.add(blobber, true);
        });

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
    },

    restart: function() {
        LEVEL = 1;
        TREASURES = 0;

        document.getElementById('level-value').innerHTML = LEVEL.toString();
        document.getElementById('treasure-value').innerHTML = TREASURES.toString();

        Game.display.clear();
        Game.map = {}
        Game.engine = null
        Game.player = null
        Game.blobbers = Array(LEVEL).fill(null)
        Game.treasure = null

        Game.init();
    },

    nextLevel: function() {
        LEVEL++;
        TREASURES++;

        var blobCount = LEVEL <= MAX_BLOB_COUNT ? LEVEL : MAX_BLOB_COUNT;

        document.getElementById('level-value').innerHTML = LEVEL.toString();
        document.getElementById('treasure-value').innerHTML = TREASURES.toString();

        Game.display.clear();
        Game.map = {}
        Game.engine = null
        Game.player = null
        Game.blobbers = Array(blobCount).fill(null)
        Game.treasure = null

        Game.init();
    },
    
    _generateMap: function() {
        var digger = new ROT.Map.Digger(WIDTH - 4, HEIGHT - 4);
        var freeCells = [];
        
        var digCallback = function(x, y, value) {
            if (value) { return; }
            
            var key = x+","+y;
            this.map[key] = ".";
            freeCells.push(key);
        }
        digger.create(digCallback.bind(this));
        
        this._generateBoxes(freeCells);
        this._drawWholeMap();
        this.player = this._createBeing(Player, freeCells);
        for (var i = 0; i < this.blobbers.length; i++) {
            this.blobbers[i] = this._createBeing(Blobber, freeCells);
        }
        
    },

    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return new what(x, y);
    },
    
    _generateBoxes: function(freeCells) {
        for (var i=0;i<10;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this.map[key] = "*";
            if (!i) { this.treasure = key; } /* first box contains an treasure */
        }
    },
    
    _drawWholeMap: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            this.display.draw(x, y, this.map[key]);
        }
    }
};

var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
}
    
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
    
Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == 13 || code == 32) {
        this._checkBox();
        return;
    }

    var keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    /* one of numpad directions? */
    if (!(code in keyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) { return; }

    Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();

    var stepSound = 'step_' + getRandomInt(4);

    sound[stepSound].play();

    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

Player.prototype._draw = function() {
    Game.display.draw(this._x, this._y, "@", "#ff0");
}
    
Player.prototype._checkBox = function() {
    var key = this._x + "," + this._y;
    if (Game.map[key] != "*") {
        alert("There is no chest here!");
    } else if (key == Game.treasure) {
        sound['treasure'].play();
        alert("Duuuuude, You found the Treasure. You Win!");
        Game.engine.lock();
        window.removeEventListener("keydown", this);
        Game.nextLevel();
    } else {
        alert("This chest is empty.");
    }
}
    
var Blobber = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
}
    
Blobber.prototype.getSpeed = function() { return BLOB_SPEED; }
    
Blobber.prototype.act = function() {
    var x = Game.player.getX();
    var y = Game.player.getY();

    var passableCallback = function(x, y) {
        return (x+","+y in Game.map);
    }
    var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});

    var path = [];
    var pathCallback = function(x, y) {
        path.push([x, y]);
    }
    astar.compute(this._x, this._y, pathCallback);

    path.shift();
    if (path.length == 1 || path.length == 0) {
        sound['lose'].play();
        Game.engine.lock();
        alert("You've been blobberbed! Game Over");
        Game.restart();
    } else {
        x = path[0][0];
        y = path[0][1];
        Game.display.draw(this._x, this._y, Game.map[this._x+","+this._y]);
        this._x = x;
        this._y = y;
        this._draw();
    }
}
    
Blobber.prototype._draw = function() {
    Game.display.draw(this._x, this._y, "P", "red");
}    


tileSet.onload = function() {
    Game.init();
}
