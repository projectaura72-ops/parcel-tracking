const listeners = {};

const eventBus = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return () => this.off(event, fn);
  },
  off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((l) => l !== fn);
  },
  emit(event, data) {
    (listeners[event] || []).forEach((fn) => fn(data));
  },
  removeAllListeners(event) {
    if (event) delete listeners[event];
    else Object.keys(listeners).forEach((k) => delete listeners[k]);
  },
};

export default eventBus;
