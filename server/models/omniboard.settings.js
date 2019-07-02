import mongoose from 'mongoose';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardSettingsSchema = new Schema({
  name: {type: String},
  value: {}
}, {
  strict: false
});

export default function (databaseConn) {
  return databaseConn.model('omniboard.settings', OmniboardSettingsSchema);
};
