(function () {
  'use strict';

  function Submarine(game, x, y, hp, weapons) {
    Phaser.Sprite.call(this, game, x, y, 'sonar', 0);
    // this.anchor.setTo(0.5, 0.5);
    game.physics.enable(this, Phaser.Physics.P2JS);

    var keyboard = game.input.keyboard;
    this.upKey = keyboard.addKey(Phaser.Keyboard.W);
    this.downKey = keyboard.addKey(Phaser.Keyboard.S);
    this.leftKey = keyboard.addKey(Phaser.Keyboard.A);
    this.rightKey = keyboard.addKey(Phaser.Keyboard.D);
    this.actionKey = keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    this.BULLET_SPEED = 200;
    this.body.fixedRotation = true;
    this.health = hp || 10;
  }

  Submarine.prototype = Object.create(Phaser.Sprite.prototype);
  Submarine.prototype.constructor = Submarine;

  Submarine.prototype.illuminate = function (duration) {
    duration = 500; // We don't take the specified duration.
    var currentAlpha = this.alpha;
    this.alpha = 1;
    this.game.add.tween(this).to( { alpha: currentAlpha }, duration, Phaser.Easing.Linear.None, true, 0);
  };

  Submarine.prototype.update = function() {
  };

  Submarine.prototype.shootBullet = function(bullet) {
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
    bullet.reset(this.x, this.y);

    // Shoot it
    bullet.body.velocity.x = this.BULLET_SPEED*this.scale.x;
    bullet.body.velocity.y = 0;
  };


  /* Player submarine */

  function PlayerSubmarine(game, x, y, hp) {
    Submarine.call(this, game, x, y, 10);
  }

  PlayerSubmarine.prototype = Object.create(Submarine.prototype);
  PlayerSubmarine.prototype.constructor = PlayerSubmarine;

  PlayerSubmarine.prototype.update = function() {
    this.body.setZeroVelocity();

    if (this.upKey.isDown) {
      this.body.moveUp(32);
    } else if (this.downKey.isDown) {
      this.body.moveDown(32);
    }

    if (this.leftKey.isDown) {
      this.body.moveLeft(64);
      if (this.scale.x > 0) 
        this.scale.x *= -1;
    } else if (this.rightKey.isDown) {
      this.body.moveRight(64);
      if (this.scale.x < 0) 
        this.scale.x *= -1;
    }

    if (this.actionKey.isDown) {
      this.shootBullet();
    }
  }

  window['subsea-war'] = window['subsea-war'] || {};
  window['subsea-war'].Submarine = Submarine;
  window['subsea-war'].Player = PlayerSubmarine;
  window['subsea-war'].Enemy = Submarine;

}());

