import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Shield, Lock, Globe, AlertTriangle, Search, 
  Fingerprint, ChevronDown, ChevronUp, Sparkles, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GlobalHeader } from '../components/GlobalHeader';

const iconMap: Record<string, React.ComponentType<any>> = {
  Lock,
  Shield,
  Globe,
  AlertTriangle,
  BookOpen,
  Fingerprint
};

interface KnowledgeContent {
  type: 'paragraph' | 'heading' | 'subsection' | 'list';
  text?: string;
  title?: string;
  items?: string[];
}

interface KnowledgeSection {
  id: string;
  title: string;
  lastUpdated?: string;
  content: KnowledgeContent[];
  related?: string[];
}

interface SectionMetadata {
  id: string;
  icon: string;
  color: string;
  category: string;
  order: number;
}

interface KnowledgeIndex {
  sections: SectionMetadata[];
  categories: Record<string, { en: string; mm: string }>;
}

export const VaultAcademy = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sections, setSections] = useState<KnowledgeSection[]>([]);
  const [metadata, setMetadata] = useState<SectionMetadata[]>([]);
  const [categories, setCategories] = useState<Record<string, { en: string; mm: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load knowledge base data
  useEffect(() => {
    const loadKnowledgeBase = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load index.json
        const indexResponse = await fetch('/assets/data/knowledge/index.json');
        if (!indexResponse.ok) throw new Error('Failed to load knowledge index');
        const indexData: KnowledgeIndex = await indexResponse.json();
        
        setMetadata(indexData.sections);
        setCategories(indexData.categories);

        // Load all knowledge sections
        const sectionPromises = indexData.sections.map(async (meta: SectionMetadata) => {
          try {
            const response = await fetch(`/assets/data/knowledge/${language}/${meta.id}.json`);
            if (!response.ok) throw new Error(`Failed to load ${meta.id}`);
            const data: KnowledgeSection = await response.json();
            return data;
          } catch (err) {
            console.error(`Error loading ${meta.id}:`, err);
            return null;
          }
        });

        const loadedSections = await Promise.all(sectionPromises);
        const validSections = loadedSections.filter((s): s is KnowledgeSection => s !== null);
        
        // Sort by order
        validSections.sort((a, b) => {
          const aMeta = indexData.sections.find((m: SectionMetadata) => m.id === a.id);
          const bMeta = indexData.sections.find((m: SectionMetadata) => m.id === b.id);
          return (aMeta?.order || 0) - (bMeta?.order || 0);
        });

        setSections(validSections);
      } catch (err) {
        console.error('Error loading knowledge base:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeBase();
  }, [language]);

  // Filter sections
  const filteredSections = useMemo(() => {
    let filtered = sections.map(section => {
      const meta = metadata.find(m => m.id === section.id);
      return { ...section, meta };
    });

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(section => {
        const searchLower = searchQuery.toLowerCase();
        return (
          section.title.toLowerCase().includes(searchLower) ||
          section.content.some((item: KnowledgeContent) => 
            item.text?.toLowerCase().includes(searchLower) ||
            item.items?.some((i: string) => i.toLowerCase().includes(searchLower))
          )
        );
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(section => 
        section.meta?.category === selectedCategory
      );
    }

    return filtered;
  }, [sections, metadata, searchQuery, selectedCategory]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderContent = (content: KnowledgeContent[]) => {
    return content.map((item, index) => {
      switch (item.type) {
        case 'paragraph':
          return (
            <p key={index} className="text-sm md:text-base text-white/70 leading-relaxed mb-4 font-mono">
              {item.text}
            </p>
          );
        
        case 'heading':
          return (
            <h3 key={index} className="text-lg md:text-xl font-black uppercase mt-6 mb-3 text-white/90">
              {item.text}
            </h3>
          );
        
        case 'subsection':
          return (
            <div key={index} className="mb-4 pl-4 border-l-2 border-white/10">
              <h4 className="text-base md:text-lg font-black uppercase mb-2 text-white/80">
                {item.title}
              </h4>
              <p className="text-sm md:text-base text-white/60 leading-relaxed font-mono">
                {item.text}
              </p>
            </div>
          );
        
        case 'list':
          return (
            <ul key={index} className="list-disc list-inside space-y-2 mb-4 text-sm md:text-base text-white/70 font-mono">
              {item.items?.map((listItem: string, i: number) => (
                <li key={i} className="leading-relaxed">{listItem}</li>
              ))}
            </ul>
          );
        
        default:
          return null;
      }
    });
  };

  const uniqueCategories = useMemo(() => {
    const cats = new Set(metadata.map(m => m.category));
    return Array.from(cats);
  }, [metadata]);

  const academyData = t('vault_academy') as any;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#00d4ff] mx-auto mb-4" />
          <p className="text-white/60 font-mono uppercase">
            {academyData?.loading || 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white/60 font-mono uppercase">
            {academyData?.error_loading || 'Error loading knowledge base'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-[#020408] relative"
    >
      <GlobalHeader onOpenAuth={() => {}} />
      
      <div className="max-w-6xl mx-auto pt-32 sm:pt-36 md:pt-40 lg:pt-44 px-4 pb-16">
        {/* Header Section */}
        <div className="mb-8">
          {/* Title and Badge */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
              {academyData?.title || 'VAULT_ACADEMY'}
            </h1>
            {/* Powered by Gemini 3 Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                {academyData?.powered_by || 'Powered by Gemini 3'}
              </span>
            </div>
          </div>
          
          {/* Subtitle */}
          <p className="text-sm md:text-base text-white/60 font-mono uppercase mb-4">
            {academyData?.subtitle || ''}
          </p>
          
          {/* Search Bar - Full Width on Mobile */}
          <div className="relative group w-full mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#00d4ff]/10 via-purple-500/5 to-[#00d4ff]/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />
            <div className={`relative glass-panel p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 ${
              isSearchFocused 
                ? 'border-[#00d4ff]/50 bg-black/70 shadow-[0_0_30px_rgba(0,212,255,0.3)]' 
                : 'border-white/10 bg-black/40 hover:border-white/20'
            }`}>
              <div className="flex items-center gap-3 md:gap-4">
                <Search className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-300 shrink-0 ${
                  isSearchFocused ? 'text-[#00d4ff]' : 'text-white/40'
                }`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={academyData?.search_placeholder || 'Search...'}
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 font-mono text-sm md:text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-white/40 hover:text-white/70 transition-colors shrink-0 p-1"
                    aria-label="Clear search"
                  >
                    <span className="text-xl font-bold">×</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* AI Assistance Message */}
          <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
            <p className="text-xs md:text-sm text-white/70 leading-relaxed font-mono">
              {academyData?.ai_assistance || ''}
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl border font-black uppercase text-xs transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]'
                : 'bg-black/40 border-white/10 text-white/60 hover:border-white/20'
            }`}
          >
            {academyData?.categories?.all || 'ALL'}
          </button>
          {uniqueCategories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl border font-black uppercase text-xs transition-all ${
                selectedCategory === cat
                  ? 'bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]'
                  : 'bg-black/40 border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              {categories[cat]?.[language] || cat}
            </button>
          ))}
        </div>

        {/* Knowledge Sections */}
        <div className="space-y-6">
          <AnimatePresence>
            {filteredSections.map((section, index) => {
              const Icon = iconMap[section.meta?.icon || 'BookOpen'] || BookOpen;
              const isExpanded = expandedSections.has(section.id);
              
              return (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel rounded-[2rem] md:rounded-[3rem] border border-white/10 bg-black/40 overflow-hidden hover:bg-black/60 transition-all"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-6 md:p-8 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-6 flex-1">
                      <div 
                        className="p-4 rounded-2xl border-2 shrink-0"
                        style={{ 
                          backgroundColor: `${section.meta?.color || '#00d4ff'}15`,
                          borderColor: `${section.meta?.color || '#00d4ff'}40`,
                          color: section.meta?.color || '#00d4ff'
                        }}
                      >
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h2 
                            className="text-2xl md:text-3xl font-black uppercase"
                            style={{ color: section.meta?.color || '#00d4ff' }}
                          >
                            {section.title}
                          </h2>
                          {section.meta?.category && (
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase text-white/40">
                              {categories[section.meta.category]?.[language] || section.meta.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50 font-mono">
                          {section.content.find((c: KnowledgeContent) => c.type === 'paragraph')?.text?.substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-white/40 shrink-0" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-white/40 shrink-0" />
                    )}
                  </button>

                  {/* Section Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 md:px-8 pb-6 md:pb-8">
                          {renderContent(section.content)}
                          
                          {/* Related Sections */}
                          {section.related && section.related.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                              <p className="text-xs font-black uppercase text-white/40 mb-3">
                                {academyData?.related_topics || 'RELATED_TOPICS'}:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {section.related.map((relatedId: string) => {
                                  const related = sections.find(s => s.id === relatedId);
                                  if (!related) return null;
                                  const relatedMeta = metadata.find(m => m.id === relatedId);
                                  return (
                                    <button
                                      key={relatedId}
                                      onClick={() => {
                                        setExpandedSections(new Set([relatedId]));
                                        setTimeout(() => {
                                          document.getElementById(relatedId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 100);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black uppercase text-white/60 hover:text-white hover:border-white/20 transition-colors"
                                    >
                                      {related.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>

        {/* No Results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/40 font-mono uppercase">
              {academyData?.no_results || 'No results found'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
