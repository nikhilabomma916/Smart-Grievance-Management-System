'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch('/api/knowledge');
        if (response.ok) {
          const result = await response.json();
          setDocs(result);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge docs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
      
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">Demo Knowledge Base</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          These documents are synthetic examples. Do not represent official government policy.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline">{doc.category}</Badge>
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 text-[10px]">
                  DEMO / SYNTHETIC
                </Badge>
              </div>
              <CardTitle className="text-lg">{doc.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                {doc.content}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {doc.tags?.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
