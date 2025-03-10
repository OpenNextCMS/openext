"use client"
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Page {
  _id: string;
  siteName: string;
  pageName: string;
  createdBy: string;
  isPublished: boolean;
  lastModified: string;
}

export default function PageList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter()

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  const fetchPages = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/pages/get`);
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();
      setPages(data.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 p-4 rounded-lg max-w-md text-center">
          <h3 className="text-red-600 font-medium text-lg mb-2">Error loading pages</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={fetchPages} variant="destructive">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6 mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page Management</h1>
        </div>
        <div className="mt-4 md:mt-0">
          <Button
            variant="default"
            className="mr-2"
            onClick={() => router.push("/Editor")}
          >
            <PlusSquare className="mr-2 h-5 w-5" />
            Add Page
          </Button>
        </div>
      </div>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>Page Name</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page._id}>
                <TableCell>{page.siteName}</TableCell>
                <TableCell>{page.pageName}</TableCell>
                <TableCell>{page.createdBy}</TableCell>
                <TableCell>
                  <span className={page.isPublished ? "text-green-600" : "text-red-600"}>
                    {page.isPublished ? 'Published' : 'Unpublished'}
                  </span>
                </TableCell>
                <TableCell>{new Date(page.lastModified).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="outline">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
            {pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                  No pages found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
