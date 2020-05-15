const SET_ARROW_BUTTONS_VISIBLE = 'arrowDisplay/SET_ARROW_BUTTONS_VISIBLE';
const SET_ARROW_BUTTONS_HIDDEN = 'arrowDisplay/SET_ARROW_BUTTONS_HIDDEN';
const SET_ARROW_BUTTONS_DISABLED = 'arrowDisplay/SET_ARROW_BUTTONS_DISABLED';
const DISMISS_SWIPE_OVERLAY = 'arrowDisplay/DISMISS_SWIPE_OVERLAY';

const initialState = {
  buttonsAreVisible: false,
  buttonsAreDisabled: true,
  swipeOverlayHasBeenDismissed: false
};

export default function arrowDisplay(state = initialState, action) {
  switch (action.type) {
    case SET_ARROW_BUTTONS_VISIBLE:
      return {
        ...state,
        buttonsAreVisible: true
      };
    case SET_ARROW_BUTTONS_HIDDEN:
      return {
        ...state,
        buttonsAreVisible: false
      };
    case SET_ARROW_BUTTONS_DISABLED:
      return {
        ...state,
        buttonsAreDisabled: action.isDisabled
      };
    case DISMISS_SWIPE_OVERLAY:
      return {
        ...state,
        swipeOverlayHasBeenDismissed: true
      };
    default:
      return state;
  }
}

export function showArrowButtons() {
  return {type: SET_ARROW_BUTTONS_VISIBLE};
}

export function hideArrowButtons() {
  return {type: SET_ARROW_BUTTONS_HIDDEN};
}

export function setArrowButtonDisabled(isDisabled) {
  return {type: SET_ARROW_BUTTONS_DISABLED, isDisabled};
}

export function dismissSwipeOverlay() {
  return {type: DISMISS_SWIPE_OVERLAY};
}
