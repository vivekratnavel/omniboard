import mongoose from 'mongoose';
import {databaseConn} from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardColumnsSchema = new Schema({
  name: {type: String},
  metric_name: {type: String},
  extrema: {type: String}
}, {
  strict: false
});

export default databaseConn.model('omniboard.columns', OmniboardColumnsSchema);
