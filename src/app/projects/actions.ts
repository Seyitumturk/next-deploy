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
}

interface UserResponse {
  _id: string;
  wordCountBalance: number;
}

interface GetProjectsResponse {
  projects: ProjectResponse[];
  user: UserResponse;
}

export async function getProjects(): Promise<GetProjectsResponse> {
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
    .lean();

  const projects = rawProjects.map(project => {
    const typedProject = project as unknown as ProjectDocument;
    return {
      ...project,
      _id: typedProject._id.toString(),
      userId: typedProject.userId.toString(),
      createdAt: typedProject.createdAt.toISOString(),
      updatedAt: typedProject.updatedAt.toISOString(),
    } as ProjectResponse;
  });

  return {
    projects,
    user: {
      _id: user._id.toString(),
      wordCountBalance: user.wordCountBalance,
    },
  };
} 