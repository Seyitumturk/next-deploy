'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import CreateProjectModal from '@/components/CreateProjectModal';
import { getProjects } from './actions';
import DeleteProjectModal from '@/components/DeleteProjectModal';
import OnboardingBar from '@/components/OnboardingBar';

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const router = useRouter();

  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    async function loadInitialProjects() {
      setIsLoading(true);
      try {
        const data = await getProjects(1, 10);
        setProjects(data.projects);
        setUser(data.user);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialProjects();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  async function loadMoreProjects() {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const data = await getProjects(nextPage, 10);
      setProjects(prevProjects => [...prevProjects, ...data.projects]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more projects:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className={`min-h-screen relative ${isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-[#f0eee6]"}`}>
      <OnboardingBar />
      
      <nav
        style={{ backgroundColor: isDarkMode ? "#111827" : "#e8dccc", color: isDarkMode ? "#ffffff" : "#1f2937" }}
        className="h-16 shadow-lg backdrop-blur-md"
      >
        <div className="container h-full mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-all">
              <img src="/logo-green.svg" alt="Chartable Logo" className="h-8 w-8" />
              <span className="text-xl font-bold font-geist">Chartable</span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 4.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            {user && (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Credits:</span>
                  <span className={`ml-1 font-mono ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {user.wordCountBalance.toLocaleString()}
                  </span>
                </span>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="max-w-3xl mx-auto">
            <div className={`${isDarkMode ? "bg-white/5" : "!bg-[#e8dccc]"} backdrop-blur-md rounded-2xl p-8 shadow-xl shadow-purple-500/10 border border-white/20 dark:border-white/10`}>
              <form className="relative" onSubmit={async (e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                const prompt = input.value.trim();
                if (!prompt) return;

                try {
                  // First, detect the diagram type
                  const typeResponse = await fetch('/api/diagrams/detect-type', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt }),
                  });

                  if (!typeResponse.ok) {
                    throw new Error('Failed to detect diagram type');
                  }

                  const { diagramType } = await typeResponse.json();

                  // Then create the project with the detected type
                  const projectResponse = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: prompt,
                      diagramType,
                      description: prompt,
                    }),
                  });

                  if (!projectResponse.ok) {
                    throw new Error('Failed to create project');
                  }

                  const project = await projectResponse.json();
                  router.push(`/projects/${project._id}`);
                } catch (error) {
                  console.error('Error:', error);
                }
              }}>
                <input
                  type="text"
                  placeholder="Describe what you want to visualize..."
                  className={`w-full px-6 py-4 rounded-xl bg-black/20 border border-white/10 ${isDarkMode ? "text-white placeholder-gray-400" : "text-black placeholder-black"} focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-geist text-lg transition-all`}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg 
                    bg-primary/20 hover:bg-primary/30 text-primary-light transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-black"}`}>
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
                className={`rounded-xl p-6 shadow-sm animate-pulse ${isDarkMode ? 'bg-gray-800' : 'bg-[#e8dccc]'}`}
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className={`group relative ${isDarkMode ? 'bg-gray-800' : 'bg-[#e8dccc]'} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
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
                          <h3 className={`font-semibold text-lg mb-1 group-hover:text-primary transition-colors ${isDarkMode ? "text-white" : "text-black"} line-clamp-1`}>
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

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMoreProjects}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
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