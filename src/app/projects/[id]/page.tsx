import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project, { IProject } from '@/models/Project';
import DiagramEditor from './editor';
import { Types } from 'mongoose';

interface MongoHistoryItem {
  _id: Types.ObjectId;
  prompt?: string;
  diagram: string;
  diagram_img?: string;
  updateType: 'chat' | 'code' | 'reversion';
  updatedAt: Date;
}

interface SerializedHistoryItem {
  _id: string;
  prompt?: string;
  diagram: string;
  diagram_img?: string;
  updateType: 'chat' | 'code' | 'reversion';
  updatedAt: string;
}

interface SerializedProject {
  _id: string;
  title: string;
  diagramType: string;
  createdAt: string;
  history: SerializedHistoryItem[];
}

interface LeanProject {
  _id: Types.ObjectId;
  title: string;
  diagramType: string;
  createdAt: Date;
  history?: {
    _id: Types.ObjectId;
    prompt?: string;
    diagram: string;
    diagram_img?: string;
    updateType: 'chat' | 'code' | 'reversion';
    updatedAt: Date;
  }[];
}

async function getProject(userId: string, projectId: string) {
  await connectDB();
  
  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    throw new Error('User not found');
  }

  const rawProject = await Project.findOne({ _id: projectId, userId: user._id }).lean() as unknown as LeanProject;
  if (!rawProject) {
    throw new Error('Project not found');
  }

  // Properly serialize the project data
  const serializedProject: SerializedProject = {
    _id: rawProject._id.toString(),
    title: rawProject.title,
    diagramType: rawProject.diagramType,
    createdAt: rawProject.createdAt.toISOString(),
    history: (rawProject.history || []).map((item) => ({
      _id: item._id.toString(),
      prompt: item.prompt || '',
      diagram: item.diagram,
      diagram_img: item.diagram_img,
      updateType: item.updateType,
      updatedAt: new Date(item.updatedAt).toISOString()
    }))
  };

  return {
    project: serializedProject,
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      wordCountBalance: user.wordCountBalance
    }
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  const { project, user } = await getProject(userId, params.id);
  const currentDiagram = project.history[0]?.diagram || '';

  // Create user display data
  const userDisplayData = {
    credits: user.wordCountBalance,
    initials: `${user.firstName[0]}${user.lastName[0]}`
  };

  return (
    <main className="min-h-screen bg-background">
      <DiagramEditor
        projectId={project._id}
        projectTitle={project.title}
        diagramType={project.diagramType}
        initialDiagram={currentDiagram}
        user={userDisplayData}
        history={project.history}
      />
    </main>
  );
} 