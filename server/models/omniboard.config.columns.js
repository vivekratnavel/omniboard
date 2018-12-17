import mongoose from 'mongoose';
import db from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardConfigColumnsSchema = new Schema({
  name: {type: String},
  config_path: {type: String}
}, {
  strict: false
});

export default db.model('omniboard.config.columns', OmniboardConfigColumnsSchema);
