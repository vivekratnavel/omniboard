import mongoose from 'mongoose';
import {databaseConn} from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardSettingsSchema = new Schema({
  name: {type: String},
  value: {}
}, {
  strict: false
});

export default databaseConn.model('omniboard.settings', OmniboardSettingsSchema);
