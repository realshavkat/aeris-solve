import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  coverImage: String,
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  accessKey: String,
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }
});

export default mongoose.models.Folder || mongoose.model('Folder', folderSchema);
