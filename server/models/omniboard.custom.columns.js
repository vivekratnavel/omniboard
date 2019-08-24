import mongoose from 'mongoose';
import {databaseConn} from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardCustomColumnsSchema = new Schema({
  name: {type: String},
  config_path: {type: String}
}, {
  strict: false
});

export default databaseConn.model('omniboard.custom.columns', OmniboardCustomColumnsSchema);
