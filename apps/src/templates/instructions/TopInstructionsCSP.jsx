'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import Radium from 'radium';
import {connect} from 'react-redux';
var actions = require('../../applab/actions');
var instructions = require('../../redux/instructions');
var color = require('../../color');
var styleConstants = require('../../styleConstants');
var commonStyles = require('../../commonStyles');

var processMarkdown = require('marked');

var Instructions = require('./Instructions');
var CollapserIcon = require('./CollapserIcon');
var HeightResizer = require('./HeightResizer');
var constants = require('../../constants');
var msg = require('../../locale');

var HEADER_HEIGHT = styleConstants['workspace-headers-height'];
var RESIZER_HEIGHT = styleConstants['resize-bar-width'];

var MIN_HEIGHT = RESIZER_HEIGHT + 60;

var styles = {
  main: {
    position: 'absolute',
    marginLeft: 15,
    top: 0,
    right: 0,
    // left handled by media queries for .editor-column
  },
  header: {
    height: HEADER_HEIGHT,
    lineHeight: HEADER_HEIGHT + 'px',
    fontFamily: '"Gotham 4r"',
    backgroundColor: color.lighter_purple,
    textAlign: 'center'
  },
  body: {
    backgroundColor: 'white',
    overflowY: 'scroll',
    paddingLeft: 10,
    paddingRight: 10,
    position: 'absolute',
    top: HEADER_HEIGHT,
    bottom: 0,
    left: 0,
    right: 0
  },
  embedView: {
    height: undefined,
    bottom: 0,
    // Visualization is hard-coded on embed levels. Do the same for instructions position
    left: 340
  }
};

var TopInstructions = React.createClass({
  propTypes: {
    // TODO - figure out
    // isEmbedView: React.PropTypes.bool.isRequired,
    // puzzleNumber: React.PropTypes.number.isRequired,
    // stageTotal: React.PropTypes.number.isRequired,
    // height: React.PropTypes.number.isRequired,
    // maxHeight: React.PropTypes.number.isRequired,
    // markdown: React.PropTypes.string,
    // collapsed: React.PropTypes.bool.isRequired,
    // toggleInstructionsCollapsed: React.PropTypes.func.isRequired,
    // setInstructionsHeight: React.PropTypes.func.isRequired,
    // onResize: React.PropTypes.func.isRequired
  },

  componentDidMount() {
    if (!this.props.markdown) {
      return;
    }

    window.addEventListener('resize', this.adjustMaxNeededHeight);

    const maxNeededHeight = this.adjustMaxNeededHeight();

    // Initially set to 300. This might be adjusted when InstructionsWithWorkspace
    // adjusts max height.
    this.props.setInstructionsRenderedHeight(Math.min(maxNeededHeight, 300));
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.adjustMaxNeededHeight);
  },

  /**
   * TODO - comment me
   */
  componentWillReceiveProps(nextProps) {
    if (!this.props.markdown) {
      return;
    }

    if (!nextProps.collapsed && nextProps.height < MIN_HEIGHT &&
        nextProps.height < nextProps.maxHeight) {
      // Height can get below min height iff we resize the window to be super
      // small. If we then resize it to be larger again, we want to increase
      // height.
      this.props.setInstructionsRenderedHeight(Math.min(nextProps.maxHeight, MIN_HEIGHT));
    }
  },

  /**
   * Given a prospective delta, determines how much we can actually change the
   * height (accounting for min/max) and changes height by that much.
   * @param {number} delta
   * @returns {number} How much we actually changed
   */
  handleHeightResize: function (delta) {
    var minHeight = MIN_HEIGHT;
    var currentHeight = this.props.height;

    var newHeight = Math.max(minHeight, currentHeight + delta);
    newHeight = Math.min(newHeight, this.props.maxHeight);

    this.props.setInstructionsRenderedHeight(newHeight);
    return newHeight - currentHeight;
  },

  /**
   * TODO - comment me
   */
  adjustMaxNeededHeight() {
    if (!this.props.markdown) {
      return;
    }
    const instructionsContent = this.refs.instructions;
    const maxNeededHeight = $(ReactDOM.findDOMNode(instructionsContent)).outerHeight(true) +
      HEADER_HEIGHT + RESIZER_HEIGHT;

    this.props.setInstructionsMaxHeightNeeded(maxNeededHeight);
    return maxNeededHeight;
  },

  /**
   * Handle a click of our collapser button by changing our collapse state, and
   * updating our rendered height.
   */
  handleClickCollapser() {
    const collapsed = !this.props.collapsed;
    this.props.toggleInstructionsCollapsed();

    // adjust rendered height based on next collapsed state
    if (collapsed) {
      this.props.setInstructionsRenderedHeight(HEADER_HEIGHT);
    } else {
      this.props.setInstructionsRenderedHeight(this.props.expandedHeight);
    }
  },

  render: function () {
    // TODO - might it make more sense to put the same DOM there, but hide it?
    if (!this.props.markdown) {
      return <div/>;
    }
    var id = this.props.id;

    var mainStyle = [styles.main, {
      height: this.props.height - RESIZER_HEIGHT
    }, this.props.isEmbedView && styles.embedView];

    return (
      <div style={mainStyle} className="editor-column">
        {!this.props.isEmbedView && <CollapserIcon
            collapsed={this.props.collapsed}
            onClick={this.handleClickCollapser}/>
        }
        <div style={styles.header}>
          {msg.puzzleTitle({
            stage_total: this.props.stageTotal,
            puzzle_number: this.props.puzzleNumber
          })}
        </div>
        <div style={[this.props.collapsed && commonStyles.hidden]}>
          <div style={styles.body}>
            <Instructions
              ref="instructions"
              renderedMarkdown={processMarkdown(this.props.markdown)}
              onResize={this.adjustMaxNeededHeight}
              inTopPane
              />
          </div>
          {!this.props.isEmbedView && <HeightResizer
            position={this.props.height}
            onResize={this.handleHeightResize}/>
          }
        </div>
      </div>
    );
  }
});
module.exports = connect(function propsFromStore(state) {
  return {
    isEmbedView: state.pageConstants.isEmbedView,
    puzzleNumber: state.pageConstants.puzzleNumber,
    stageTotal: state.pageConstants.stageTotal,
    height: state.instructions.renderedHeight,
    expandedHeight: state.instructions.expandedHeight,
    maxHeight: Math.min(state.instructions.maxAvailableHeight,
      state.instructions.maxNeededHeight),
    markdown: state.instructions.longInstructions,
    collapsed: state.instructions.collapsed
  };
}, function propsFromDispatch(dispatch) {
  return {
    toggleInstructionsCollapsed() {
      dispatch(instructions.toggleInstructionsCollapsed());
    },
    setInstructionsHeight(height) {
      dispatch(instructions.setInstructionsHeight(height));
    },
    setInstructionsRenderedHeight(height) {
      dispatch(instructions.setInstructionsRenderedHeight(height));
    },
    setInstructionsMaxHeightNeeded(height) {
      dispatch(instructions.setInstructionsMaxHeightNeeded(height));
    }
  };
}, null, { withRef: true }
)(Radium(TopInstructions));
