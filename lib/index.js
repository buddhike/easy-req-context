import _ from 'lodash';

import ensure from 'easy-ensure';

const registry = {};

class ReqContext {
  constructor() {
    for (var k in registry) {
      const fieldName = k;
      this[fieldName] = (...args) => {
        const instance = `_${fieldName}`;
        if (!this[instance]) {
          this[instance] = registry[fieldName](...args);
        }
        return this[instance];
      }
    }
  }
}

export function register(name, func) {
  ensure(_.isString(name), 'name must be a string');
  ensure(_.isFunction(func), 'func must be a function');

  registry[name] = func;
}

function dispose(context) {
  for (var k in context) {
    if (_.startsWith(k, '_') && context[k].dispose) {
      context[k].dispose();
    }
  }
}

const wrapper = fn => (...args) => {
  const context = new ReqContext();
  const req = args[0];
  req.context = context;

  let isAsync = false;

  try {
    const result = fn(...args);

    if (_.isFunction(result.then) && _.isFunction(result.catch)) {
      result.then(() => dispose(context)).catch(() => dispose(context));
      isAsync = true;
    }
  } finally {
    if (!isAsync) {
      dispose(context);
    }
  }
};

export default function(handler) {
  ensure(_.isFunction(handler), 'handler must be a function');
  return wrapper(handler);
}
