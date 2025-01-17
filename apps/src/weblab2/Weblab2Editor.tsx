import React from 'react';
import CodeEditor from '@cdo/apps/lab2/views/components/editor/CodeEditor';
import {html} from '@codemirror/lang-html';
//import {css} from '@codemirror/lang-css';

const Weblab2Editor: React.FunctionComponent = () => {
  // To use css, replace html() with css()
  const editorExtensions = [html()];
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onCodeChange = () => {};

  return (
    <CodeEditor
      onCodeChange={onCodeChange}
      startCode={'<h1>Hello, world!</h1>'}
      editorConfigExtensions={editorExtensions}
    />
  );
};

export default Weblab2Editor;
