'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function CreateProjectModal({ isOpen, onClose, isDarkMode }: CreateProjectModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    diagramType: '',
  });

  const diagramTypes = [
    { value: 'erd', label: 'Entity Relationship Diagram (ERD)', icon: '/diagrams/erd.svg' },
    { value: 'flowchart', label: 'Flowchart', icon: '/diagrams/flowchart.svg' },
    { value: 'sequence', label: 'Sequence Diagram', icon: '/diagrams/sequence.svg' },
    { value: 'class', label: 'Class Diagram', icon: '/diagrams/class.svg' },
    { value: 'state', label: 'State Diagram', icon: '/diagrams/state.svg' },
    { value: 'mindmap', label: 'Mind Map', icon: '/diagrams/mindmap.svg' },
    { value: 'timeline', label: 'Timeline', icon: '/diagrams/timeline.svg' },
    { value: 'gantt', label: 'Gantt Chart', icon: '/diagrams/gantt.svg' },
    { value: 'sankey', label: 'Sankey Diagram', icon: '/diagrams/sankey.svg' },
    { value: 'git', label: 'Git Graph', icon: '/diagrams/git.svg' },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const project = await response.json();
      router.push(`/projects/${project._id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleNext = () => {
    if (step === 1 && !formData.title.trim()) return;
    setStep(2);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#f0eee6] dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
        >
          <form
            onSubmit={handleSubmit}
            className="relative"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (step === 1 && formData.title.trim()) {
                  e.preventDefault();
                  handleNext();
                } else if (step === 2 && formData.diagramType && !isSubmitting) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                }
              }
            }}
          >
            {/* Header */}
            <div className="p-6 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold font-geist text-gray-900 dark:text-white">
                  Create New Diagram
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Progress Steps */}
              <div className="flex items-center space-x-4 mt-6">
                <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
              </div>
            </div>

            {error && (
              <div className="p-4 mx-6 mt-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {/* Step Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                  >
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      What would you like to name your diagram?
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="Enter a descriptive title..."
                      autoFocus
                    />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="space-y-4"
                  >
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      What type of diagram would you like to create?
                    </label>
                    <div className="max-h-64 overflow-y-auto md:max-h-full md:overflow-visible">
                      <div className="grid grid-cols-2 gap-4">
                        {diagramTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, diagramType: type.value })
                            }
                            className={`flex items-center space-x-4 p-4 rounded-xl border dark:border-gray-700 text-left transition-transform cursor-pointer transform hover:scale-105 ${
                              formData.diagramType === type.value
                                ? 'ring-2 ring-primary border-transparent bg-primary/5'
                                : 'hover:border-primary/30'
                            }`}
                          >
                            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-sm shadow-lg shadow-purple-500/10 border border-white/20 dark:border-white/10 p-2">
                              <Image
                                src={type.icon}
                                alt={`${type.label} icon`}
                                width={40}
                                height={40}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium block text-gray-900 dark:text-white">
                                {type.label}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Click to select
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t dark:border-gray-700 flex justify-between">
              <button
                type="button"
                onClick={step === 1 ? onClose : handleBack}
                className="px-4 py-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!formData.title.trim()}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title.trim() || !formData.diagramType}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Diagram'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 