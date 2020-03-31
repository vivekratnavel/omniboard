import mongoose from 'mongoose';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardCustomColumnsSchema = new Schema({
  name: {type: String},
  config_path: {type: String}
}, {
  strict: false
});

export default function(databaseConn) {
  return databaseConn.model('omniboard.custom.columns', OmniboardCustomColumnsSchema);
};
