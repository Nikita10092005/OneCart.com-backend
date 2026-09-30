const rateLimit = require('../middleware/rateLimit');
test('limits one client, permits other clients, and resets after the window', () => {
  jest.useFakeTimers();
  const middleware = rateLimit({limit: 2, windowMs: 1000});
  const res = {status: jest.fn().mockReturnThis(), set: jest.fn(), json: jest.fn()};
  const next = jest.fn();
  middleware({ip:'a'},res,next);
  middleware({ip:'a'},res,next);
  middleware({ip:'a'},res,next);
  expect(next).toHaveBeenCalledTimes(2);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(res.set).toHaveBeenCalledWith('Retry-After','1');
  middleware({ip:'b'},res,next);
  jest.advanceTimersByTime(1000);
  middleware({ip:'a'},res,next);
  expect(next).toHaveBeenCalledTimes(4);
  jest.clearAllTimers();
  jest.useRealTimers();
});
