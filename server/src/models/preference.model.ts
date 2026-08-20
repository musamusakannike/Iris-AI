import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreference extends Document {
  deviceId: string;
  speechRate: number; // 0.5 to 2.0 (default 1.0)
  speechPitch: number; // 0.5 to 1.5 (default 1.0)
  voiceIdentifier?: string;
  verbosity: 'concise' | 'detailed';
  hazardAlertSound: boolean;
  hazardVibration: boolean;
  autoTorch: boolean;
  preferredMode: 'explore' | 'read' | 'hazard' | 'color';
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      default: 'default_device',
      index: true,
    },
    speechRate: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
    speechPitch: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 1.5,
    },
    voiceIdentifier: {
      type: String,
      default: '',
    },
    verbosity: {
      type: String,
      enum: ['concise', 'detailed'],
      default: 'concise',
    },
    hazardAlertSound: {
      type: Boolean,
      default: true,
    },
    hazardVibration: {
      type: Boolean,
      default: true,
    },
    autoTorch: {
      type: Boolean,
      default: true,
    },
    preferredMode: {
      type: String,
      enum: ['explore', 'read', 'hazard', 'color'],
      default: 'explore',
    },
  },
  {
    timestamps: true,
  }
);

export const UserPreferenceModel = mongoose.model<IUserPreference>(
  'UserPreference',
  UserPreferenceSchema
);
