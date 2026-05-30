import { notFound } from 'next/navigation';
import { BlockData } from '@/types';
import PageClientWrapper from '@/components/PageClientWrapper';
import { Metadata } from 'next';
import renderFromJson from '@/components/ReusableComponents/RenderFromJson';
import { hasVerticalHeader } from '@/utils/headerLayout';
import { getPageDataForSlug } from '@/utils/getPageData';
import { Calendar, User, Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export const revalidate = 30;

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pageData = await getPageDataForSlug(resolvedParams?.slug || '');
  
  return {
    title: pageData?.metadata?.pageName || `Page: ${resolvedParams?.slug ?? 'Unknown'}`,
    description: pageData?.metadata?.description || '',
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  if (!resolvedParams) return notFound();

  const pageData = await getPageDataForSlug(resolvedParams.slug);
  if (!pageData) return notFound();

  const isBlog = pageData.metadata.pageType === 'blog';
  const sidebarHeader = hasVerticalHeader(pageData.headerBlocks);

  const renderBlogHero = () => {
    if (!isBlog) return null;
    const meta = pageData.metadata;
    
    return (
      <div className="w-full bg-background border-b">
        <div className="max-w-screen-xl mx-auto px-6 py-12 md:py-20 space-y-8">
          <div className="space-y-4">
            <Link href="/blogs" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline transition-all">
              <ChevronLeft className="h-4 w-4" />
              Back to Editorial
            </Link>
            
            <div className="flex flex-wrap items-center gap-4">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                {meta.category || 'Editorial'}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <Calendar className="h-3.5 w-3.5" />
                {meta.publishDate ? new Date(meta.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently Published'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight max-w-4xl">
              {meta.pageName}
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed font-medium">
              {meta.description}
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-8 border-t border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10">
                <User className="h-6 w-6 text-primary/70" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Article By</span>
                <span className="text-base font-bold tracking-tight">{meta.authorName || 'Editorial Team'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-bold text-muted-foreground/80 uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ~5 Min Read
              </span>
            </div>
          </div>

          {meta.featuredImage && (
            <div className="relative aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl mt-12">
              <img 
                src={meta.featuredImage} 
                alt={meta.pageName} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (sidebarHeader) {
    return (
      <PageClientWrapper>
        <div className="flex min-h-screen">
          <aside className="w-64 flex-shrink-0 sticky top-0 self-start h-screen overflow-y-auto">
            {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}
          </aside>
          <div className="flex-1 flex flex-col min-h-screen bg-white">
            {renderBlogHero()}
            <main className="flex-1">
              <div>
                {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
              </div>
            </main>
            {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </div>
      </PageClientWrapper>
    );
  }

  return (
    <PageClientWrapper>
      {pageData.headerBlocks.map((block) => renderFromJson(block as BlockData))}

      <div className="min-h-screen">
        {renderBlogHero()}
        <main>
          <div>
            {pageData.blocks.map((block) => renderFromJson(block as BlockData))}
          </div>
        </main>
        {pageData.footerBlocks.map((block) => renderFromJson(block as BlockData))}
      </div>
    </PageClientWrapper>
  );
}
