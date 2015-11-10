var testUtils = require('../../util/testUtils');
var TestResults = require('@cdo/apps/constants').TestResults;
var _ = require('lodash');
var $ = require('jquery');
require('react/addons');
var ReactTestUtils = React.addons.TestUtils;

// i'd like this test to not run through level tests, which has a lot of hacks,
// but this is the easiest approach for now. hopefully at some point in the
// (nearish) future, we have a better approach and this code can be moved
// without too much difficulty

/**
 * Assert that a property row with the given label exists at the given index,
 * and that it has the given expected value.
 *
 * @param {number} index - Zero-based index for the property row to examine.
 * @param {string} label - Expected label for the property row.
 * @param {?} value - Expected value for the first element in the second column
 *        of the property row, retrieved with $.val() and compared with ==,
 *        so type coercion may occur.
 * @param {Chai.Assert} assert
 */
function assertPropertyRowValue(index, label, value, assert) {
  assertPropertyRowExists(index, label, assert);

  // second col has an input with val screen 2
  var propertyRow = $("#propertyRowContainer > div").eq(index);
  var msg = "property row " + index + " has label '" + label + "' and value '" + value + "'";
  assert.equal(propertyRow.children(1).children(0).val(), value, msg);
}

/**
 * Assert that a property row with the given label exists at the given index.
 *
 * @param {number} index - Zero-based index for the property row to examine.
 * @param {string} label - Expected label for the property row.
 * @param {Chai.Assert} assert
 */
function assertPropertyRowExists(index, label, assert) {
  var container = $("#propertyRowContainer")[0];
  assert(container, 'has design properties container');

  var propertyRow = $("#propertyRowContainer > div").eq(index);
  var msg = "property row " + index + " has label '" + label + "'";
  assert.equal(propertyRow.children(0).text(), label, msg);
}

// We don't load our style sheets in mochaTests, so we instead depend
// on checking classes.
// An element will be set to opacity 0.3 if it has the class
// design-mode-hidden and divApplab is hidden
var isFaded = function (selector) {
  var rootEl = $('#designModeViz');
  var element = rootEl.find(selector);
  return rootEl.is(':visible') && element.hasClass('design-mode-hidden');
};
var isHidden = function (selector) {
  var rootEl = $('#divApplab');
  var element = rootEl.find(selector);
  return rootEl.is(':visible') && element.hasClass('design-mode-hidden');
};

/**
 * Mouseover the bottom right of the element, than click and drag the resizer
 * by xAmount/yAmount to make the element bigger.
 */
function resizeElement(element, xAmount, yAmount) {
  var resizer = $(element).parent().find('.ui-icon-gripsmall-diagonal-se');

  var start = {
    x: resizer.offset().left + resizer.width(),
    y: resizer.offset().top + resizer.height()
  };
  var end = {
    x: start.x + xAmount,
    y: start.y + yAmount
  };

  // need to mouseover so that it sets up some internal state property
  var mouseover = testUtils.createMouseEvent('mouseover', start.x, start.y);
  var mousedown = testUtils.createMouseEvent('mousedown', start.x, start.y);
  var drag = testUtils.createMouseEvent('mousemove', end.x, end.y);
  var mouseup = testUtils.createMouseEvent('mouseup', end.x, end.y);

  resizer[0].dispatchEvent(mouseover);
  resizer[0].dispatchEvent(mousedown);
  resizer[0].dispatchEvent(drag);
  resizer[0].dispatchEvent(mouseup);
}

/**
 * Click and drag the element by xAmount/yAmount to move it.
 */
function dragElement(element, xAmount, yAmount) {
  var $element = $(element);
  var start = {
    x: $element.offset().left + 5,
    y: $element.offset().top + 5
  };
  var mid = {
    x: start.x + xAmount / 2,
    y: start.y + yAmount / 2
  };
  var end = {
    x: start.x + xAmount,
    y: start.y + yAmount
  };

  // need to mouseover so that it sets up some internal state property
  var mousedown = testUtils.createMouseEvent('mousedown', start.x, start.y);
  var drag = testUtils.createMouseEvent('mousemove', mid.x, mid.y);
  var mouseup = testUtils.createMouseEvent('mouseup', end.x, end.y);

  element.dispatchEvent(mousedown);
  element.dispatchEvent(drag);
  element.dispatchEvent(mouseup);
}

