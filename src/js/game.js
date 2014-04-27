(function() {
  'use strict';

  var NS = window['subsea-war'];

  var SHOT_DELAY = 200, EMPTY = 1, WALL = 0;

  var Lamp = window.illuminated.Lamp
  , RectangleObject = window.illuminated.RectangleObject
  , Vec2 = window.illuminated.Vec2
  , Lighting = window.illuminated.Lighting
  , DarkMask = window.illuminated.DarkMask;

  if (!Array.prototype.every)
  {
    Array.prototype.every = function(fun /*, thisArg */)
    {
      'use strict';

      if (this === void 0 || this === null)
        throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== 'function')
          throw new TypeError();

      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (var i = 0; i < len; i++)
      {
        if (i in t && !fun.call(thisArg, t[i], i, t))
          return false;
      }

      return true;
    };
  }

  function arrayEquals(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every(function (elem, idx) {
      var elem2 = arr2[idx];
      if (elem instanceof Array && elem2 instanceof Array) {
        return arrayEquals(elem, elem2);
      }
      if (elem != elem2) return false;
      return true;
    });
  }

  function Game() {
    this.player = null;
    this.tiledim = 16;
    this.lastBulletShotAt = 0;
  }

  Game.prototype = {

    create: function () {
      var game = this.game;
      this.width = game.width/this.tiledim;
      this.depth = game.height/this.tiledim;

      game.physics.startSystem(Phaser.Physics.ARCADE);
      //  Enable p2 physics
      game.physics.startSystem(Phaser.Physics.P2JS);
      //  Turn on impact events for the world, without this we get no collision callbacks
      game.physics.p2.setImpactEvents(true);
      //  Make things a bit more bouncey
      game.physics.p2.restitution = 0.8;

      //  Create our collision groups.
      this.submarinesCollisionGroup = game.physics.p2.createCollisionGroup();
      this.wallsCollisionGroup = game.physics.p2.createCollisionGroup();
      this.bulletsCollisionGroup = game.physics.p2.createCollisionGroup();
      this.edgeWallsCollisionGroup = game.physics.p2.createCollisionGroup();

      this.lightingBitmap = game.add.bitmapData(game.width, game.height);
      this.trailTexture = game.add.renderTexture(game.width, game.height, 'pingtrail');

      game.add.sprite(0, 0, this.lightingBitmap);
      game.add.sprite(0, 0, this.trailTexture);

      this.walls = game.add.group();
      this.walls.enableBody = true;
      this.walls.physicsBodyType = Phaser.Physics.P2JS;

      this.water = [];

      this.submarines = game.add.group();
      this.submarines.enableBody = true;
      this.submarines.physicsBodyType = Phaser.Physics.P2JS;

      this.torpedoes = game.add.group();
      this.torpedoes.enableBody = true;
      this.torpedoes.physicsBodyType = Phaser.Physics.P2JS;

      this.locateMap();
      this.deploySubmarines();
      this.enterSilentMode();
      this.loadWeapons();
    },

    detectWall: function(x, y, empty) {
      // Don't draw empty tile or tiles at the edges to ensure a closed map.
      if (empty && x !== 0 && y !== 0 && x !== this.width -1 && y !== this.depth-1) {
        this.water.push({x: x, y: y});
        return;
      }

      var wall = this.walls.create(x * this.tiledim, y * this.tiledim, 'sonar', 1);
      wall.anchor.setTo(0.5, 0.5);
      this.game.physics.enable(wall, Phaser.Physics.P2JS);
      wall.body.static = true;
      wall.body.setCollisionGroup(this.wallsCollisionGroup);
      wall.body.collides([this.submarinesCollisionGroup, this.bulletsCollisionGroup]);
    },

    locateMap: function() {
      /* custom born/survive rules */
      var map = new ROT.Map.Cellular(this.width, this.depth, {
          born: [4, 5, 6, 7, 8],
          survive: [3, 4, 5, 6, 7, 8]
      }), i;

      map.randomize(0.45);

      for (i=0; i<2; i++) { map.create(); }

      map.setOptions({
        born: [5, 6, 7, 8],
        survive: [4, 5, 6, 7, 8]
      });

      for (i=0; i<2; i++) { map.create(); }

      map.create(this.detectWall.bind(this));
      this.map = map;

      this.flatLand();
    },

    flatLand: function() {
      var tiledim = this.tiledim, dirs = ROT.DIRS[8], self = this;
      var internalMap = this.map._map, width = this.width, depth = this.depth;

      // var edgeWalls = this.edgeWalls = this.game.add.group();

      this.walls.forEach(function (cell, idx) {
        var cellX = cell.x/tiledim, cellY = cell.y/tiledim;

        if (cellX === 0 || cellY === 0 || cellX === width -1 || cellY === depth-1) {return ;}
        var water = [];
        dirs.forEach(function (dir) {
          var dirX = dir[0], dirY = dir[1];
          var x = cellX + dirX, y = cellY + dirY;
          if (x < 0 || x >= width || y < 0 || y >= depth) { return; }
          if (internalMap[x] && internalMap[x][y] === WALL) {return; }
          // At this point, we get the water cell at this corner.
          water.push(dir);
        });

        var length = water.length;
        // We keep track of the walls near the water.
        if (length !== 0) {
          cell.body.setCollisionGroup(self.edgeWallsCollisionGroup); 
        }

        // Only care for corner walls.
        if (length < 3 || length > 5) {return;}

        if (length === 3 || length === 4) {
          // Corner near the edge walls.
          // setTimeout(function() {
          //   cell.scale.setTo(1.5, 1.5);
          //   cell.body.angle = 45;
          // }, 2000);
          // cell.scale.setTo(1.5, 1.5);
          // cell.body.angle = 45;
        }

        if (arrayEquals(water, [[1,0], [1,1], [0,1]]) 
          || arrayEquals(water, [[1,-1], [1,0], [1,1], [0,1]])
          || arrayEquals(water, [[1,0], [1,1], [0,1], [-1,1]])
          || arrayEquals(water, [[1,0], [1,1], [0,1], [-1,-1]])
        ) {
          /////|
          ///--
          // setTimeout(function() {
          //   // cell.scale.setTo(1.5, 1.5);
          //   // cell.body.angle = 45;
          //   cell.x -= tiledim/2;
          //   cell.y -= tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.body.angle = 45;
          cell.body.reset(cell.x - tiledim/2, cell.y - tiledim/2);
          return;
        }

        if (arrayEquals(water, [[0,-1], [1,-1], [1,0]]) 
          || arrayEquals(water, [[0,-1], [1,-1], [1,0], [-1,-1]])
          || arrayEquals(water, [[0,-1], [1,-1], [1,0], [1,1]])
        ) {
          //__
          ////|
          // setTimeout(function() {
          //   // cell.scale.setTo(1.5, 1.5);
          //   // cell.body.angle = 45;
          //   cell.x -= tiledim/2;
          //   cell.y += tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.body.angle = 45;
          cell.body.reset(cell.x - tiledim/2, cell.y + tiledim/2);
          return;
        }

        if (arrayEquals(water, [[0,1], [-1,1], [-1,0]]) 
          || arrayEquals(water, [[1,1], [0,1], [-1,1], [-1,0]])
          || arrayEquals(water, [[0,1], [-1,1], [-1,0], [-1,-1]])) {
          //|//
          //|//_
          // setTimeout(function() {
          //   // cell.scale.setTo(1.5, 1.5);
          //   // cell.body.angle = 45;
          //   cell.x += tiledim/2;
          //   cell.y -= tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.body.angle = 45;
          cell.body.reset(cell.x + tiledim/2, cell.y - tiledim/2);
          return;
        }

        if (arrayEquals(water, [[0,-1], [-1,0], [-1,-1]])
          || arrayEquals(water, [[0,-1], [-1,1], [-1,0], [-1,-1]])
          || arrayEquals(water, [[0,-1], [1,-1], [-1,0], [-1,-1]])
        ) {
          // ___
          //|///
          // setTimeout(function() {
          //   // cell.scale.setTo(1.5, 1.5);
          //   // cell.body.angle = 45;
          //   cell.x += tiledim/2;
          //   cell.y += tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.body.angle = 45;
          cell.body.reset(cell.x + tiledim/2, cell.y + tiledim/2);
          return;
        }

        if (length === 5) {
          
          // cell.x -= tiledim/2;
          // cell.y -= tiledim/2;
        }

        if (arrayEquals(water, [[1,1], [0,1], [-1,1]])
          || arrayEquals(water, [[-1,1], [-1,0], [-1,-1]])
          || arrayEquals(water, [[1,-1], [1,0], [1,1]])
          || arrayEquals(water, [[0,-1], [1,-1], [-1,-1]])
        ) {
          // These are flat walls
          return;
        }

        if (arrayEquals(water, [[1,-1], [1,1], [-1,1]])) {
          // A center wall where there are walls on the sides, but not corners
          return;
        }
      });
    },

    deploySubmarines: function() {
      var possibleLocations = this.findLocations();
      while (!possibleLocations) {
        this.locateMap();
        this.deploySubmarines();
      }

      var topLeft = possibleLocations[0];
      var bottomRight = possibleLocations[1];
      var tiledim = this.tiledim;

      this.player = new NS.Player(this.game, topLeft.x*tiledim, topLeft.y*tiledim, 10);
      this.enemy = new NS.Enemy(this.game, bottomRight.x*tiledim, bottomRight.y*tiledim, 10);
      this.enemy.scale.x *= -1;
      this.enemy.visible = false;

      this.submarines.add(this.player);
      this.submarines.add(this.enemy);

      this.player.body.setCollisionGroup(this.submarinesCollisionGroup);
      this.enemy.body.setCollisionGroup(this.submarinesCollisionGroup);
      this.player.body.collides([this.wallsCollisionGroup, this.edgeWallsCollisionGroup, this.submarinesCollisionGroup]);
      this.enemy.body.collides([this.wallsCollisionGroup, this.edgeWallsCollisionGroup, this.submarinesCollisionGroup]);

      // this.game.camera.follow(this.player);
    },

    isPassable: function(x, y) {
      var internalMap = this.map._map, width = this.width, depth = this.depth;
      if (x < 0 || x >= width || y < 0 || y >= depth) { return false; }
      // In our map, 
      return internalMap[x][y] === EMPTY;
    },

    findLocations: function() {
      var internalMap = this.map._map, tiledim = this.tiledim;
      // It's not fun playing in small pond
      if (this.water.length < 30) return false;

      var topLeft = this.water.shift();
      var bottomRight = this.water.pop();
      var reachable = false, results = [];

      var astar = new ROT.Path.AStar(topLeft.x, topLeft.y, this.isPassable.bind(this));
      /* compute from topLeft to bottomRight */
      astar.compute(bottomRight.x, bottomRight.y, function (x, y) {
        if (reachable) {

          results.push(topLeft);
          results.push(bottomRight);
          return;
        }
        // If this callback is called, we have a path, set the flag to skip the rest of the callbacks.
        reachable = true;
      });

      if (reachable) return results;
      // They are separated, we just shift() and pop() again.
      return this.findLocations();
    },

    enterSilentMode: function() {
      var internalMap = this.map._map, self = this;
      var player = this.player, tiledim = this.tiledim;

      this.light = new Lamp({
        position: new Vec2(player.x, player.y),
        color: '519ab8',
        distance: 64, // Intensity
        // radius: 20,
        // samples: 50,
        diffuse: 0.5
      });

      var litObjects = [];
      this.walls.forEach(function (cell) {
        litObjects.push(new RectangleObject({ 
          topleft: new Vec2(cell.x, cell.y), 
          bottomright: new Vec2(cell.x+tiledim, cell.y+tiledim) 
        }));
      });

      this.lighting = new Lighting({
        light: this.light,
        objects: litObjects
      });

      this.darkmask = new DarkMask({ lights: [this.light] });
    },

    loadWeapons: function() {
      var game = this.game;
      for(var i = 0; i < 20; i++) {
        // Create each bullet and add it to the group.
        var torpedo = this.torpedoes.create(0, 0, 'sonar', 2);
        // Set its pivot point to the center
        torpedo.anchor.setTo(0.5, 0.5);
        // Enable physics on the torpedo
        game.physics.p2.enable(torpedo, false);
        // Set its initial state to "dead".
        torpedo.body.setCollisionGroup(this.bulletsCollisionGroup);
        torpedo.body.collides(this.edgeWallsCollisionGroup, function(bulletBody, wallBody) {
          bulletBody.sprite.kill();
        });
        torpedo.body.collides(this.submarinesCollisionGroup);
        torpedo.body.fixedRotation = true;
        torpedo.kill();
      }

      var sonar = this.sonar = game.add.sprite(0, 0, 'sonar', 4);
      game.physics.p2.enable(this.sonar, false);
      sonar.anchor.setTo(0.5, 0.5);
      sonar.body.allowRotation = false;
      sonar.body.fixedRotation = true;
      sonar.body.setCollisionGroup(this.bulletsCollisionGroup);
      sonar.lifespan = 3000;
      sonar.body.collides([this.wallsCollisionGroup]);
      sonar.body.collides(this.edgeWallsCollisionGroup, function(_, wallBody) {
        console.log("Hit edge wall");
      });
      sonar.kill();
    },

    assignControls: function() {
      var keyboard = this.game.input.keyboard;
      this.upKey = keyboard.addKey(Phaser.Keyboard.UP);
      this.downKey = keyboard.addKey(Phaser.Keyboard.DOWN);
      this.leftKey = keyboard.addKey(Phaser.Keyboard.LEFT);
      this.rightKey = keyboard.addKey(Phaser.Keyboard.RIGHT);
      this.actionKey = keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    update: function () {
      var game = this.game, 
          torpedoes = this.torpedoes,
          walls = this.walls,
          submarines = this.submarines,
          player = this.player;

      if (this.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
        this.shootBullet();
      }

      if (game.input.activePointer.isDown) {
        this.ping();
      }

      this.computePingTrail();
      this.computeLighting();
    },

    computeLighting: function() {
      var player = this.player, bitmap = this.lightingBitmap, canvas = bitmap.canvas, context = bitmap.context;
      // Update the light's position    
      this.light.position = new Vec2(player.x, player.y);
      var lighting = this.lighting;
      lighting.compute(canvas.width, canvas.height);
      this.darkmask.compute(canvas.width, canvas.height);

      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);
      lighting.render(context);
      bitmap.dirty = true;
    },

    computePingTrail: function() {
      var sonar = this.sonar;
      var bitmap = this.trailTexture;
      // var canvas = bitmap.canvas, context = bitmap.context;
      bitmap.renderXY(sonar, sonar.x, sonar.y, !sonar.alive);
    },

    shootBullet: function() {
      var lastBulletShotAt = this.lastBulletShotAt, game = this.game;
      // Enforce a short delay between shots by recording
      // the time that each bullet is shot and testing if
      // the amount of time since the last shot is more than
      // the required delay.
      if (lastBulletShotAt === undefined) {lastBulletShotAt = 0;}
      if (game.time.now - lastBulletShotAt < SHOT_DELAY) {return;}
      this.lastBulletShotAt = game.time.now;

      // Get a dead bullet from the pool
      var bullet = this.torpedoes.getFirstDead();
      this.player.shootBullet(bullet);
    },

    ping: function() {
      this.sonar.revive();
      // this.sonar.health = 5;
      this.sonar.lifespan = 3000;
      this.sonar.reset(this.player.x - 8, this.player.y - 8);
      this.game.physics.arcade.moveToPointer(this.sonar, 300);
    },

    render: function() {
      // this.game.debug.spriteBounds(this.walls);
    }

  };

  window['subsea-war'] = window['subsea-war'] || {};
  window['subsea-war'].Game = Game;

}());
