/* تغليف كل handlers غير المتزامنة حتى لا تنهار العملية بسبب rejected promise.
   Express 4 لا يلتقط أخطاء الـ async handlers تلقائيًا. */

function asyncRoute(handler) {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

function wrapRouter(router) {
  for (const method of METHODS) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      const wrapped = handlers.map(h => {
        if (typeof h !== 'function' || h.length >= 4) return h; // error handlers
        return asyncRoute(h);
      });
      return original(path, ...wrapped);
    };
  }
  return router;
}

module.exports = { asyncRoute, wrapRouter };
