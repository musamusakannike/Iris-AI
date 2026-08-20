import mongoose, { Document, Schema } from 'mongoose';

export type AssistiveMode = 'explore' | 'read' | 'hazard' | 'color' | 'ask';
export type HazardLevel = 'none' | 'low' | 'medium' | 'high';

export interface IScan extends Document {
  mode: AssistiveMode;
  prompt?: string;
  response: string;
  spokenSummary: string;
  hazardLevel: HazardLevel;
  hazardDetails?: string;
  detectedEntities: string[];
  tags: string[];
  thumbnail?: string; // Optional low-res base64 thumbnail
  createdAt: Date;
  updatedAt: Date;
}

const ScanSchema = new Schema<IScan>(
  {
    mode: {
      type: String,
      enum: ['explore', 'read', 'hazard', 'color', 'ask'],
      default: 'explore',
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      trim: true,
    },
    response: {
      type: String,
      required: true,
      trim: true,
    },
    spokenSummary: {
      type: String,
      required: true,
      trim: true,
    },
    hazardLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none',
      index: true,
    },
    hazardDetails: {
      type: String,
      trim: true,
    },
    detectedEntities: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on createdAt descending for fast history queries
ScanSchema.index({ createdAt: -1 });

export const ScanModel = mongoose.model<IScan>('Scan', ScanSchema);
