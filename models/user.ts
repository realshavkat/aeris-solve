// Fichier: models/user.ts
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, unique: true },
    discordUsername: { type: String, required: true },
    discordDiscriminator: { type: String, required: true },
    avatar: { type: String },
    email: { type: String }, // Ajout du champ email
    rpName: { type: String, default: null },
    anonymousNickname: { type: String, default: null },
    nickname: { type: String },
    role: { type: String, enum: ["visitor", "member", "admin"], default: "visitor" },
    status: {
      type: String,
      enum: ['needs_registration', 'pending', 'approved', 'rejected', 'banned'],
      default: 'needs_registration',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.models.users || mongoose.model("users", UserSchema);

export default User;