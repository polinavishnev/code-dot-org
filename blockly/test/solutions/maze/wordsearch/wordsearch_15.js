var TestResults = require('../../../../src/constants.js').TestResults;

var blockUtils = require('../../../../src/block_utils');

module.exports = {
  app: "maze",
  skinId: 'letters',
  levelFile: 'wordsearchLevels',
  levelId: "k_15",
  tests: [
    {
      description: "Verify solution",
      expected: {
        result: true,
        testResult: TestResults.ALL_PASS
      },
      customValidator: function () {
        return Maze.wordSearch !== undefined;
      },
      xml: '<xml>' + blockUtils.blocksFromList([
        'maze_moveSouth',
        'maze_moveSouth',
        'maze_moveEast',
        'maze_moveSouth',
        'maze_moveEast'
      ]) + '</xml>'
    }
  ]
};
