import mongoose from 'mongoose';
import {databaseConn} from '../config/database';
import {FilesSchema} from "./fs.files";

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const MetricsSchema = new Schema({
  _id: {type: Schema.Types.ObjectId},
  run_id: {type: Number, ref: 'runs'}
}, {
  strict: false
});

MetricsSchema.virtual('run', {
  ref: 'runs',
  localField: 'run_id',
  foreignField: '_id'
});

export default databaseConn.model('metrics', MetricsSchema);
