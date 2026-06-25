import eventBus from '../mock/eventBus';

export const createSocket = () => {
  const socket = {
    connected: true,
    on(event, fn) {
      eventBus.on(event, fn);
      if (event === 'connect') setTimeout(() => fn(), 50);
    },
    off(event, fn) {
      eventBus.off(event, fn);
    },
    emit(event, data) {
      eventBus.emit(event, data);
    },
    onAny(fn) {
      this._anyHandler = fn;
    },
    offAny() {
      this._anyHandler = null;
    },
    disconnect() {},
  };
  return socket;
};
