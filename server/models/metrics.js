import mongoose from 'mongoose';
import {databaseConn} from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const MetricsSchema = new Schema({
  _id: {type: Schema.Types.ObjectId},
  run_id: {type: Number, ref: 'runs'}
}, {
  strict: false
});

export default databaseConn.model('metrics', MetricsSchema);
