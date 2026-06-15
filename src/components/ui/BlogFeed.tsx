'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Clock,
  User,
  Calendar,
  Share2,
  ChevronRight,
  Filter,
  ArrowRight,
  Mail,
  Twitter,
  Facebook,
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BlogFeedProps {
  block: { content?: string | Record<string, unknown> };
  isEditing?: boolean;
}

type FeedPost = {
  _id?: string;
  pageName?: string;
  description?: string;
  category?: string;
  authorName?: string;
  featuredImage?: string;
  publishDate?: string;
  updatedAt?: string;
  slug?: string;
};

type CardSettings = {
  showAuthor: boolean;
  showDate: boolean;
  showReadingTime: boolean;
  showCategory: boolean;
  showExcerpt: boolean;
  showSocial: boolean;
  imageAspectRatio: string;
  borderRadius: string;
};

const CATEGORIES = [
  'All',
  'Technology',
  'Design',
  'Business',
  'Marketing',
  'Tutorials',
  'Case Studies'
];

export function BlogFeed({ block, isEditing = false }: BlogFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(!isEditing);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(0);

  // Block Content Parsing
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' ? JSON.parse(block.content) : block.content || {};
    } catch {
      return {};
    }
  }, [block.content]);

  // Settings from block content with defaults
  const layout = content.layout || 'grid'; 
  const postsPerPage = content.postsPerPage || 6;
  const showAuthor = content.showAuthor !== false;
  const showDate = content.showDate !== false;
  const showReadingTime = content.showReadingTime !== false;
  const showCategory = content.showCategory !== false;
  const showSearch = content.showSearch !== false;
  const showCategories = content.showCategories !== false;
  const showExcerpt = content.showExcerpt !== false;
  const showSocial = content.showSocial !== false;
  const imageAspectRatio = content.imageAspectRatio || '16/9';
  const cardsPerRow = content.cardsPerRow || 3;
  const borderRadius = content.borderRadius || 'rounded-lg';
  const paginationType = content.paginationType || 'pagination';

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    if (isEditing) {
      const mockPosts = Array(8).fill(0).map((_, i) => ({
        _id: `mock-${i}`,
        pageName: [
          'The Future of Minimalist Web Design in 2026',
          'How AI is Revolutionizing Editorial Workflows',
          '10 Tips for Building a Scalable SaaS Platform',
          'Case Study: Rebranding a Fortune 500 Tech Giant',
          'Why Content-First Design Still Rules the Web',
          'Understanding Modern CSS Layout Patterns',
          'The Rise of Zero-Config CMS Architectures',
          'Digital Marketing Strategies for the Next Decade'
        ][i] || `Premium Blog Post Title ${i + 1}`,
        description: 'Discover the latest trends in modern web development and editorial design. This is a short excerpt to showcase the blog feed layout with polished typography and spacing.',
        category: CATEGORIES[Math.floor(Math.random() * (CATEGORIES.length - 1)) + 1],
        authorName: ['Alex River', 'Sam Chen', 'Jordan Smith', 'Maria Garcia'][i % 4],
        featuredImage: `https://images.unsplash.com/photo-${1500000000000 + i * 2000}?auto=format&fit=crop&w=1200&q=80`,
        publishDate: new Date(Date.now() - i * 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
        slug: `post-${i}`
      }));
      setPosts(mockPosts);
      setLoading(false);
      setVisibleCount(postsPerPage);
      return;
    }

    const fetchPosts = async () => {
      try {
        // Try public endpoint first
        let response = await fetch(`${backendUrl}/api/public/blogs`);
        
        // Fallback to general pages endpoint if public one fails
        if (!response.ok) {
          response = await fetch(`${backendUrl}/api/pages/get-pages`);
        }

        if (response.ok) {
          const data = await response.json();
          const blogPosts = (data.pages || []).filter(
            (p: FeedPost & { pageType?: string; isPublished?: boolean }) =>
              p.pageType === 'blog' && p.isPublished
          );
          setPosts(blogPosts);
          setVisibleCount(postsPerPage);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [isEditing, backendUrl, postsPerPage]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.pageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [posts, searchTerm, activeCategory]);

  const paginatedPosts = useMemo(() => {
    if (paginationType === 'infinite-scroll') {
      return filteredPosts.slice(0, visibleCount);
    }
    const start = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(start, start + postsPerPage);
  }, [filteredPosts, currentPage, postsPerPage, paginationType, visibleCount]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const hasMore = visibleCount < filteredPosts.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + postsPerPage);
  };

  if (loading) {
    return <BlogFeedSkeleton layout={layout} cardsPerRow={cardsPerRow} />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16 font-sans antialiased">
      {/* Navigation Header */}
      <div className="mb-16 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b pb-8 sticky top-0 bg-background/80 backdrop-blur-xl z-20 pt-4">
          {showCategories && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 md:pb-0 scroll-smooth">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {setActiveCategory(cat); setCurrentPage(1); setVisibleCount(postsPerPage);}}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap relative",
                    activeCategory === cat 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                  {activeCategory === cat && (
                    <motion.div 
                      layoutId="category-active"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          
          {showSearch && (
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search articles..."
                className="pl-11 h-12 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-full transition-all"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1); setVisibleCount(postsPerPage);}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Blog Feed Grid */}
      <motion.div 
        layout
        className={cn(
          "gap-x-8 gap-y-12 grid",
          layout === 'grid' && {
            'grid-cols-1': true,
            'md:grid-cols-2': cardsPerRow >= 2,
            'lg:grid-cols-3': cardsPerRow >= 3,
            'xl:grid-cols-4': cardsPerRow >= 4,
          },
          layout === 'minimal' && "grid-cols-1",
          layout === 'side-by-side' && "grid-cols-1",
          layout === 'editorial' && "grid-cols-1"
        )}
      >
        <AnimatePresence mode="popLayout">
          {paginatedPosts.length > 0 ? (
            paginatedPosts.map((post, index) => (
              <motion.div
                key={post._id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: index % postsPerPage * 0.1 }}
                layout
              >
                <BlogCard 
                  post={post}
                  layout={layout}
                  settings={{
                    showAuthor,
                    showDate,
                    showReadingTime,
                    showCategory,
                    showExcerpt,
                    showSocial,
                    imageAspectRatio,
                    borderRadius
                  }}
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-32 text-center space-y-6"
            >
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto text-muted-foreground/50">
                <Filter className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">No articles match your criteria</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                  Try adjusting your filters or search terms to find what you&apos;re looking for.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="lg"
                className="rounded-full px-8"
                onClick={() => {setSearchTerm(''); setActiveCategory('All');}}
              >
                Clear all filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pagination / Infinite Scroll */}
      <div className="mt-24 border-t pt-12">
        {totalPages > 1 && paginationType === 'pagination' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-sm text-muted-foreground font-medium">
              Showing <span className="text-foreground">{paginatedPosts.length}</span> of <span className="text-foreground">{filteredPosts.length}</span> articles
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="rounded-full h-11 px-6 font-semibold"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Show limited page numbers for better UX
                  if (totalPages > 7) {
                    if (i + 1 !== 1 && i + 1 !== totalPages && Math.abs(currentPage - (i + 1)) > 1) {
                      if (Math.abs(currentPage - (i + 1)) === 2) return <span key={i} className="px-1 text-muted-foreground">...</span>;
                      return null;
                    }
                  }
                  return (
                    <Button
                      key={i}
                      variant={currentPage === i + 1 ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        "w-11 h-11 rounded-full font-bold transition-all",
                        currentPage === i + 1 ? "shadow-lg shadow-primary/20 scale-110" : "text-muted-foreground"
                      )}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {i + 1}
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                className="rounded-full h-11 px-6 font-bold group border-2"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}

        {paginationType === 'infinite-scroll' && hasMore && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-sm text-muted-foreground font-medium">
              You&apos;ve viewed <span className="text-foreground">{visibleCount}</span> of <span className="text-foreground">{filteredPosts.length}</span> articles
            </div>
            <div className="w-full max-w-xs h-1 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(visibleCount / filteredPosts.length) * 100}%` }}
              />
            </div>
            <Button 
              variant="outline" 
              size="lg"
              className="rounded-full px-12 h-14 font-bold border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-xl hover:shadow-primary/30 active:scale-95"
              onClick={loadMore}
            >
              Explore More Articles
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BlogCard({ post, layout, settings }: { post: FeedPost; layout: string; settings: CardSettings }) {
  const isEditorial = layout === 'editorial';
  const isSideBySide = layout === 'side-by-side';
  const isMinimal = layout === 'minimal';
  
  // Calculate reading time
  const readingTime = useMemo(() => {
    const words = (post.description || '').split(/\s+/).length + (post.pageName || '').split(/\s+/).length;
    const minutes = Math.ceil(words / 200) + 1; // Base 1 min + calc
    return minutes > 1 ? `${minutes} min read` : '1 min read';
  }, [post.description, post.pageName]);

  const CardWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
      "group bg-card transition-all duration-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden h-full flex flex-col",
      settings.borderRadius,
      className
    )}>
      {children}
    </div>
  );

  if (isMinimal) {
    return (
      <motion.div 
        whileHover={{ x: 8 }}
        className="py-10 border-b border-border/60 last:border-0 group cursor-pointer"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              {settings.showCategory && (
                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded">
                  {post.category || 'General'}
                </span>
              )}
              {settings.showDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.publishDate || post.updatedAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold group-hover:text-primary transition-colors duration-500 leading-tight tracking-tight">
              {post.pageName}
            </h3>
            {settings.showExcerpt && (
              <p className="text-muted-foreground line-clamp-2 text-base max-w-3xl leading-relaxed">
                {post.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground/80 font-semibold whitespace-nowrap">
            {settings.showReadingTime && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{readingTime}</span>}
            <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <CardWrapper className={cn(
      isSideBySide ? "md:flex-row min-h-[320px]" : "flex-col"
    )}>
      {/* Featured Image */}
      <div className={cn(
        "relative overflow-hidden shrink-0 group/img",
        isSideBySide ? "w-full md:w-[45%] h-full min-h-[320px]" : "w-full",
        !isSideBySide && `aspect-[${settings.imageAspectRatio.replace('/', '\\/')}]`
      )}>
        <motion.img 
          src={post.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80'} 
          alt={post.pageName}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
        
        {settings.showCategory && (
          <Badge className="absolute top-6 left-6 bg-white/95 text-black hover:bg-white backdrop-blur-md border-none shadow-xl uppercase tracking-[0.2em] text-[10px] py-1.5 px-4 font-bold rounded-sm">
            {post.category || 'General'}
          </Badge>
        )}
      </div>

      {/* Content Area */}
      <div className={cn(
        "p-8 md:p-10 flex flex-col flex-1",
        isEditorial ? "text-center items-center justify-center py-16 px-12" : "text-left"
      )}>
        <div className={cn(
          "flex items-center gap-5 text-[10px] font-bold text-muted-foreground mb-6 uppercase tracking-[0.15em]",
          isEditorial && "justify-center"
        )}>
          {settings.showDate && (
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.publishDate || post.updatedAt || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {settings.showReadingTime && (
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {readingTime}
            </span>
          )}
        </div>

        <h3 className={cn(
          "font-black leading-[1.15] group-hover:text-primary transition-colors duration-500 tracking-tight",
          isEditorial ? "text-4xl md:text-5xl lg:text-6xl mb-8" : "text-2xl md:text-3xl mb-4"
        )}>
          {post.pageName}
        </h3>

        {settings.showExcerpt && (
          <p className={cn(
            "text-muted-foreground mb-8 leading-relaxed font-medium",
            isEditorial ? "text-xl max-w-3xl opacity-80" : "text-base line-clamp-3"
          )}>
            {post.description}
          </p>
        )}

        <div className={cn(
          "mt-auto pt-8 border-t border-border/50 flex items-center justify-between w-full",
          isEditorial && "max-w-2xl border-t-2"
        )}>
          {settings.showAuthor && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center overflow-hidden border-2 border-primary/10 transition-transform group-hover:scale-110 duration-500">
                <User className="h-5 w-5 text-primary/70" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Written by</span>
                <span className="text-sm font-bold tracking-tight">{post.authorName || 'Editorial Team'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 md:gap-4">
            {settings.showSocial && <SocialTooltip slug={post.slug} title={post.pageName} />}
            <Button variant="ghost" size="lg" className="h-12 px-6 rounded-full font-bold group/btn hover:bg-primary hover:text-primary-foreground transition-all duration-500 shadow-sm" asChild>
              <a href={`/${post.slug}`}>
                Read Article
                <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover/btn:translate-x-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

function SocialTooltip({ slug, title }: { slug?: string, title?: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-300">
            <Share2 className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3 bg-background border shadow-2xl rounded-2xl flex gap-3 z-[100]">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title || '')}&url=${encodeURIComponent(shareUrl)}`, '_blank')}
                  className="w-10 h-10 rounded-full hover:bg-sky-50 text-sky-500 flex items-center justify-center transition-colors"
                >
                  <Twitter className="h-5 w-5 fill-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Twitter / X</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')}
                  className="w-10 h-10 rounded-full hover:bg-blue-50 text-blue-600 flex items-center justify-center transition-colors"
                >
                  <Facebook className="h-5 w-5 fill-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Facebook</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => window.open(`mailto:?subject=${encodeURIComponent(title || '')}&body=Check this out: ${shareUrl}`, '_blank')}
                  className="w-10 h-10 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors"
                >
                  <Mail className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Email</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={copyLink}
                  className="w-10 h-10 rounded-full hover:bg-muted text-foreground flex items-center justify-center transition-colors"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <LinkIcon className="h-5 w-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Copy Link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BlogFeedSkeleton({ layout, cardsPerRow }: { layout: string, cardsPerRow: number }) {
  const count = layout === 'editorial' ? 2 : 6;
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16 space-y-16">
      <div className="flex justify-between items-center border-b pb-8">
        <div className="flex gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-md" />)}
        </div>
        <Skeleton className="h-12 w-80 rounded-full" />
      </div>
      
      <div className={cn(
        "gap-8 grid",
        layout === 'grid' && {
          'grid-cols-1': true,
          'md:grid-cols-2': cardsPerRow >= 2,
          'lg:grid-cols-3': cardsPerRow >= 3,
        },
        layout !== 'grid' && "grid-cols-1"
      )}>
        {Array(count).fill(0).map((_, i) => (
          <div key={i} className={cn(
            "flex flex-col gap-6",
            layout === 'side-by-side' && "md:flex-row h-80"
          )}>
            <Skeleton className={cn(
              "aspect-[16/9] rounded-2xl w-full",
              layout === 'side-by-side' && "md:w-[45%] h-full"
            )} />
            <div className="flex-1 space-y-6 py-4 px-2">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
