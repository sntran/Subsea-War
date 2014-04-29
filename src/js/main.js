window.onload = function () {
  'use strict';

  var game
    , ns = window['subsea-war'];

  var TileDimension = 16;
  var Width = 50;
  var Depth = 20;

  game = new Phaser.Game(TileDimension * Width, TileDimension*Depth, Phaser.AUTO, 'subsea-war-game');
  game.state.add('boot', ns.Boot);
  game.state.add('preloader', ns.Preloader);
  game.state.add('menu', ns.Menu);
  game.state.add('game', ns.Game);
  game.state.add('gameover', ns.GameOver);

  game.state.start('boot');
};
