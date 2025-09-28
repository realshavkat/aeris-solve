import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['info', 'success', 'warning', 'error'], 
      default: 'info' 
    },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
