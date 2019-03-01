import mongoose from 'mongoose';
import {databaseConn} from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const RunsSchema = new Schema({
  _id: {type: Number},
  heartbeat: {type: Date},
  meta: {},
  config: {},
  experiment: {},
  start_time: {type: Date},
  omniboard: {
      tags: [
        { type: String }
      ],
      notes: {type: String}
  },
  artifacts: []
}, {
    strict: false
});

RunsSchema.virtual('metrics', {
  ref: 'metrics',
  localField: '_id',
  foreignField: 'run_id'
});

export default databaseConn.model('runs', RunsSchema);
