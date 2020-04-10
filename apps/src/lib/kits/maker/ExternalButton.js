import {EXTERNAL_PINS as MB_EXTERNAL_PINS} from './MicroBitConstants';
import {EventEmitter} from 'events';

export default function ExternalButton(board) {
  // There are six button events, ['', 'down', 'up', 'click', 'long-click', 'hold']
  this.buttonEvents = new Array(6).fill(0);
  this.board = board;
  this.pullup = MB_EXTERNAL_PINS.includes(this.board.pin);
  if (this.pullup) {
    this.board.mb.trackDigitalPin(this.board.pin, 1);
  }
  this.connect = false;

  this.board.mb.trackDigitalComponent(this.board.pin, (sourceID, eventID) => {
    if (this.board.pin === sourceID) {
      this.buttonEvents[eventID]++;
      if (eventID === 1 && !this.connect) {
        this.emit('down');
        this.connect = true;
      } else if (eventID === 2 && this.connect) {
        this.emit('up');
        this.connect = false;
      }
    }
  });
}
ExternalButton.inherits(EventEmitter);