module.exports = {
  app: "applab",
  skinId: "applab",
  levelFile: "levels",
  levelId: "ec_simple",
  tests: [
    {
      description: "button image",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {
        $("#designModeButton").click();

        testUtils.dragToVisualization('BUTTON', 10, 20);

        assertPropertyRowValue(0, 'id', 'button1', assert);
        assertPropertyRowValue(4, 'x position (px)', 10, assert);

        // take advantage of the fact that we expose the filesystem via
        // localhost:8001
        var assetUrl = '//localhost:8001/apps/static/flappy_promo.png';
        var imageInput = $("#propertyRowContainer input").last()[0];

        ReactTestUtils.Simulate.change(imageInput, {
          target: { value: assetUrl }
        });

        var buttonElement = $("#design_button1")[0];

        // wait until image has loaded to do validation
        var img = new Image();
        img.src = assetUrl;
        img.onload = function () {
          // There's no guarantee that we hit this onload after the onload in
          // designMode.js, so the styles won't always be set immediately.
          // Instead, wait until the next tick

          // add a completion on timeout since this is a freeplay level
          setTimeout(function () {
            assert.equal(buttonElement.style.backgroundImage, 'url(http:' + assetUrl + ')');
            assert.equal(buttonElement.style.width, '200px');
            assert.equal(buttonElement.style.height, '113px');
            assert.equal(buttonElement.style.backgroundSize, '200px 113px');

            Applab.onPuzzleComplete();
          }, 1);
        };
        img.onerror = function (err) {
          assert(false, err.message);
        };
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },
    {
      description: "resizability",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {
        var shouldBeResizable = function () {
          var rootDiv, screen1, resizable, button;

          rootDiv = $('#designModeViz');
          assert.equal(rootDiv.is(':visible'), true, 'designModeViz is visible');
          assert.equal(rootDiv.children().length, 1);
          screen1 = rootDiv.children().first();
          assert.equal(screen1.attr('id'), 'design_screen1');
          assert.equal(screen1.children().length, 1);
          resizable = screen1.children().first();
          assert.equal(resizable.hasClass('ui-resizable'), true, 'is resizable');
          assert.equal(resizable.hasClass('ui-draggable'), true, 'is draggable');
          assert.equal(resizable.children().length, 4);
          button = resizable.children().first();
          assert.equal(button.prop('tagName'), 'BUTTON');
          assert.equal(resizable.children().eq(1).hasClass('ui-resizable-handle'),
            true, 'is resizable handle');
          assert.equal(resizable.children().eq(2).hasClass('ui-resizable-handle'),
            true, 'is resizable handle');
          assert.equal(resizable.children().eq(3).hasClass('ui-resizable-handle'),
            true, 'is resizable handle');
        };

        var shouldNotBeResizable = function () {
          var rootDiv, screen1, resizable, button;

          rootDiv = $('#divApplab');
          assert.equal(rootDiv.is(':visible'), true, 'divApplab is visible');
          assert.equal(rootDiv.children().length, 1);
          screen1 = rootDiv.children().first();
          assert.equal(screen1.attr('id'), 'screen1');
          assert.equal(screen1.children().length, 1);
          // button should now be a direct descendant
          button = screen1.children().first();
          assert.equal(button.prop('tagName'), 'BUTTON');
        };

        $("#designModeButton").click();
        testUtils.dragToVisualization('BUTTON', 10, 20);
        shouldBeResizable();

        $("#codeModeButton").click();
        assert.equal($("#design-properties").is(':visible'), false);
        shouldNotBeResizable();

        $("#designModeButton").click();
        shouldBeResizable();

        $("#runButton").click();
        shouldNotBeResizable();

        $("#resetButton").click();
        shouldBeResizable();

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },

    {
      description: "resizing button",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {
        $("#designModeButton").click();
        testUtils.dragToVisualization('BUTTON', 10, 20);
        assertPropertyRowValue(0, 'id', 'button1', assert);
        assertPropertyRowValue(2, 'width (px)', 80, assert);
        assertPropertyRowValue(3, 'height (px)', 30, assert);
        assertPropertyRowValue(4, 'x position (px)', 10, assert);
        assertPropertyRowValue(5, 'y position (px)', 20, assert);

        resizeElement(document.getElementById('design_button1'), 20, 0);
        assertPropertyRowValue(2, 'width (px)', 100, assert);
        assertPropertyRowValue(3, 'height (px)', 30, assert);

        resizeElement(document.getElementById('design_button1'), 0, 20);
        assertPropertyRowValue(2, 'width (px)', 100, assert);
        assertPropertyRowValue(3, 'height (px)', 50, assert);

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },

    {
      description: "dragging button",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {
        $("#designModeButton").click();
        testUtils.dragToVisualization('BUTTON', 10, 20);
        assertPropertyRowValue(0, 'id', 'button1', assert);
        assertPropertyRowValue(2, 'width (px)', 80, assert);
        assertPropertyRowValue(3, 'height (px)', 30, assert);
        assertPropertyRowValue(4, 'x position (px)', 10, assert);
        assertPropertyRowValue(5, 'y position (px)', 20, assert);

        dragElement(document.getElementById('design_button1'), 20, 0);
        assertPropertyRowValue(4, 'x position (px)', 20, assert);
        assertPropertyRowValue(5, 'y position (px)', 20, assert);

        dragElement(document.getElementById('design_button1'), 0, 20);
        assertPropertyRowValue(4, 'x position (px)', 20, assert);
        assertPropertyRowValue(5, 'y position (px)', 30, assert);

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },


    {
      description: "hidden items",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {

        $("#designModeButton").click();
        testUtils.dragToVisualization('BUTTON', 10, 10);
        assertPropertyRowValue(0, 'id', 'button1', assert);
        var toggleHidden = $('.custom-checkbox')[0];

        assert.equal(isFaded('#design_button1'), false);
        assert.equal(isHidden('#button1'), false);

        ReactTestUtils.Simulate.click(toggleHidden);

        assert.equal($(toggleHidden).hasClass('fa-check-square-o'), true);
        assert.equal(isFaded('#design_button1'), true);
        assert.equal(isHidden('#button1'), false);

        // Enter code mode
        $("#codeModeButton").click();
        assert.equal(isFaded('#design_button1'), false);
        assert.equal(isHidden('#button1'), true);

        // Back to design mode
        $("#designModeButton").click();
        assert.equal(isFaded('#design_button1'), true);
        assert.equal(isHidden('#button1'), false);

        // Enter run mode
        $("#runButton").click();
        assert.equal(isFaded('#design_button1'), false);
        assert.equal(isHidden('#button1'), true);

        $("#resetButton").click();
        assert.equal(isFaded('#design_button1'), true);
        assert.equal(isHidden('#button1'), false);

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },

    {
      description: "entering design mode while running",
      editCode: true,
      xml: 'button("my_button", "text");',
      runBeforeClick: function (assert) {
        testUtils.runOnAppTick(Applab, 2, function () {
          assert.equal($('#my_button').length, 1);

          $("#designModeButton").click();

          assert.equal($('#my_button').length, 0, 'API created element should be gone');
          assert.equal($('#design_my_button').length, 0, 'API created element should not appear in design mode');
          assert.equal($('#design-mode-dimmed').length, 0, 'transparency layer not visible when designing');

          Applab.onPuzzleComplete();
        });
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },

    {
      description: "design mode box dims when running in design mode",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {

        $("#designModeButton").click();
        assert.equal($('#design-mode-dimmed').length, 0, 'transparency layer not visible when designing');

        $("#runButton").click();
        assert.equal($('#design-mode-dimmed').length, 1, 'transparency layer visible when running in design mode');

        $("#resetButton").click();
        assert.equal($('#design-mode-dimmed').length, 0, 'transparency layer not visible after resetting');

        testUtils.runOnAppTick(Applab, 2, function () {
          Applab.onPuzzleComplete();
        });
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      },
    },

    {
      description: "exercise CHART element",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {

        // Switch to design mode
        var designModeButton = $('#designModeButton');
        designModeButton.click();

        // Add a chart
        testUtils.dragToVisualization('CHART', 0, 0);
        var designModeViz = $('#designModeViz');
        var newChart = designModeViz.find('.chart');
        assert.equal(newChart.length, 1);

        // Validate property rows and some default values
        assertPropertyRowValue(0, 'id', 'chart1', assert);
        assertPropertyRowValue(1, 'width (px)', 100, assert);
        assertPropertyRowValue(2, 'height (px)', 100, assert);
        assertPropertyRowExists(3, 'x position (px)', assert);
        assertPropertyRowExists(4, 'y position (px)', assert);
        assertPropertyRowExists(5, 'hidden', assert);
        assertPropertyRowExists(6, 'depth', assert);

        // Make sure it's draggable
        var manipulator = newChart.parent();
        assert.isTrue(manipulator.hasClass('ui-draggable'), 'chart is draggable');

        // Make sure it's resizable
        assert.isTrue(manipulator.hasClass('ui-resizable'), 'chart is resizable');

        // Hide/show the chart
        var toggleHidden = $('.custom-checkbox')[0];
        assert.isFalse(isFaded('#design_chart1'));
        assert.isFalse(isHidden('#chart1'));

        ReactTestUtils.Simulate.click(toggleHidden);
        assert.isTrue(isFaded('#design_chart1'));
        assert.isFalse(isHidden('#chart1'));

        ReactTestUtils.Simulate.click(toggleHidden);
        assert.isFalse(isFaded('#design_chart1'));
        assert.isFalse(isHidden('#chart1'));

        // Delete the chart
        var deleteButton = $('#designWorkspaceBody').find('button:contains(Delete)')[0];
        ReactTestUtils.Simulate.click(deleteButton);
        assert.equal(designModeViz.find('.chart').length, 0);

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      }
    },

    {
      description: "exercise IMAGE element",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {

        // Switch to design mode
        var designModeButton = $('#designModeButton');
        designModeButton.click();

        // Add an image
        testUtils.dragToVisualization('IMAGE', 0, 0);
        var designModeViz = $('#designModeViz');
        var newImage = designModeViz.find('img');
        assert.equal(newImage.length, 1);

        // Validate property rows and some default values
        assertPropertyRowValue(0, 'id', 'image1', assert);
        assertPropertyRowValue(1, 'text', '', assert);
        assertPropertyRowValue(2, 'width (px)', 100, assert);
        assertPropertyRowValue(3, 'height (px)', 100, assert);
        assertPropertyRowExists(4, 'x position (px)', assert);
        assertPropertyRowExists(5, 'y position (px)', assert);
        assertPropertyRowExists(6, 'picture Choose...', assert);
        assertPropertyRowExists(7, 'hidden', assert);
        assertPropertyRowExists(8, 'depth', assert);

        // Make sure it's draggable
        var manipulator = newImage.parent();
        assert.isTrue(manipulator.hasClass('ui-draggable'), 'image is draggable');

        // Make sure it's resizable
        assert.isTrue(manipulator.hasClass('ui-resizable'), 'image is resizable');

        // Hide/show the image
        var toggleHidden = $('.custom-checkbox')[0];
        assert.isFalse(isFaded('#design_image1'));
        assert.isFalse(isHidden('#image1'));

        ReactTestUtils.Simulate.click(toggleHidden);
        assert.isTrue(isFaded('#design_image1'));
        assert.isFalse(isHidden('#image1'));

        ReactTestUtils.Simulate.click(toggleHidden);
        assert.isFalse(isFaded('#design_image1'));
        assert.isFalse(isHidden('#image1'));

        // Delete the image
        var deleteButton = $('#designWorkspaceBody').find('button:contains(Delete)')[0];
        ReactTestUtils.Simulate.click(deleteButton);
        assert.equal(designModeViz.find('img').length, 0);

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      }
    },

    {
      description: "remixed images have correct urls",
      editCode: true,
      xml: '',
      levelHtml: '' +
        '<div xmlns="http://www.w3.org/1999/xhtml" id="designModeViz" class="appModern" style="width: 320px; height: 450px; display: block;">' +
          '<div class="screen" tabindex="1" id="screen1" style="display: block; height: 450px; width: 320px; left: 0px; top: 0px; position: absolute; z-index: 0;">' +
            '<img src="/v3/assets/Adks1c9Ko6WdR2PuwkA6cw/red.Png" id="image1" data-canonical-image-url="red.Png" style="height: 105px; width: 100px; position: absolute; left: 10px; top: 10px; margin: 0px;" />' +
            '<button id="button1" data-canonical-image-url="yellow.png" style="padding: 0px; margin: 0px; height: 120px; width: 120px; font-size: 14px; color: rgb(255, 255, 255); position: absolute; left: 120px; top: 130px; ' +
                'background-image: url(http://localhost.studio.code.org:3000/v3/assets/Adks1c9Ko6WdR2PuwkA6cw/yellow.png); background-color: rgb(26, 188, 156); background-size: 120px 120px;">Button</button>' +
          '</div>' +
        '</div>',
      runBeforeClick: function (assert) {
        var redImage = '/v3/assets/applab-channel-id/red.Png';
        assert.equal($('#design_image1').attr('src'), redImage, 'after init, design mode img src prefixed with new channel id');
        assert.equal($('#image1').attr('src'), redImage, 'after init, code mode img src prefixed with new channel id');

        var yellowImageRegex = new RegExp("^url\\(http://localhost:[0-9]+/v3/assets/applab-channel-id/yellow\\.png\\)$");
        assert.isTrue(yellowImageRegex.test($('#design_button1').css('background-image')), 'after init, design mode button image prefixed with new channel id');
        assert.isTrue(yellowImageRegex.test($('#button1').css('background-image')), 'after init, code mode button image prefixed with new channel id');

        testUtils.runOnAppTick(Applab, 1, function () {
          assert.equal($('#design_image1').attr('src'), redImage, 'after run, design mode img src prefixed with new channel id');
          assert.equal($('#image1').attr('src'), redImage, 'after run, code mode img src prefixed with new channel id');

          assert.isTrue(yellowImageRegex.test($('#design_button1').css('background-image')), 'after run, design mode button image prefixed with new channel id');
          assert.isTrue(yellowImageRegex.test($('#button1').css('background-image')), 'after run, code mode button image prefixed with new channel id');

          Applab.onPuzzleComplete();
        });
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      }
    },

    {
      description: "remixed images are sized properly",
      editCode: true,
      xml: '',
      // Use an asset path which we can access so that image loading will succeed
      assetPathPrefix: '//localhost:8001/apps/test/assets/',
      levelHtml: '' +
      '<div xmlns="http://www.w3.org/1999/xhtml" id="designModeViz" class="appModern" style="width: 320px; height: 450px; display: block;">' +
        '<div class="screen" tabindex="1" id="screen1" style="display: block; height: 450px; width: 320px; left: 0px; top: 0px; position: absolute; z-index: 0;">' +
          '<img src="/v3/assets/Adks1c9Ko6WdR2PuwkA6cw/flappy_promo.png" id="image1" data-canonical-image-url="flappy_promo.png" style="height: 105px; width: 100px; position: absolute; left: 10px; top: 10px; margin: 0px;" />' +
          '<button id="button1" data-canonical-image-url="phone_purple.png" style="padding: 0px; margin: 0px; height: 130px; width: 120px; font-size: 14px; color: rgb(255, 255, 255); position: absolute; left: 120px; top: 130px; ' +
              'background-image: url(http://localhost.studio.code.org:3000/v3/assets/Adks1c9Ko6WdR2PuwkA6cw/phone_purple.png); background-color: rgb(26, 188, 156); background-size: 120px 130px;">Button</button>' +
        '</div>' +
      '</div>',
      runBeforeClick: function (assert) {
        var flappyUrl = '//localhost:8001/apps/test/assets/applab-channel-id/flappy_promo.png';
        assert.equal($('#design_image1').attr('src'), flappyUrl, 'after init, design mode img src prefixed with new prefix');
        assert.equal($('#image1').attr('src'), flappyUrl, 'after init, code mode img src prefixed with new prefix');

        var phoneUrl = 'http://localhost:8001/apps/test/assets/applab-channel-id/phone_purple.png';
        var phoneBg = 'url(' + phoneUrl + ')';
        assert.equal(phoneBg, $('#design_button1').css('background-image'), 'after init, design mode button image url has new prefix');
        assert.equal(phoneBg, $('#button1').css('background-image'), 'after init, code mode button image url has new prefix');

        var img = new Image();
        img.src = flappyUrl;
        img.onload = function () {
          // There's no guarantee that we hit this onload after the onload in
          // designMode.js, so the styles won't always be set immediately.
          // Instead, wait until the next tick

          // add a completion on timeout since this is a freeplay level
          setTimeout(function () {
            var buttonElement = $('#design_button1')[0];
            assert.equal(buttonElement.style.backgroundImage, phoneBg, 'on load, design mode button image is unchanged');
            assert.equal(buttonElement.style.width, '120px', 'on load, design mode button width is unchanged');
            assert.equal(buttonElement.style.height, '130px', 'on load, design mode button height is unchanged');
            assert.equal(buttonElement.style.backgroundSize, '120px 130px', 'on load, design mode background size is unchanged');

            buttonElement = $('#button1')[0];
            assert.equal(buttonElement.style.backgroundImage, phoneBg, 'on load, code mode button image is unchanged');
            assert.equal(buttonElement.style.width, '120px', 'on load, code mode button width is unchanged');
            assert.equal(buttonElement.style.height, '130px', 'on load, code mode button height is unchanged');
            assert.equal(buttonElement.style.backgroundSize, '120px 130px', 'on load, code mode background size is unchanged');

            var imageElement = $('#design_image1')[0];
            assert.equal(imageElement.src, 'http:' + flappyUrl, 'on load, design mode image source is unchanged');
            assert.equal(imageElement.style.width, '100px', 'on load, design mode image width is unchanged');
            assert.equal(imageElement.style.height, '105px', 'on load, design mode image height is unchanged');

            imageElement = $('#image1')[0];
            assert.equal(imageElement.src, 'http:' + flappyUrl, 'on load, code mode image source is unchanged');
            assert.equal(imageElement.style.width, '100px', 'on load, code mode image width is unchanged');
            assert.equal(imageElement.style.height, '105px', 'on load, code mode image height is unchanged');

            Applab.onPuzzleComplete();
          }, 1);
        };
        img.onerror = function (err) {
          assert(false, err.message);
        };
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      }
    },

    {
      description: "element ids are validated",
      editCode: true,
      xml: '',
      runBeforeClick: function (assert) {

        // Switch to design mode
        var designModeButton = $('#designModeButton');
        designModeButton.click();

        // Add two buttons
        testUtils.dragToVisualization('BUTTON', 0, 0);
        testUtils.dragToVisualization('BUTTON', 100, 100);
        var designModeViz = $('#designModeViz');
        var buttons = designModeViz.find('button');
        assert.equal(buttons.length, 2, "there are two buttons in design mode");
        var firstButton = buttons[0];
        var targetButton = buttons[1];
        assert.equal(firstButton.id, "design_button1", "first button is design_button1");
        assert.equal(targetButton.id, "design_button2", "second button is design_button2");
        assertPropertyRowValue(0, 'id', 'button2', assert, "button2 is selected property tab");

        $('#runButton').click();
        $('#resetButton').click();
        assert($('#divApplab #button1'), "button1 appears in divApplab after Run/Reset");
        assert($('#divApplab #button2'), "button2 appears in divApplab after Run/Reset");
        assertPropertyRowValue(0, 'id', 'button2', assert, "button2 is still selected in property tab");

        // Renaming to 'button' succeeds.
        var idInput = $("#propertyRowContainer input")[0];
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button' } });
        assert.equal(targetButton.id, "design_button", "target button has id 'design_button'");
        assert(!idInput.style.backgroundColor, "id input 'button' has no background color");

        // Renaming to button3 succeeds.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button3' } });
        assert.equal(targetButton.id, "design_button3", "target button has id 'design_button3'");
        assert(!idInput.style.backgroundColor, "id input 'button3' has no background color");

        // Renaming to button2 succeeds, even though button2 exists inside divApplab.
        assert($('#divApplab #button2'), "button2 still appears inside divApplab");
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button2' } });
        assert.equal(targetButton.id, "design_button2", "target button has id 'design_button2'");
        assert(!idInput.style.backgroundColor, "id input 'button2' has no background color");

        // Renaming to duplicate id 'button1' fails.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button1' } });
        assert.equal(targetButton.id, 'design_button2', "target button still has id 'design_button2'");
        assert.equal(idInput.style.backgroundColor, "rgb(255, 204, 204)", "duplicate id input 'button1' has light red background color");

        // idInput reverts to previous value on blur.
        ReactTestUtils.Simulate.blur(idInput);
        assert.equal(idInput.value, "button2", "id input reverts to 'button2'");
        assert(!idInput.style.backgroundColor, "id input has no background color after losing focus");

        // Renaming to button4 succeeds.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button4' } });
        assert.equal(targetButton.id, "design_button4", "target button has id 'design_button4'");
        assert(!idInput.style.backgroundColor, "id input 'button4' has no background color");

        // Renaming to divApplab fails.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'divApplab' } });
        assert.equal(targetButton.id, "design_button4", "target button still has id 'design_button4'");
        assert.equal(idInput.style.backgroundColor, "rgb(255, 204, 204)", "invalid id input 'divApplab' has light red background color");

        // Renaming to button5 succeeds.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'button5' } });
        assert.equal(targetButton.id, "design_button5", "target button has id 'design_button4'");
        assert(!idInput.style.backgroundColor, "id input 'button5' has no background color");

        // Renaming to runButton fails.
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'runButton' } });
        assert.equal(targetButton.id, "design_button5", "target button still has id 'design_button5'");
        assert.equal(idInput.style.backgroundColor, "rgb(255, 204, 204)", "invalid id input 'runButton' has light red background color");

        // Make sure it works for screens too.
        testUtils.dragToVisualization('SCREEN', 100, 100);
        var screens = designModeViz.find('.screen');
        assert.equal(screens.length, 2, "there are two screens in design mode");
        var firstScreen = screens[0];
        var targetScreen = screens[1];
        assert.equal(firstScreen.id, "design_screen1", "first screen is design_screen1");
        assert.equal(targetScreen.id, "design_screen2", "second screen is design_screen2");

        // Renaming to duplicate id 'screen1' fails.
        idInput = $("#propertyRowContainer input")[0];
        ReactTestUtils.Simulate.change(idInput, { target: { value: 'screen1' } });
        assert.equal(targetScreen.id, "design_screen2", "target screen still has id 'design_screen2'");
        assert.equal(idInput.style.backgroundColor, "rgb(255, 204, 204)", "duplicate id input 'screen1' has light red background color");

        Applab.onPuzzleComplete();
      },
      expected: {
        result: true,
        testResult: TestResults.FREE_PLAY
      }
    }
  ]
};
