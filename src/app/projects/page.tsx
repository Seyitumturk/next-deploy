'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import CreateProjectModal from '@/components/CreateProjectModal';
import { getProjects } from './actions';
import DeleteProjectModal from '@/components/DeleteProjectModal';
import OnboardingBar from '@/components/OnboardingBar';
import Image from 'next/image';

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

const EditableTitle = ({ 
  initialTitle, 
  projectId, 
  onUpdate 
}: { 
  initialTitle: string;
  projectId: string;
  onUpdate: (projectId: string, newTitle: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = async () => {
    if (title.trim() === '') {
      setTitle(initialTitle);
      setIsEditing(false);
      return;
    }

    if (title !== initialTitle) {
      onUpdate(projectId, title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div onClick={(e) => e.preventDefault()}>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.preventDefault()}
          className="bg-transparent w-full font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary rounded px-1"
        />
      </div>
    );
  }

  return (
    <h3 
      onClick={handleTitleClick}
      className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors cursor-pointer hover:opacity-80"
    >
      {title}
    </h3>
  );
};

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
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate projects that match the search query (case-insensitive)
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <Image 
        src={iconPath} 
        alt={`${type} diagram icon`}
        className="w-full h-full object-contain"
        width={100}
        height={100}
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

  const handleTitleUpdate = async (projectId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      // Update the projects state with the new title
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === projectId
            ? { ...project, title: newTitle }
            : project
        )
      );
    } catch (error) {
      console.error('Error updating project title:', error);
      // You might want to add error handling UI here
    }
  };

  return (
    <div className={`min-h-screen relative ${isDarkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-[#f0eee6]"}`}>
      <OnboardingBar />
      
      <nav
        style={{ backgroundColor: isDarkMode ? "#111827" : "#e8dccc", color: isDarkMode ? "#ffffff" : "#1f2937" }}
        className="sticky top-0 z-50 h-16 border-b border-gray-800/10"
      >
        <div className="container h-full mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-all">
              <Image src="/logo-green.svg" alt="Chartable Logo" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-bold font-geist hidden md:block">Chartable</span>
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
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm">
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
            {user && (
              <div className="md:hidden flex items-center space-x-1">
                <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  {user.wordCountBalance.toLocaleString()}
                </span>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#a855f7] to-transparent shadow-md" />

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 12.65z" />
              </svg>
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
        ) : searchQuery && filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2 dark:text-white text-black">No diagrams match &quot;{searchQuery}&quot;</h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  className={`group relative ${isDarkMode ? 'bg-gray-800' : 'bg-[#e8dccc]'} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
                >
                  {/* Preview section - clickable */}
                  <Link
                    href={`/projects/${project._id}`}
                    className="block"
                  >
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
                  </Link>

                  {/* Info section - title editable, rest clickable */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <EditableTitle
                          initialTitle={project.title}
                          projectId={project._id}
                          onUpdate={handleTitleUpdate}
                        />
                        <Link href={`/projects/${project._id}`}>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-3">
                            <span className="w-5 h-5 flex items-center justify-center">
                              <span className="w-4 h-4">
                                {getDiagramIcon(project.diagramType)}
                              </span>
                            </span>
                            <span className="capitalize">{project.diagramType.replace('_', ' ')} Diagram</span>
                          </p>
                        </Link>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(project.updatedAt)}
                      </span>
                    </div>
                    {project.description && (
                      <Link href={`/projects/${project._id}`}>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </Link>
                    )}
                  </div>

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

            { !searchQuery && hasMore && (
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