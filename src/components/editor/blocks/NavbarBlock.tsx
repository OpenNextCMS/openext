'use client';

import { Trash2, Menu, X, MousePointer2 } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedLabel,
  setSelectedBlock,
  updateBlockContent,
} from '@/redux/canvasSlice';
import { useState } from 'react';
import { useBlockEvents, triggerBlockEvent } from '@/hooks/useBlockEvents';

interface NavbarContent {
  logo?: string;
  logoType?: 'text' | 'image';
  logoImage?: string;
  links?: { 
    label: string; 
    href: string;
    onClick?: string;
    onClickValue?: string;
  }[];
}

export const NavbarBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  const navbarData: NavbarContent = (() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : { logo: block.content || 'Brand', links: [] };
    } catch (e) {
      return { logo: 'Brand', links: [] };
    }
  })();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);
    if (!isEditing) return;
    dispatch(setSelectedLabel('Navbar Block'));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const handleLogoBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    const newLogo = e.currentTarget.textContent || '';
    const updatedContent = JSON.stringify({ ...navbarData, logo: newLogo });
    dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: updatedContent }));
  };

  const handleLinkClick = (e: React.MouseEvent, link: any) => {
    if (isEditing) return;
    
    if (link.onClick && link.onClick !== 'none') {
      e.preventDefault();
      e.stopPropagation();
      triggerBlockEvent({ onClick: link.onClick, onClickValue: link.onClickValue });
    }
  };

  const links = navbarData.links || [
    { label: 'Home', href: '#' },
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full mb-4 group"
      style={{
        cursor: isEditing ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      {isEditing && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '0',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 20,
          }}
        >
          <MousePointer2 size={10} />
          <span>Navbar</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '6px',
            zIndex: 20,
          }}
        >
          <button
            onClick={handleRemove}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <nav 
        className="flex items-center justify-between px-6 py-4 shadow-sm relative transition-all"
        style={{
          ...block.style,
          border: isHovered && isEditing ? '2px solid #3b82f6' : block.style?.border || 'none',
          backgroundColor: isHovered && block.hoverStyle?.backgroundColor 
            ? block.hoverStyle.backgroundColor 
            : block.style?.backgroundColor || '#ffffff',
        }}
      >
        <div className="flex items-center">
          {navbarData.logoType === 'image' ? (
            <img 
              src={navbarData.logoImage || 'https://via.placeholder.com/150x50?text=Logo'} 
              alt={navbarData.logo || 'Brand'} 
              style={{ maxHeight: '40px', objectFit: 'contain' }}
            />
          ) : (
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning={true}
              onBlur={handleLogoBlur}
              className="text-xl font-bold outline-none"
              style={{ color: block.style?.color || 'inherit' }}
            >
              {navbarData.logo || 'Brand'}
            </div>
          )}
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link, index) => (
            <a
              key={index}
              href={isEditing ? undefined : link.href}
              onClick={(e) => handleLinkClick(e, link)}
              className="text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: block.style?.color || 'inherit' }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 hover:opacity-80"
          style={{ color: block.style?.color || 'inherit' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileMenuOpen(!isMobileMenuOpen);
          }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="absolute top-full left-0 right-0 shadow-lg md:hidden z-50 border-t"
            style={{ 
              backgroundColor: block.style?.backgroundColor || '#ffffff',
              borderColor: block.style?.borderColor || '#e5e7eb'
            }}
          >
            <div className="flex flex-col p-4 space-y-4">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={isEditing ? undefined : link.href}
                  onClick={(e) => handleLinkClick(e, link)}
                  className="text-base font-medium hover:opacity-80"
                  style={{ color: block.style?.color || 'inherit' }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
