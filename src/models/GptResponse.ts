import mongoose, { Schema, Document } from 'mongoose';

export interface IGptResponse extends Document {
  prompt: string;
  gptResponse: any;
  extractedSyntax: string;
  validSyntax?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gptResponseSchema = new Schema<IGptResponse>({
  prompt: {
    type: String,
    required: true,
  },
  gptResponse: {
    type: Schema.Types.Mixed,
    required: true,
  },
  extractedSyntax: {
    type: String,
    required: true,
  },
  validSyntax: {
    type: Boolean,
  },
}, {
  timestamps: true,
});

export default mongoose.models.GptResponse || mongoose.model<IGptResponse>('GptResponse', gptResponseSchema); 