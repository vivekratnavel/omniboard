const moment = require.requireActual('moment-timezone');
jest.doMock('moment', () => {
  moment.tz.setDefault('Atlantic/Reykjavik');
  return moment;
});