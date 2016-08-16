/** @file React PropTypes definitions for use in cryptography widget components */
import React from 'react';
export const AnyChildren = React.PropTypes.oneOfType([
  React.PropTypes.element,
  React.PropTypes.arrayOf(React.PropTypes.element)
]);
