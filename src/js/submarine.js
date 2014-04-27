(function () {
  'use strict';

  function Submarine(game, x, y, hp, weapons) {
    Phaser.Sprite.call(this, game, x, y, 'sonar', 0);
    this.anchor.setTo(0.5, 0.5);
    game.physics.enable(this, Phaser.Physics.ARCADE);

    // Define motion constants
    this.ROTATION_SPEED = 180; // degrees/second
    this.ACCELERATION = 8; // pixels/second/second
    this.MAX_SPEED = 10; // pixels/second
    this.DRAG = 2; // pixels/second

    this.body.maxVelocity.setTo(this.MAX_SPEED, this.MAX_SPEED);
    // Add drag to the ship that slows it down when it is not accelerating
    this.body.drag.setTo(this.DRAG, this.DRAG); // x, y

    var keyboard = game.input.keyboard;
    this.upKey = keyboard.addKey(Phaser.Keyboard.UP);
    this.downKey = keyboard.addKey(Phaser.Keyboard.DOWN);
    this.leftKey = keyboard.addKey(Phaser.Keyboard.LEFT);
    this.rightKey = keyboard.addKey(Phaser.Keyboard.RIGHT);
    this.actionKey = keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    this.BULLET_SPEED = 200;
  }

  Submarine.prototype = Object.create(Phaser.Sprite.prototype);
  Submarine.prototype.constructor = Submarine;

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
    bullet.body.velocity.x = this.BULLET_SPEED;
    bullet.body.velocity.y = 0;
  };


  /* Player submarine */

  function PlayerSubmarine(game, x, y, hp) {
    Submarine.call(this, game, x, y, 10);
  }

  PlayerSubmarine.prototype = Object.create(Submarine.prototype);
  PlayerSubmarine.prototype.constructor = PlayerSubmarine;

  PlayerSubmarine.prototype.update = function() {
    // if (this.leftKey.isDown) {
    //     // If the LEFT key is down, rotate left
    //     this.body.angularVelocity = -this.ROTATION_SPEED;
    // } else if (this.rightKey.isDown) {
    //     // If the RIGHT key is down, rotate right
    //     this.body.angularVelocity = this.ROTATION_SPEED;
    // } else {
    //     // Stop rotating
    //     this.body.angularVelocity = 0;
    // }

    // if (this.upKey.isDown) {
    //     // If the UP key is down, thrust
    //     // Calculate acceleration vector based on this.angle and this.ACCELERATION
    //     this.body.acceleration.x = Math.cos(this.rotation) * this.ACCELERATION;
    //     this.body.acceleration.y = Math.sin(this.rotation) * this.ACCELERATION;
    // } else if (this.downKey.isDown){
    //     // Otherwise, stop thrusting
    //     this.body.acceleration.setTo(0, 0);
    // }

    if (this.upKey.isDown) {
      this.y--;
    } else if (this.downKey.isDown) {
      this.y++;
    }

    if (this.leftKey.isDown) {
      this.x = this.x - 2;
    } else if (this.rightKey.isDown) {
      this.x = this.x + 2;
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

