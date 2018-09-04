import mongoose from 'mongoose';
import db from '../config/database';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const RunsSchema = new Schema({
    _id: {type: Number},
    heartbeat: {type: Date},
    meta: {type: Schema.Types.ObjectId},
    config: {type: Schema.Types.ObjectId},
    experiment: {type: Schema.Types.ObjectId},
    start_time: {type: Date},
    omniboard: {
        tags: [
          { type: String }
        ],
        notes: {type: String}
    }
}, {
    strict: false
});

RunsSchema.virtual('metrics', {
  ref: 'metrics',
  localField: '_id',
  foreignField: 'run_id'
});

export default db.model('runs', RunsSchema);
