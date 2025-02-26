'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import { Types } from 'mongoose';

interface ProjectDocument {
  _id: Types.ObjectId;
  title: string;
  diagramType: string;
  description?: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

interface ProjectResponse {
  _id: string;
  title: string;
  diagramType: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  history?: Array<{
    diagram_img?: string;
    diagram: string;
    updateType?: string;
  }>;
}

interface UserResponse {
  _id: string;
  wordCountBalance: number;
}

interface GetProjectsResponse {
  projects: ProjectResponse[];
  user: UserResponse;
  hasMore: boolean;
}

export async function getProjects(page: number = 1, limit: number = 10): Promise<GetProjectsResponse> {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  await connectDB();

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    throw new Error('User not found');
  }

  const rawProjects = await Project.find({ userId: user._id })
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select('_id title diagramType description userId createdAt updatedAt diagramSVG history.diagram_img history.diagram history.updateType')
    .lean();

  const totalCount = await Project.countDocuments({ userId: user._id });
  const hasMore = (page - 1) * limit + rawProjects.length < totalCount;

  const projects = rawProjects.map(project => {
    const typedProject = project as unknown as ProjectDocument;
    
    // Get the most recent history item with a diagram_img
    let historyWithImage = project.history ? 
      project.history.filter(item => item.diagram_img && item.diagram_img.length > 0).slice(0, 1) : 
      [];
    
    // If no history items have diagram_img, include the first history item anyway
    if (historyWithImage.length === 0 && project.history && project.history.length > 0) {
      historyWithImage = [project.history[0]];
    }
    
    return {
      ...project,
      _id: typedProject._id.toString(),
      userId: typedProject.userId.toString(),
      createdAt: typedProject.createdAt.toISOString(),
      updatedAt: typedProject.updatedAt.toISOString(),
      // Include diagramSVG if available
      diagramSVG: project.diagramSVG || null,
      // Include history with diagram_img
      history: historyWithImage
    } as ProjectResponse;
  });

  return {
    projects,
    user: {
      _id: user._id.toString(),
      wordCountBalance: user.wordCountBalance,
    },
    hasMore,
  };
} 