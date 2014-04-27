(function() {
  'use strict';

  var SHOT_DELAY = 200, BULLET_SPEED = 200;

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

      this.walls = game.add.group();
      this.water = [];
      this.submarines = game.add.group();
      this.torpedoes = game.add.group();

      this.locateMap();
      this.deploySubmarines();
      this.loadWeapons();
      this.assignControls();
    },

    detectWall: function(x, y, empty) {
      // Don't draw empty tile or tiles at the edges to ensure a closed map.
      if (empty && x !== 0 && y !== 0 && x !== this.width -1 && y !== this.depth-1) {
        this.water.push({x: x*this.tiledim, y: y*this.tiledim});
        return;
      }

      var wall = this.walls.create(x * this.tiledim, y * this.tiledim, 'sonar', 1);
      wall.anchor.setTo(0.5, 0.5);
      this.game.physics.enable(wall, Phaser.Physics.ARCADE);
      wall.body.immovable = true;
    },

    buildConstructions: function() {
      /* start at center */
      var centerX = Math.round(this.width/2), 
          centerY = Math.round(this.depth/2);
      var dirs = ROT.DIRS[8];
      var radius = 0, cells = this.walls;

      function adjustCenter(dir) {
        var c2 = new XY(center.x + radius * dir[0], center.y + radius * dir[1]);
        if (!(c2 in cells)) { center = c2; }
      }

      while (center in cells) { /* find a starting free place */
        radius++;
        dirs.forEach(adjustCenter);
      }

      /* flood fill free cells */
      free[center] = center;
      var queue = [center];
      var process = function() {
        var xy = queue.shift();

        dirs.forEach(function(dir) {
          var xy2 = new XY(xy.x + dir[0], xy.y + dir[1]);
          if (xy2 in cells || xy2 in free) { return; }
          free[xy2] = xy2;
          queue.push(xy2);
        });
      };
      while (queue.length) { process();  }
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

      var done = {};

      this.walls.forEach(function (cell, idx) {
        var cellX = cell.x/tiledim, cellY = cell.y/tiledim;

        if (cellX === 0 || cellY === 0 || cellX === width -1 || cellY === depth-1) {return ;}
        var water = [];
        dirs.forEach(function (dir) {
          var dirX = dir[0], dirY = dir[1];
          //We only want to check the corners.
          // if (Math.abs(dirX) !== Math.abs(dirY)) {return;}
          var x = cellX + dirX, y = cellY + dirY;
          if (x < 0 || x >= width || y < 0 || y >= depth) { return; }
          if (internalMap[x][y] === 0) {return; }
          // At this point, we get the water cell at this corner.
          water.push(dir);
        });

        var length = water.length;
        // Only care for corner walls.
        if (length < 3 || length > 5) {return;}

        if (length === 3 || length === 4) {
          // Corner near the edge walls.
          // setTimeout(function() {
          //   cell.scale.setTo(1.5, 1.5);
          //   cell.angle = 45;
          // }, 2000);
          // cell.scale.setTo(1.5, 1.5);
          // cell.angle = 45;
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
          //   // cell.angle = 45;
          //   cell.x -= tiledim/2;
          //   cell.y -= tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.angle = 45;
          cell.x -= tiledim/2;
          cell.y -= tiledim/2;
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
          //   // cell.angle = 45;
          //   cell.x -= tiledim/2;
          //   cell.y += tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.angle = 45;
          cell.x -= tiledim/2;
          cell.y += tiledim/2;
          return;
        }

        if (arrayEquals(water, [[0,1], [-1,1], [-1,0]]) 
          || arrayEquals(water, [[1,1], [0,1], [-1,1], [-1,0]])
          || arrayEquals(water, [[0,1], [-1,1], [-1,0], [-1,-1]])) {
          //|//
          //|//_
          // setTimeout(function() {
          //   // cell.scale.setTo(1.5, 1.5);
          //   // cell.angle = 45;
          //   cell.x += tiledim/2;
          //   cell.y -= tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.angle = 45;
          cell.x += tiledim/2;
          cell.y -= tiledim/2;
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
          //   // cell.angle = 45;
          //   cell.x += tiledim/2;
          //   cell.y += tiledim/2;
          // }, 2000);
          cell.scale.setTo(1.5, 1.5);
          cell.angle = 45;
          cell.x += tiledim/2;
          cell.y += tiledim/2;
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


        console.log(water)
      });
    },

    deploySubmarines: function() {
      var topLeft = this.water.shift();
      var bottomRight = this.water.pop();
      this.player = this.submarines.create(topLeft.x, topLeft.y, 'sonar', 0);
      // @TODO: Find a path between the submarines. If not, move it somewhere else.
      this.enemy = this.submarines.create(bottomRight.x, bottomRight.y, 'sonar', 0);
      this.player.anchor.setTo(0.5, 0.5);
      this.enemy.anchor.setTo(0.5, 0.5);
      // Flip the enemy vertically.
      this.enemy.scale.x *= -1;
      this.game.physics.enable(this.submarines, Phaser.Physics.ARCADE);
    },

    loadWeapons: function() {
      var game = this.game;
      for(var i = 0; i < 20; i++) {
        // Create each bullet and add it to the group.
        var torpedo = this.torpedoes.create(0, 0, 'sonar', 2);
        // Set its pivot point to the center
        torpedo.anchor.setTo(0.5, 0.5);
        // Enable physics on the torpedo
        game.physics.enable(torpedo, Phaser.Physics.ARCADE);
        // Set its initial state to "dead".
        torpedo.kill();
      }
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

      game.physics.arcade.collide(torpedoes, walls, function(bullet, wall) {
        bullet.kill();
      });

      game.physics.arcade.collide(submarines, torpedoes, function(submarine, bullet) {
        // @TODO: Substract HP of the submarine from the bullet's damage.
        bullet.kill();
      });

      game.physics.arcade.collide(submarines, walls);

      if (this.upKey.isDown) {
        player.y--;
      } else if (this.downKey.isDown) {
        player.y++;
      }

      if (this.leftKey.isDown) {
        player.x = player.x - 2;
      } else if (this.rightKey.isDown) {
        player.x = player.x + 2;
      }

      if (this.actionKey.isDown) {
        this.shootBullet();
      }
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

      // If there aren't any bullets available then don't shoot
      if (bullet === null || bullet === undefined) {return;}

      // Revive the bullet
      // This makes the bullet "alive"
      bullet.revive();

      // Bullets should kill themselves when they leave the world.
      // Phaser takes care of this for me by setting this flag
      // but you can do it yourself by killing the bullet if
      // its x,y coordinates are outside of the world.
      bullet.checkWorldBounds = true;
      bullet.outOfBoundsKill = true;

      // Set the bullet position to the gun position.
      bullet.reset(this.player.x, this.player.y);

      // Shoot it
      bullet.body.velocity.x = BULLET_SPEED;
      bullet.body.velocity.y = 0;
    },

    onInputDown: function () {
      this.game.state.start('menu');
    },

    render: function() {
      // walls.forEach(function (wall) {
      //   //game.debug.geom(wall,'#6dd0f7');
      //   game.debug.spriteBounds(wall);
      //   // game.debug.spriteCorners(wall, true, true);
      // });
      // game.debug.spriteBounds(player);
      // game.debug.spriteBounds(player);
      // game.debug.spriteBounds(torpedoes);
    }

  };

  window['subsea-war'] = window['subsea-war'] || {};
  window['subsea-war'].Game = Game;

}());
