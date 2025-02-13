'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      diagramType: formData.get('diagramType'),
      description: formData.get('description'),
    };

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const project = await response.json();
      router.push(`/projects/${project._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Diagram Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Enter a title for your diagram"
        />
      </div>

      <div>
        <label htmlFor="diagramType" className="block text-sm font-medium mb-2">
          Diagram Type
        </label>
        <select
          id="diagramType"
          name="diagramType"
          required
          className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select a diagram type</option>
          <option value="erd">Entity Relationship Diagram (ERD)</option>
          <option value="flowchart">Flowchart</option>
          <option value="sequence">Sequence Diagram</option>
          <option value="class">Class Diagram</option>
          <option value="state">State Diagram</option>
          <option value="user_journey">User Journey Map</option>
          <option value="gantt">Gantt Chart</option>
          <option value="pie_chart">Pie Chart</option>
          <option value="quadrant">Quadrant Chart</option>
          <option value="requirement">Requirement Diagram</option>
          <option value="c4_diagram">C4 Architecture Diagram</option>
          <option value="mindmap">Mind Map</option>
          <option value="timeline">Timeline</option>
          <option value="sankey">Sankey Diagram</option>
          <option value="git">Git Graph</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Initial Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Describe what you want to create (AI will help you generate the diagram)"
        ></textarea>
      </div>

      <div className="flex justify-end space-x-4">
        <Link href="/projects" className="btn btn-secondary">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Diagram'}
        </button>
      </div>
    </form>
  );
} 