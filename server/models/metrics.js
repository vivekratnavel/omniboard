import mongoose from 'mongoose';

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

export default function(databaseConn, metricsCollectionName) {
  return databaseConn.model(metricsCollectionName, MetricsSchema);
};
