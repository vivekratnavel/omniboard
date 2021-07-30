import mongoose from 'mongoose';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const OmniboardMetricColumnsSchema = new Schema({
  name: {type: String},
  metric_name: {type: String},
  extrema: {type: String},
  lastn: {type: Number, min: 1}

}, {
  strict: false
});

export default function (databaseConn) {
  return databaseConn.model('omniboard.metric.columns', OmniboardMetricColumnsSchema);
};
