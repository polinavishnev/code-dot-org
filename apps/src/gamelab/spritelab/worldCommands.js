import * as spriteUtils from './spriteUtils';
import {getStore} from '../../redux';
import {addConsoleMessage} from '../textConsoleModule';

export const commands = {
  comment(text) {
    /* no-op */
  },

  hideTitleScreen() {
    spriteUtils.title = spriteUtils.subtitle = '';
  },

  printText(text) {
    getStore().dispatch(addConsoleMessage({text: text}));
  },

  setBackground(color) {
    spriteUtils.background = color;
  },

  setBackgroundImage(img) {
    let backgroundImage = this.loadImage(img);
    backgroundImage.name = img;
    spriteUtils.background = backgroundImage;
  },

  showTitleScreen(title, subtitle) {
    spriteUtils.title = title || '';
    spriteUtils.subtitle = subtitle || '';
  }
};
