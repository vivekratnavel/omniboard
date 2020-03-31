import mongoose from 'mongoose';

const Schema = mongoose.Schema;
mongoose.Promise = Promise;

export const FilesSchema = new Schema({
  _id: {type: Schema.Types.ObjectId},
  filename: {type: String}
}, {
  strict: false
});

FilesSchema.virtual('chunk', {
  ref: 'fs.chunks',
  localField: '_id',
  foreignField: 'files_id'
});

export default function (databaseConn) {
  return databaseConn.model('fs.files', FilesSchema);
};
