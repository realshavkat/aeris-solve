import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  folderId: { type: String, required: true },
  userId: { type: String, required: true },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [String],
  color: { type: String, default: '#1e293b' },
  icon: { type: String, default: '📄' },
  lastSaved: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Draft || mongoose.model('Draft', draftSchema);
