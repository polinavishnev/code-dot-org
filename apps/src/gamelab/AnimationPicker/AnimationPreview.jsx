/** @file Render a gallery image/spritesheet as an animated preview */
import React from 'react';
import { METADATA_SHAPE } from '../animationMetadata';
const MARGIN_PX = 2;

/**
 * Render an animated preview of a spritesheet at a given size, scaled with
 * a fixed aspect ratio to fit.
 */
const AnimationPreview = React.createClass({
  propTypes: {
    animationData: React.PropTypes.object.isRequired, // TODO: Shape?
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired,
    alwaysPlay: React.PropTypes.bool
  },

  getInitialState: function () {
    return {
      currentFrame: 0,
      framesPerRow: 1,
      scaledSourceSize: {x: 0, y: 0},
      scaledFrameSize: {x: 0, y: 0},
      extraTopMargin: 0,
      wrappedSourceUrl: ''
    };
  },

  componentWillMount: function () {
    this.precalculateRenderProps(this.props);
  },

  componentWillReceiveProps: function (nextProps) {
    this.precalculateRenderProps(nextProps);
    if (nextProps.alwaysPlay && !this.timeout_) {
      this.advanceFrame();
    } else if (!nextProps.alwaysPlay && this.timeout_) {
      this.stopAndResetAnimation();
    }
  },

  componentWillUnmount: function () {
    if (this.timeout_) {
      clearTimeout(this.timeout_);
    }
  },

  onMouseOver: function () {
    this.advanceFrame();
  },

  onMouseOut: function () {
    this.stopAndResetAnimation();
  },

  advanceFrame: function () {
    this.setState({
      currentFrame: (this.state.currentFrame + 1) % this.props.animationData.frameCount
    });
    clearTimeout(this.timeout_);
    this.timeout_ = setTimeout(this.advanceFrame, 1000 / this.props.animationData.frameRate);
  },

  stopAndResetAnimation: function () {
    if (this.timeout_) {
      clearTimeout(this.timeout_);
      this.timeout_ = undefined;
    }
    this.setState({ currentFrame: 0 });
  },

  precalculateRenderProps: function (nextProps) {
    const nextAnimation = nextProps.animationData;
    const innerWidth = nextProps.width - 2 * MARGIN_PX;
    const innerHeight = nextProps.height - 2 * MARGIN_PX;
    const xScale = innerWidth / nextAnimation.frameSize.x;
    const yScale = innerHeight / nextAnimation.frameSize.y;
    const scale = Math.min(1, Math.min(xScale, yScale));
    const scaledFrameSize = scaleVector2(nextAnimation.frameSize, scale);
    this.setState({
      framesPerRow: Math.floor(nextAnimation.sourceSize.x / nextAnimation.frameSize.x),
      scaledSourceSize: scaleVector2(nextAnimation.sourceSize, scale),
      scaledFrameSize: scaledFrameSize,
      extraTopMargin: Math.ceil((innerHeight - scaledFrameSize.y) / 2),
      wrappedSourceUrl: `url('${nextAnimation.sourceUrl}')`
    });
  },

  render: function () {
    const { currentFrame, framesPerRow, scaledSourceSize, scaledFrameSize,
        extraTopMargin, wrappedSourceUrl } = this.state;

    const row = Math.floor(currentFrame / framesPerRow);
    const column = currentFrame % framesPerRow;
    const xOffset = -scaledFrameSize.x * column;
    const yOffset = -scaledFrameSize.y * row;

    const containerStyle = {
      width: this.props.width,
      height: this.props.height,
      textAlign: 'center'
    };
    const imageStyle = {
      width: scaledFrameSize.x,
      height: scaledFrameSize.y,
      marginTop: MARGIN_PX + extraTopMargin,
      marginLeft: MARGIN_PX,
      marginRight: MARGIN_PX,
      marginBottom: MARGIN_PX,
      backgroundImage: wrappedSourceUrl,
      backgroundRepeat: 'no-repeat',
      backgroundSize: scaledSourceSize.x,
      backgroundPosition: xOffset + 'px ' + yOffset + 'px'
    };

    return (
      <div
          ref="root"
          style={containerStyle}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}>
        <img src="/blockly/media/1x1.gif" style={imageStyle} />
      </div>
    );
  }
});
export default AnimationPreview;

function scaleVector2(vector, scale) {
  return {
    x: vector.x * scale,
    y: vector.y * scale
  };
}
