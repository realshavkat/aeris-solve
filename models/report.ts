import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  folderId: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [String],
  collaborators: [{
    id: String,
    name: String,
    canEdit: { type: Boolean, default: false }
  }],
  archived: { type: Boolean, default: false },
  color: { type: String, default: '#ffffff' },
  icon: { type: String, default: '📄' }
});

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
