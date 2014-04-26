(function() {
  'use strict';

  var SHOT_DELAY = 500, BULLET_SPEED = 500;

  function Game() {
    this.player = null;
    this.tiledim = 16;
    this.lastBulletShotAt = null;
  }

  Game.prototype = {

    create: function () {
      var x = this.game.width / 2
        , y = this.game.height / 2;

      var game = this.game;
      this.width = game.width/this.tiledim;
      this.depth = game.height/this.tiledim;

      this.walls = game.add.group();
      this.submarines = game.add.group();
      this.torpedoes = game.add.group();

      this.locateMap();
      this.deploySubmarines();
      this.loadWeapons();
      this.assignControls();
    },

    detectWall: function(x, y, empty) {
      // Don't draw empty tile or tiles at the edges to ensure a closed map.
      if (empty && x !== 0 && y !== 0 && x !== this.width -1 && y !== this.depth-1) return;

      var wall = this.walls.create(x * this.tiledim, y * this.tiledim, "sonar", 1);
      this.game.physics.enable(wall, Phaser.Physics.ARCADE);
      wall.body.immovable = true;
    },

    buildConstructions: function() {
      /* start at center */
      var center = new XY(Math.round(this._size.x/2), Math.round(this._size.y/2));
      var dirs = ROT.DIRS[8];
      var radius = 0;

      while (center in cells) { /* find a starting free place */
        radius++;
        dirs.forEach(function(dir) {
          var c2 = new XY(center.x + radius * dir[0], center.y + radius * dir[1]);
          if (!(c2 in cells)) { center = c2; }
        });
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
      }
      while (queue.length) { process();  }
    },

    locateMap: function() {
      /* custom born/survive rules */
      var map = new ROT.Map.Cellular(this.width, this.depth, {
          born: [4, 5, 6, 7, 8],
          survive: [3, 4, 5, 6, 7, 8]
      });

      map.randomize(0.45);

      for (var i=0; i<2; i++) { map.create(); }

      map.setOptions({
        born: [5, 6, 7, 8],
        survive: [4, 5, 6, 7, 8]
      });

      for (var i=0; i<2; i++) { map.create(); }

      map.create(this.detectWall.bind(this));
      this.map = map;
    },

    deploySubmarines: function() {
      this.player = this.submarines.create(50, 50, 'sonar', 0);
      var enemy = this.submarines.create(100, 100, 'sonar', 0);
      this.game.physics.enable(this.submarines, Phaser.Physics.ARCADE);
    },

    loadWeapons: function() {
      var game = this.game;
      for(var i = 0; i < 20; i++) {
        // Create each bullet and add it to the group.
        var torpedo = this.torpedoes.create(0, 0, 'sonar', 2);
        // Set its pivot point to the center
        torpedo.anchor.setTo(0, 0);
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
      this.actionKey = keyboard.addKey(Phaser.Keyboard.SPACEBAR)
    },

    update: function () {
      var game = this.game, 
          torpedoes = this.torpedoes,
          walls = this.walls,
          submarines = this.submarines,
          player = this.player;
      // var x, y, cx, cy, dx, dy, angle, scale;

      // x = this.input.position.x;
      // y = this.input.position.y;
      // cx = this.world.centerX;
      // cy = this.world.centerY;

      // angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
      // this.player.angle = angle;

      // dx = x - cx;
      // dy = y - cy;
      // scale = Math.sqrt(dx * dx + dy * dy) / 100;

      // this.player.scale.x = scale * 0.6;
      // this.player.scale.y = scale * 0.6;
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
      if (lastBulletShotAt === undefined) lastBulletShotAt = 0;
      if (game.time.now - lastBulletShotAt < SHOT_DELAY) return;
      lastBulletShotAt = game.time.now;

      // Get a dead bullet from the pool
      var bullet = this.torpedoes.getFirstDead();

      // If there aren't any bullets available then don't shoot
      if (bullet === null || bullet === undefined) return;

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
