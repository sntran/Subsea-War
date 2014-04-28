(function () {
  'use strict';

  function Wall(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'sonar', 1);
    game.physics.enable(this, Phaser.Physics.P2JS);
    this.anchor.setTo(0.5, 0.5);
    this.body.static = true;

    var width = this.width, height = this.height;
    this.water = [];
    this.edges = game.add.group();
  }

  Wall.prototype = Object.create(Phaser.Sprite.prototype);
  Wall.prototype.constructor = Wall;

  Wall.prototype.illuminate = function(duration) {
    var x = this.x, y = this.y, width = this.width, height = this.height, game = this.game;
    var edges = this.edges;
    this.water.forEach(function (water) {
      var dirX = water[0], dirY = water[1];
      // Ignores direction that is not of an edge.
      if (Math.abs(dirX) === Math.abs(dirY)) {return; }
      var bitmap, edgeWidth, edgeHeight, edgeX, edgeY, index;

      if (dirX === -1 && dirY === 0) {
        // console.log("Left edge");
        edgeWidth = 2; edgeHeight = height; edgeX = x, edgeY = y;
        index = 3;
      }

      if (dirX === 1 && dirY === 0) {
        // console.log("Right edge");
        edgeWidth = 2; edgeHeight = height; edgeX = x+width-2, edgeY = y;
        index = 1;
      }

      if (dirX === 0 && dirY === -1) {
        // console.log("Top edge");
        edgeWidth = width; edgeHeight = 2; edgeX = x, edgeY = y;
        index = 0;
      }

      if (dirX === 0 && dirY === 1) {
        // console.log("Bottom edge");
        edgeWidth = width; edgeHeight = 2; edgeX = x, edgeY = y+height-2;
        index = 2;
      }

      var edge = edges.getAt(index);
      if (edge === -1) {
        bitmap = game.add.bitmapData(edgeWidth, edgeHeight);
        bitmap.ctx.beginPath();
        bitmap.ctx.rect(0, 0, edgeWidth, edgeHeight);
        bitmap.ctx.fillStyle = '#519ab8';
        bitmap.ctx.fill();

        edge = edges.create(edgeX, edgeY, bitmap);
        edge.z = 100;
      }
      edge.revive();
    });
    this.game.time.events.add(duration, this.stopLight, this);
  };

  Wall.prototype.stopLight = function() {
    this.edges.callAll("kill");
  };

  window['subsea-war'] = window['subsea-war'] || {};
  window['subsea-war'].Wall = Wall;

}());

