'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import CreateProjectModal from '@/components/CreateProjectModal';
import { getProjects } from './actions';
import DeleteProjectModal from '@/components/DeleteProjectModal';

interface Project {
  _id: string;
  title: string;
  diagramType: string;
  description?: string;
  updatedAt: string;
  userId: string;
  createdAt: string;
  __v: number;
  history?: Array<{
    diagram_img?: string;
    diagram: string;
  }>;
}

interface User {
  _id: string;
  wordCountBalance: number;
}

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects();
        setProjects(data.projects);
        setUser(data.user);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, []);

  const getDiagramIcon = (type: string) => {
    const iconPath = `/diagrams/${type}.svg`;
    return (
      <img 
        src={iconPath} 
        alt={`${type} diagram icon`}
        className="w-full h-full object-contain"
      />
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(project => project._id !== projectId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <nav className="bg-gray-900 text-white h-16 shadow-lg shadow-gray-900/10 dark:shadow-black/20 backdrop-blur-md">
        <div className="container h-full mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-all">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-8 w-8" />
              <span className="text-xl font-bold font-geist">Chartable</span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            {user && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  <span className="text-gray-400">Credits:</span>
                  <span className="ml-1 font-mono text-white">{user.wordCountBalance.toLocaleString()}</span>
                </span>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Diagrams
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-primary/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>New Diagram</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse"
              >
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">No diagrams yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first diagram to get started
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Create Diagram</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project._id}
                className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Link
                  href={`/projects/${project._id}`}
                  className="block"
                >
                  {/* Diagram Preview */}
                  <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b dark:border-gray-700/50 p-4 flex items-center justify-center relative overflow-hidden group-hover:from-gray-100 group-hover:to-gray-200 dark:group-hover:from-gray-800/50 dark:group-hover:to-gray-700/50 transition-all duration-300">
                    {project.history?.[0]?.diagram_img ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: project.history[0].diagram_img 
                        }}
                        className="w-full h-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="relative flex items-center justify-center w-16 h-16">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-accent-2/20 blur-xl rounded-full transform scale-150" />
                        <div className="w-10 h-10 transform group-hover:scale-110 transition-transform duration-300 relative z-10">
                          {getDiagramIcon(project.diagramType)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-3">
                          <span className="w-5 h-5 flex items-center justify-center">
                            <span className="w-4 h-4">
                              {getDiagramIcon(project.diagramType)}
                            </span>
                          </span>
                          <span className="capitalize">{project.diagramType.replace('_', ' ')} Diagram</span>
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(project.updatedAt)}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setProjectToDelete(project);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete project"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
        
        {projectToDelete && (
          <DeleteProjectModal
            isOpen={!!projectToDelete}
            projectId={projectToDelete._id}
            projectTitle={projectToDelete.title}
            onClose={() => setProjectToDelete(null)}
            onDelete={handleDeleteProject}
          />
        )}
      </div>
    </div>
  );
} 