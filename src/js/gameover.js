(function() {
  'use strict';

  function GameOver() {
    this.titleTxt = null;
    this.startTxt = null;
  }

  GameOver.prototype = {

    init: function(won) {
      this.won = won;
    },

    create: function () {
      var x = this.game.width / 2
        , y = this.game.height / 2;


      this.titleTxt = this.add.bitmapText(x, y, 'minecraftia', this.won? 'Congrats! You own the ocean!' : 'Sorry you lost!' );
      this.titleTxt.align = 'center';
      this.titleTxt.x = this.game.width / 2 - this.titleTxt.textWidth / 2;

      y = y + this.titleTxt.height + 5;
      this.startTxt = this.add.bitmapText(x, y, 'minecraftia', 'AGAIN?');
      this.startTxt.align = 'center';
      this.startTxt.x = this.game.width / 2 - this.startTxt.textWidth / 2;

      this.input.onDown.add(this.onDown, this);
    },

    update: function () {

    },

    onDown: function () {
      this.game.state.start('game');
    }
  };

  window['subsea-war'] = window['subsea-war'] || {};
  window['subsea-war'].GameOver = GameOver;

}());
