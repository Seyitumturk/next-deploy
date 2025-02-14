import mongoose, { Schema, Document } from 'mongoose';

export interface IGptResponse extends Document {
  prompt: string;
  gptResponse: string;
  extractedSyntax: string;
  diagramSvg: string;
  createdAt: Date;
  updatedAt: Date;
}

const gptResponseSchema = new Schema<IGptResponse>({
  prompt: {
    type: String,
    required: true,
  },
  gptResponse: {
    type: String,
    required: true,
  },
  extractedSyntax: {
    type: String,
    required: true,
  },
  diagramSvg: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.GptResponse || mongoose.model<IGptResponse>('GptResponse', gptResponseSchema); 