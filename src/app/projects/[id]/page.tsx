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

  return (
    <main className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-gray-900 text-white h-12">
        <div className="container h-full mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/projects" className="flex items-center space-x-2 hover:opacity-80">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-6 w-6" />
              <span className="font-bold">{project.title}</span>
            </Link>
            <span className="text-sm text-gray-400">
              {project.diagramType} diagram • Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-400">Credits:</span>
              <span className="ml-1 font-mono">{user.wordCountBalance.toLocaleString()}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
          </div>
        </div>
      </nav>

      {/* Editor */}
      <DiagramEditor
        projectId={project._id}
        diagramType={project.diagramType}
        initialDiagram={currentDiagram}
      />
    </main>
  );
} 